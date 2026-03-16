#!/usr/bin/env node
/**
 * update-changelog.js
 *
 * 由 changelog.yml 调用，读取环境变量 BUMPED_FILES，
 * 为每个版本变动的脚本生成 Keep a Changelog 规范的段落，
 * 插入到 CHANGELOG.md 顶部。
 *
 * 新增脚本时只需在 changelog.yml 的 paths 里添加文件名，
 * 本脚本无需改动。
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.resolve('CHANGELOG.md');

// BUMPED_FILES 格式：file:newVer:oldVer，多个用逗号分隔
// 示例："FFA-Omnibar.js:1.3.0:1.2.0,FFA-NewScript.js:1.0.0:"
const BUMPED_FILES = process.env.BUMPED_FILES;

if (!BUMPED_FILES) {
  console.error('BUMPED_FILES env var is required');
  process.exit(1);
}

const targets = BUMPED_FILES.split(',').map(entry => {
  const [file, newVer, oldVer] = entry.split(':');
  return { file, newVer, oldVer: oldVer || '' };
});

// ── commit message 分类规则（Conventional Commits） ──────────────────────
const SKIP_PATTERNS = [
  /^\[skip ci\]/i,
  /^docs: update changelog/i,
  /^chore:/i,
];

const CAT_ORDER = ['Added', 'Changed', 'Fixed', 'Removed', 'Security', 'Other'];

function categorize(messages) {
  const cats = { Added: [], Changed: [], Fixed: [], Removed: [], Security: [], Other: [] };

  for (const msg of messages) {
    if (SKIP_PATTERNS.some(p => p.test(msg))) continue;

    // 去掉 conventional commit 前缀，保留可读描述
    const clean = msg
      .replace(/^(feat|fix|refactor|perf|style|test|build|ci|chore|docs)(\(.+?\))?!?:\s*/i, '')
      .trim();

    if      (/^feat/i.test(msg))           cats.Added.push(clean);
    else if (/^fix/i.test(msg))            cats.Fixed.push(clean);
    else if (/^refactor|^perf/i.test(msg)) cats.Changed.push(clean);
    else if (/^remove|^drop/i.test(msg))   cats.Removed.push(clean);
    else if (/security/i.test(msg))        cats.Security.push(clean);
    else                                   cats.Other.push(clean);
  }

  return cats;
}

// ── 为单个脚本生成版本段落 ───────────────────────────────────────────────
function buildSection(file, newVer, oldVer) {
  const scriptName = path.basename(file, '.js');
  const today = new Date().toISOString().slice(0, 10);

  // 若有旧版本的 tag，从 tag 取 commit range；否则取最近 20 条
  let commitMessages = [];
  try {
    const tagExists = execSync(`git tag -l "v${oldVer}"`).toString().trim();
    const range = tagExists ? `v${oldVer}..HEAD` : '-20';
    const raw = execSync(
      `git log ${range} --pretty=format:"%s" --no-merges`
    ).toString().trim();
    commitMessages = raw.split('\n').filter(Boolean);
  } catch {
    commitMessages = [];
  }

  const cats = categorize(commitMessages);
  const hasContent = Object.values(cats).some(a => a.length > 0);

  const lines = [`## [${scriptName}] ${newVer} - ${today}`];

  if (hasContent) {
    for (const cat of CAT_ORDER) {
      if (cats[cat].length === 0) continue;
      lines.push(`\n### ${cat}`);
      cats[cat].forEach(item => lines.push(`- ${item}`));
    }
  } else {
    lines.push('\n_No significant changes recorded._');
  }

  return lines.join('\n');
}

// ── 将所有新段落插入 CHANGELOG.md 顶部 ──────────────────────────────────
let content = '';
if (fs.existsSync(CHANGELOG_PATH)) {
  content = fs.readFileSync(CHANGELOG_PATH, 'utf8');
} else {
  content = [
    '# Changelog',
    '',
    'All notable changes to this project will be documented in this file.',
    '',
    'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),',
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
  ].join('\n') + '\n';
}

const newSections = targets
  .map(({ file, newVer, oldVer }) => {
    const section = buildSection(file, newVer, oldVer);
    console.log(`✅ Generated section for ${file} → v${newVer}`);
    return section;
  })
  .join('\n\n');

// 在第一个 ## 版本段落之前插入；若还没有版本段落则直接追加
const insertPos = content.indexOf('\n## ');
if (insertPos === -1) {
  content = content.trimEnd() + '\n\n' + newSections + '\n';
} else {
  content = content.slice(0, insertPos) + '\n\n' + newSections + '\n' + content.slice(insertPos);
}

fs.writeFileSync(CHANGELOG_PATH, content, 'utf8');