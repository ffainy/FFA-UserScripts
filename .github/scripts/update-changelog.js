#!/usr/bin/env node
/**
 * update-changelog.js
 * 读取最近的 commit messages，按 Keep a Changelog 规范
 * 将新版本段落插入 CHANGELOG.md 的顶部（## [Unreleased] 之后）
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.resolve('CHANGELOG.md');
const NEW_VERSION  = process.env.NEW_VERSION;
const OLD_VERSION  = process.env.OLD_VERSION;
const BUMPED_FILE  = process.env.BUMPED_FILE;

if (!NEW_VERSION) {
  console.error('NEW_VERSION env var is required');
  process.exit(1);
}

// ── 1. 拉取自上个版本以来的 commit messages ──────────────────────────────
let commitLog = '';
try {
  // 如果有旧版本 tag，从 tag 开始；否则取最近 20 条
  const tagExists = execSync(`git tag -l "v${OLD_VERSION}"`).toString().trim();
  const range = tagExists ? `v${OLD_VERSION}..HEAD` : '-20';
  commitLog = execSync(
    `git log ${range} --pretty=format:"%s" --no-merges`
  ).toString().trim();
} catch {
  commitLog = execSync('git log -10 --pretty=format:"%s" --no-merges').toString().trim();
}

const commits = commitLog.split('\n').filter(Boolean);

// ── 2. 按 Conventional Commits 关键词分类 ────────────────────────────────
const categories = {
  Added:    [],
  Changed:  [],
  Fixed:    [],
  Removed:  [],
  Security: [],
  Other:    [],
};

const SKIP_PATTERNS = [/^\[skip ci\]/i, /^docs: update changelog/i, /^chore: /i];

for (const msg of commits) {
  if (SKIP_PATTERNS.some(p => p.test(msg))) continue;

  const clean = msg.replace(/^(feat|fix|refactor|perf|style|test|build|ci|chore|docs)(\(.+?\))?!?:\s*/i, '').trim();

  if (/^feat/i.test(msg))     categories.Added.push(clean);
  else if (/^fix/i.test(msg)) categories.Fixed.push(clean);
  else if (/^refactor|perf/i.test(msg)) categories.Changed.push(clean);
  else if (/^remove|^drop/i.test(msg))  categories.Removed.push(clean);
  else if (/security/i.test(msg))       categories.Security.push(clean);
  else                                  categories.Other.push(clean);
}

// 如果所有分类都是空的，把所有提交放进 Other
const hasAny = Object.values(categories).some(a => a.length > 0);
if (!hasAny) {
  commits.forEach(m => {
    if (!SKIP_PATTERNS.some(p => p.test(m))) categories.Other.push(m);
  });
}

// ── 3. 拼装新版本段落 ─────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const lines = [`## [${NEW_VERSION}] - ${today}`];

if (BUMPED_FILE) {
  lines.push(`\n> 📦 \`${BUMPED_FILE}\``);
}

const ORDER = ['Added', 'Changed', 'Fixed', 'Removed', 'Security', 'Other'];
for (const cat of ORDER) {
  if (categories[cat].length === 0) continue;
  lines.push(`\n### ${cat}`);
  categories[cat].forEach(item => lines.push(`- ${item}`));
}

const newSection = lines.join('\n');

// ── 4. 插入到 CHANGELOG.md ────────────────────────────────────────────────
let content = '';
if (fs.existsSync(CHANGELOG_PATH)) {
  content = fs.readFileSync(CHANGELOG_PATH, 'utf8');
} else {
  content = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).\n`;
}

// 找到第一个 ## 版本段落的位置，在它之前插入
const insertAfterHeader = content.indexOf('\n## ');
if (insertAfterHeader === -1) {
  // 没有已有版本段落，直接追加
  content = content.trimEnd() + '\n\n' + newSection + '\n';
} else {
  content = content.slice(0, insertAfterHeader) + '\n\n' + newSection + '\n' + content.slice(insertAfterHeader);
}

fs.writeFileSync(CHANGELOG_PATH, content, 'utf8');
console.log(`✅ CHANGELOG.md updated → v${NEW_VERSION}`);