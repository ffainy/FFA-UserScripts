/**
 * update-changelog.js
 *
 * 增量更新脚本：每次 push 后，扫描本次推送涉及的提交，
 * 检测目标脚本的 @version 变动，并将新版本的 changelog 条目
 * 插入到 CHANGELOG.md 顶部。
 *
 * 运行环境：GitHub Actions（由 changelog.yml 调用）
 * 依赖环境变量：
 *   TARGET_SCRIPTS  — 空格或逗号分隔的脚本文件名列表
 *   BEFORE_SHA      — push 前的 commit SHA（由 yml 注入）
 *   AFTER_SHA       — push 后的 commit SHA（由 yml 注入）
 *   GITHUB_OUTPUT   — GitHub Actions 输出文件路径（Actions 自动注入）
 */

'use strict';

const { execSync } = require('child_process');
const fs           = require('fs');

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const CHANGELOG_FILE = 'CHANGELOG.md';

/** CHANGELOG 文件头部（两个脚本共用同一份，保证格式一致）*/
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

/**
 * 正文分隔符，用于在读取旧内容时精准定位正文起始位置。
 * rebuild 和 update 两个脚本共用，必须保持一致。
 */
const BODY_SEPARATOR = '<!-- changelog-body-start -->\n';

/**
 * Conventional Commits 类型 → changelog 分类。
 * 只列出需要记录的类型；未出现在此映射中的类型一律忽略。
 */
const TYPE_TO_CATEGORY = {
    feat:     'feat',
    fix:      'fix',
    refactor: 'improvements',
    perf:     'improvements',
};

/** changelog 分类 → 展示标题（Object 保证插入顺序即输出顺序）*/
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
    process.exit(1);
}

const SCRIPTS   = envScripts.split(/[\s,]+/).filter(Boolean);
const beforeSha = process.env.BEFORE_SHA;
const afterSha  = process.env.AFTER_SHA;

if (!beforeSha || !afterSha) {
    console.error('错误：BEFORE_SHA 或 AFTER_SHA 未设置。');
    process.exit(1);
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 读取指定 git 对象路径下的 @version 字段。
 * 调用方传入完整引用，如 "abc123:apple.js" 或 "abc123^:apple.js"。
 * 使用 "^" 语法前，调用方应先通过 hasParent() 确认父节点存在。
 *
 * @param {string} gitRef — 完整的 git 对象引用
 * @returns {string|null}
 */
function readVersion(gitRef) {
    try {
        const content = execSync(
            `git show "${gitRef}"`,
            { stdio: ['pipe', 'pipe', 'ignore'] }
        ).toString();

        const match = content.match(/@version\s+([^\s\n\r]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * 判断某个 commit 是否拥有父节点（即不是仓库的初始 commit）。
 * 在读取"变更前版本"之前，用此函数做安全检查，避免 sha^ 语法报错。
 *
 * @param {string} sha
 * @returns {boolean}
 */
function hasParent(sha) {
    try {
        execSync(
            `git rev-parse --verify "${sha}^"`,
            { stdio: 'ignore' }
        );
        return true;
    } catch {
        return false;
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
 *
 * @param {{ subject: string, body: string, shortHash: string, fullHash: string }} entry
 * @param {string} file
 * @param {{ includeIgnoredType?: boolean }} [opts]
 * @returns {{ category: string, message: string } | null}
 *   可写入 changelog 时返回对象，否则返回 null。
 */
function parseCommitLine(entry, file, opts = {}) {
    if (!entry || !entry.subject || !entry.shortHash) return null;

    const { subject, body, shortHash } = entry;
    const { includeIgnoredType = false } = opts;
    const fullText = `${subject} ${body ?? ''}`.toLowerCase();

    // 提取提交类型
    const typeMatch = subject.match(/^(\w+)/);
    const rawType   = typeMatch ? typeMatch[1].toLowerCase() : '';

    // 过滤不需要记录的类型
    if (IGNORED_TYPES.has(rawType) && !includeIgnoredType) return null;

    // 过滤 changelog bot 自身产生的提交，防止自引用
    if (subject.toLowerCase().includes('update changelog')) return null;

    // 判断是否为 breaking change
    const isBreaking = (
        subject.includes('!:') ||
        fullText.includes('breaking change')
    );

    // 匹配 Conventional Commits 格式：type(scope)?: description
    const ccMatch = subject.match(
        /^(\w+)(?:\((.+?)\))?\s*!?\s*:\s*(.+)$/
    );
    if (!ccMatch) return null;

    const [, , rawScope, msg] = ccMatch;
    const scope             = normalizeScope(rawScope, file);
    const scopePrefix      = scope ? `**[${scope}]**: ` : '';
    const message          = `- ${scopePrefix}${msg} (${shortHash})`;

    // 确定分类（breaking 优先于类型映射）
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
 * 将分类后的提交条目渲染为一个 changelog section 字符串。
 *
 * @param {string} file    — 脚本文件名
 * @param {string} version — 版本号
 * @param {string} date    — 日期（YYYY-MM-DD）
 * @param {Object} groups  — 各分类的提交条目数组
 * @returns {string | null} — 有内容则返回字符串，否则 null
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
 * 读取 CHANGELOG.md 中分隔符之后的正文内容。
 * 找不到分隔符时返回空串（可能是旧格式文件），避免内容重复叠加。
 *
 * @returns {string}
 */
function readOldBody() {
    if (!fs.existsSync(CHANGELOG_FILE)) return '';

    const content  = fs.readFileSync(CHANGELOG_FILE, 'utf8');
    const sepIndex = content.indexOf(BODY_SEPARATOR);

    // 找不到分隔符说明是旧格式文件，返回空串，避免重复叠加
    if (sepIndex === -1) return '';

    return content.slice(sepIndex + BODY_SEPARATOR.length);
}

// ─── 主逻辑 ───────────────────────────────────────────────────────────────────

function update() {

    // 获取本次 push 涉及的所有提交，从旧到新排列
    const rawCommits = execSync(
        `git rev-list --reverse ${beforeSha}..${afterSha}`
    ).toString().trim();

    if (!rawCommits) {
        console.log('本次 push 无新提交，跳过。');
        process.exit(0);
    }

    const commits = rawCommits.split('\n').filter(Boolean);

    /**
     * 记录每个脚本"最近一次版本升级"所在的 commit。
     * 用于精确界定下一次版本升级需要回溯的提交范围。
     * 初始值为 beforeSha（本次 push 的起点）。
     */
    const lastBumpPoint = {};
    for (const file of SCRIPTS) {
        lastBumpPoint[file] = beforeSha;
    }

    let allNewSections   = '';
    const updatedScripts = [];

    for (const commit of commits) {
        for (const file of SCRIPTS) {

            // 跳过工作区中不存在的文件
            if (!fs.existsSync(file)) continue;

            // 初始 commit 无父节点，跳过"变更前版本"读取
            const oldVer = hasParent(commit)
                ? readVersion(`${commit}^:${file}`)
                : null;

            const newVer = readVersion(`${commit}:${file}`);

            // 版本号未变动则跳过
            if (!newVer || oldVer === newVer) continue;

            // 收集从上次版本升级点到当前 commit 之间的所有提交日志
            const range     = `${lastBumpPoint[file]}..${commit}`;
            const logOutput = execSync(
                `git log ${range} --pretty=format:%s%x1f%b%x1f%h%x1f%H%x1e --no-merges -- "${file}"`
            ).toString();

            const logs = parseGitLogOutput(logOutput);

            // 初始化各分类的条目桶
            const groups = {
                breaking:     [],
                feat:         [],
                fix:          [],
                improvements: [],
            };

            for (const entry of logs) {
                const isBumpCommit = (
                    entry.fullHash.toLowerCase() === commit.toLowerCase()
                );
                const parsed = parseCommitLine(entry, file, {
                    includeIgnoredType: isBumpCommit,
                });
                if (parsed) {
                    groups[parsed.category].push(parsed.message);
                }
            }

            // 生成 section 并前置插入（新版本在最上方）
            const date    = new Date().toISOString().split('T')[0];
            const section = renderSection(file, newVer, date, groups);

            if (section) {
                allNewSections = section + allNewSections;

                if (!updatedScripts.includes(file)) {
                    updatedScripts.push(file);
                }
            }

            // 更新该脚本的版本升级锚点
            lastBumpPoint[file] = commit;
        }
    }

    // ── 无任何版本变动：静默退出，不写文件 ───────────────────────────────────
    if (!allNewSections) {
        console.log('未检测到版本变动，CHANGELOG 无需更新。');
        // 不写入 GITHUB_OUTPUT，yml 侧通过 updated_list 是否为空来决定是否提交
        process.exit(0);
    }

    // ── 写入文件 ──────────────────────────────────────────────────────────────
    const oldBody = readOldBody();
    fs.writeFileSync(
        CHANGELOG_FILE,
        HEADER + BODY_SEPARATOR + allNewSections + oldBody
    );

    // ── 输出脚本列表供 GitHub Actions 后续步骤使用 ───────────────────────────
    if (process.env.GITHUB_OUTPUT) {
        const listStr = updatedScripts.join(' & ');
        fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            `updated_list=${listStr}\n`
        );
    }

    console.log(`CHANGELOG 更新成功：${updatedScripts.join(', ')}`);
}

update();
