#!/usr/bin/env node
/**
 * backfill-changelog.js
 * 一次性回填历史版本到 CHANGELOG.md
 * 用法: node .github/scripts/backfill-changelog.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.resolve('CHANGELOG.md');
const TARGET_FILE = 'FFA-Omnibar.js'; // 如有多个脚本，改成数组后循环

// ── 1. 获取该文件所有 commit（从旧到新） ──────────────────────────────────
const rawLog = execSync(
  `git log --reverse --pretty=format:"%H|%ad|%s" --date=short -- ${TARGET_FILE}`,
  { encoding: 'utf8', shell: true }
).toString().trim();

if (!rawLog) {
  console.error('没有找到该文件的 commit 历史');
  process.exit(1);
}

const commits = rawLog.split('\n').map(line => {
  const [hash, date, ...msgParts] = line.split('|');
  return { hash, date, msg: msgParts.join('|') };
});

// ── 2. 找出每个 commit 对应的 @version ───────────────────────────────────
function getVersionAtCommit(hash, file) {
  try {
    const content = execSync(`git show "${hash}:${file}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'], // 忽略 stderr，避免 Windows 报错污染
      shell: true,
    });
    const match = content.match(/\/\/ @version\s+(\S+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// 构建每个 commit 的版本信息
const commitInfos = commits.map(c => ({
  ...c,
  version: getVersionAtCommit(c.hash, TARGET_FILE),
}));

// ── 3. 按版本分组（版本号第一次出现的 commit 作为该版本的"发布节点"） ────
const versionMap = new Map(); // version -> { date, commits[] }

let currentVersion = null;
for (const info of commitInfos) {
  if (info.version && info.version !== currentVersion) {
    // 版本发生变化，开启新版本分组
    currentVersion = info.version;
    if (!versionMap.has(currentVersion)) {
      versionMap.set(currentVersion, { date: info.date, commits: [] });
    }
  }
  if (currentVersion) {
    versionMap.get(currentVersion).commits.push(info);
  }
}

// ── 4. 分类函数（复用 workflow 里的逻辑） ─────────────────────────────────
const SKIP_PATTERNS = [/^\[skip ci\]/i, /^docs: update changelog/i, /^chore:/i];

function categorize(commitList) {
  const cats = { Added: [], Changed: [], Fixed: [], Removed: [], Security: [], Other: [] };
  for (const { msg } of commitList) {
    if (SKIP_PATTERNS.some(p => p.test(msg))) continue;
    const clean = msg.replace(/^(feat|fix|refactor|perf|style|test|build|ci|chore|docs)(\(.+?\))?!?:\s*/i, '').trim();
    if      (/^feat/i.test(msg))          cats.Added.push(clean);
    else if (/^fix/i.test(msg))           cats.Fixed.push(clean);
    else if (/^refactor|^perf/i.test(msg))cats.Changed.push(clean);
    else if (/^remove|^drop/i.test(msg))  cats.Removed.push(clean);
    else if (/security/i.test(msg))       cats.Security.push(clean);
    else                                  cats.Other.push(clean);
  }
  return cats;
}

// ── 5. 生成所有版本的 Markdown 段落（从新到旧） ──────────────────────────
const ORDER = ['Added', 'Changed', 'Fixed', 'Removed', 'Security', 'Other'];
const sections = [];

// 倒序：最新版本在最前
const versions = [...versionMap.entries()].reverse();

for (const [version, { date, commits: vCommits }] of versions) {
  const cats = categorize(vCommits);
  const hasContent = Object.values(cats).some(a => a.length > 0);

  const lines = [`## [${version}] - ${date}`];
  if (hasContent) {
    for (const cat of ORDER) {
      if (cats[cat].length === 0) continue;
      lines.push(`\n### ${cat}`);
      cats[cat].forEach(item => lines.push(`- ${item}`));
    }
  } else {
    lines.push('\n_No significant changes recorded._');
  }
  sections.push(lines.join('\n'));
}

// ── 6. 写入 CHANGELOG.md ──────────────────────────────────────────────────
const header = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
`;

const body = header + '\n' + sections.join('\n\n') + '\n';
fs.writeFileSync(CHANGELOG_PATH, body, 'utf8');

console.log(`✅ 回填完成，共写入 ${versionMap.size} 个版本：`);
for (const [v, { date }] of [...versionMap.entries()].reverse()) {
  console.log(`   ${v}  (${date})`);
}