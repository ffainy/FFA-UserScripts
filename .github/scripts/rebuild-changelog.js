/**
 * rebuild-changelog.js
 *
 * 全量历史重建脚本：从仓库完整 git 历史中回溯所有版本，
 * 按时间倒序重新生成 CHANGELOG.md，覆盖现有文件。
 *
 * 适用场景：
 *   - 首次初始化 CHANGELOG
 *   - 手动修复 CHANGELOG 数据
 *   - 重大版本整理后重建
 *
 * 本地运行示例（PowerShell）：
 *   $env:TARGET_SCRIPTS="FFA-Omnibar.js FFA-Linkify.js FFA-NoRestrict.js"; node .github/scripts/rebuild-changelog.js
 *
 * 本地运行示例（bash）：
 *   TARGET_SCRIPTS="FFA-Omnibar.js FFA-Linkify.js FFA-NoRestrict.js" node .github/scripts/rebuild-changelog.js
 */

'use strict';

const { execSync } = require('child_process');
const fs           = require('fs');

// ─── 常量（与 update-changelog.js 保持完全一致）────────────────────────────

const CHANGELOG_FILE = 'CHANGELOG.md';

/** CHANGELOG 文件头部（与 update-changelog.js 共用同一份，保证格式一致）*/
const HEADER = [
    '# Changelog',
    '',
    'All notable changes to this project will be documented in this file.',
    '',
    'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),',
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
    '',
    '',
].join('\n');

const BODY_SEPARATOR = '<!-- changelog-body-start -->\n';

/** Conventional Commits 类型 → changelog 分类 */
const TYPE_TO_CATEGORY = {
    feat:     'feat',
    fix:      'fix',
    refactor: 'improvements',
    perf:     'improvements',
};

/** changelog 分类 → 展示标题（插入顺序即输出顺序）*/
const CATEGORY_TITLES = {
    breaking:     '### BREAKING CHANGES',
    feat:         '### Added',
    fix:          '### Fixed',
    improvements: '### Improvements',
};

/** 写入 changelog 时需要忽略的提交类型 */
const IGNORED_TYPES = new Set([
    'ci', 'docs', 'chore', 'test', 'build', 'style',
]);

// ─── 环境变量读取与校验 ───────────────────────────────────────────────────────

const envScripts = process.env.TARGET_SCRIPTS;
if (!envScripts) {
    console.error('错误：未在环境变量中找到 TARGET_SCRIPTS。');
    console.error('请设置环境变量后重试，例如：');
    console.error('  TARGET_SCRIPTS="apple.js banana.js" node rebuild-changelog.js');
    process.exit(1);
}

const SCRIPTS = envScripts.split(/[\s,]+/).filter(Boolean);
console.log(`目标脚本：${SCRIPTS.join(', ')}`);

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 读取指定 commit 下某文件的 @version 字段。
 *
 * @param {string} sha  — commit SHA
 * @param {string} file — 文件路径
 * @returns {string|null}
 */
function readVersion(sha, file) {
    try {
        const content = execSync(
            `git show "${sha}:${file}"`,
            { stdio: ['pipe', 'pipe', 'ignore'] }
        ).toString();

        const match = content.match(/@version\s+([^\s\n\r]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * 解析 git log 原始输出（记录分隔符 \x1e，字段分隔符 \x1f）。
 *
 * @param {string} raw
 * @returns {Array<{ subject: string, body: string, hash: string }>}
 */
function parseGitLogOutput(raw) {
    if (!raw) return [];

    return raw
        .split('\x1e')
        .map(r => r.trim())
        .filter(Boolean)
        .map((record) => {
            const parts = record.split('\x1f');
            if (parts.length < 4) return null;

            const [subject, body, shortHash, fullHash] = parts;
            return {
                subject: (subject ?? '').trim(),
                body:    (body ?? '').trim(),
                shortHash: (shortHash ?? '').trim(),
                fullHash:  (fullHash ?? '').trim(),
            };
        })
        .filter(Boolean);
}

/**
 * 归一化 scope。若 scope 以当前脚本名作为前缀（如 omnibar/search），
 * 则去掉冗余前缀，仅保留子作用域（search）。
 *
 * @param {string} scope
 * @param {string} file
 * @returns {string}
 */
function normalizeScope(scope, file) {
    if (!scope) return '';

    const base = file
        .replace(/^FFA-/i, '')
        .replace(/\.js$/i, '')
        .toLowerCase();

    const prefix = `${base}/`;
    if (scope.toLowerCase() === base) {
        return '';
    }
    if (scope.toLowerCase().startsWith(prefix)) {
        const normalized = scope.slice(prefix.length).trim();
        return normalized || scope;
    }

    return scope;
}

/**
 * 解析单条 git log 记录，返回 changelog 条目。
 * 与 update-changelog.js 中逻辑保持一致。
 *
 * @param {{ subject: string, body: string, shortHash: string, fullHash: string }} entry
 * @param {string} file
 * @param {{ includeIgnoredType?: boolean }} [opts]
 * @returns {{ category: string, message: string } | null}
 */
function parseCommitLine(entry, file, opts = {}) {
    if (!entry || !entry.subject || !entry.shortHash) return null;

    const { subject, body, shortHash } = entry;
    const { includeIgnoredType = false } = opts;
    const fullText = `${subject} ${body ?? ''}`.toLowerCase();

    const typeMatch = subject.match(/^(\w+)/);
    const rawType   = typeMatch ? typeMatch[1].toLowerCase() : '';

    if (IGNORED_TYPES.has(rawType) && !includeIgnoredType) return null;
    if (subject.toLowerCase().includes('update changelog')) return null;

    const isBreaking = (
        subject.includes('!:') ||
        fullText.includes('breaking change')
    );

    const ccMatch = subject.match(
        /^(\w+)(?:\((.+?)\))?\s*!?\s*:\s*(.+)$/
    );
    if (!ccMatch) return null;

    const [, , rawScope, msg] = ccMatch;
    const scope             = normalizeScope(rawScope, file);
    const scopePrefix      = scope ? `**[${scope}]**: ` : '';
    const message          = `- ${scopePrefix}${msg} (${shortHash})`;

    let category = null;
    if (isBreaking) {
        category = 'breaking';
    } else if (rawType in TYPE_TO_CATEGORY) {
        category = TYPE_TO_CATEGORY[rawType];
    }

    if (!category && includeIgnoredType) {
        category = 'improvements';
    }
    if (!category) return null;
    return { category, message };
}

/**
 * 将分类条目渲染为 changelog section 字符串。
 *
 * @param {string} file    — 脚本文件名
 * @param {string} version — 版本号
 * @param {string} date    — 日期（YYYY-MM-DD）
 * @param {Object} groups  — 各分类的提交条目数组
 * @returns {string | null}
 */
function renderSection(file, version, date, groups) {
    let body = '';

    for (const [key, title] of Object.entries(CATEGORY_TITLES)) {
        if (groups[key].length === 0) continue;
        body += `${title}\n${groups[key].join('\n')}\n\n`;
    }

    if (!body) return null;

    return `## ${file} [${version}] - ${date}\n\n${body}\n`;
}

/**
 * 从 git 历史中提取某文件的所有版本区块。
 *
 * 算法：
 *   1. 获取所有修改过该文件的 commit（从旧到新）
 *   2. 遍历时按版本号分组，每个分组记录该版本包含的所有 commit
 *   3. 分组的"结束 commit"取该分组中最新的一个，用于取版本发布日期
 *
 * @param {string} file — 文件路径
 * @returns {Array<{ ver: string, endSha: string, commits: string[] }>}
 */
function extractVersionBlocks(file) {
    // 获取所有涉及该文件的 commit，从旧到新
    const rawLog = execSync(
        `git log --pretty=format:%H -- "${file}"`
    ).toString().trim();

    if (!rawLog) return [];

    // git log 默认从新到旧，reverse() 后变为从旧到新
    const commits = rawLog.split('\n').reverse();

    const blocks    = [];  // 最终结果
    let currentVer  = null;
    let currentBlock = null;

    for (const sha of commits) {
        const ver = readVersion(sha, file);
        if (!ver) continue;

        if (ver !== currentVer) {
            // 发现新版本号，开启新区块
            currentVer   = ver;
            currentBlock = { ver, endSha: sha, commits: [] };
            blocks.push(currentBlock);
        }

        // 将当前 commit 归入当前版本区块
        currentBlock.commits.push(sha);

        // 持续更新 endSha，确保最终指向该版本的最后一个 commit
        currentBlock.endSha = sha;
    }

    return blocks;
}

// ─── 主逻辑 ───────────────────────────────────────────────────────────────────

function rebuild() {

    // 备份现有文件（仅在本地运行时有实际意义）
    if (fs.existsSync(CHANGELOG_FILE)) {
        fs.copyFileSync(CHANGELOG_FILE, `${CHANGELOG_FILE}.bak`);
        console.log(`已备份现有文件至 ${CHANGELOG_FILE}.bak`);
    }

    console.log('开始全量历史回溯...\n');

    /**
     * allSections 收集所有文件的所有版本 section。
     * 因为每个 section 都前置插入，最终结果自然按时间倒序排列。
     */
    let allSections = '';

    for (const file of SCRIPTS) {

        // 跳过工作区中不存在的文件
        if (!fs.existsSync(file)) {
            console.warn(`警告：文件 "${file}" 不存在，跳过。`);
            continue;
        }

        console.log(`>>> 提取历史：${file}`);

        const blocks = extractVersionBlocks(file);

        if (blocks.length === 0) {
            console.log(`    未找到任何带版本号的提交，跳过。`);
            continue;
        }

        for (const block of blocks) {

            // 初始化各分类的条目桶
            const groups = {
                breaking:     [],
                feat:         [],
                fix:          [],
                improvements: [],
            };

            // 解析该版本区块内的所有提交
            for (const sha of block.commits) {
                const rawLog = execSync(
                    `git log -1 --pretty=format:%s%x1f%b%x1f%h%x1f%H%x1e ${sha}`
                ).toString();

                const [entry] = parseGitLogOutput(rawLog);
                const isBumpCommit = (sha === block.commits[0]);
                const parsed  = parseCommitLine(entry, file, {
                    includeIgnoredType: isBumpCommit,
                });
                if (parsed) {
                    groups[parsed.category].push(parsed.message);
                }
            }

            // 取版本最后一个 commit 的日期作为版本发布日期
            const date = execSync(
                `git log -1 --format=%as ${block.endSha}`
            ).toString().trim();

            const section = renderSection(file, block.ver, date, groups);

            if (section) {
                // 前置插入，保证最新版本在最上面
                allSections = section + allSections;
            }
        }

        console.log(`    完成，共识别 ${blocks.length} 个版本。`);
    }

    // ── 写入文件 ──────────────────────────────────────────────────────────────
    fs.writeFileSync(
        CHANGELOG_FILE,
        HEADER + BODY_SEPARATOR + allSections
    );

    console.log('\n[完成] CHANGELOG.md 全量重建成功。');
}

rebuild();
