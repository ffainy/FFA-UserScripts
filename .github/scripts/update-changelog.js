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
  /^docs:\s*update changelog/i,
  // 注意：不再整体跳过 chore:，仅跳过 changelog 维护类提交
];

const CAT_ORDER = ['Added', 'Changed', 'Fixed', 'Removed', 'Security', 'Other'];

function categorize(messages) {
  const cats = { Added: [], Changed: [], Fixed: [], Removed: [], Security: [], Other: [] };

  for (const msg of messages) {
    if (!msg.trim()) continue;
    if (SKIP_PATTERNS.some(p => p.test(msg))) continue;

    // 去掉 conventional commit 前缀，保留可读描述
    const clean = msg
      .replace(/^(feat|fix|refactor|perf|style|test|build|ci|chore|docs)(\(.+?\))?!?:\s*/i, '')
      .trim();

    if (!clean) continue;

    if      (/^feat/i.test(msg))                cats.Added.push(clean);
    else if (/^fix/i.test(msg))                  cats.Fixed.push(clean);
    else if (/^refactor|^perf/i.test(msg))        cats.Changed.push(clean);
    else if (/^(remove|drop)/i.test(msg))         cats.Removed.push(clean);
    else if (/security/i.test(msg))               cats.Security.push(clean);
    else                                           cats.Other.push(clean);
  }

  return cats;
}

// ── 为单个脚本生成版本段落 ───────────────────────────────────────────────
function buildSection(file, newVer, oldVer) {
  const scriptName = path.basename(file, '.js');
  const today = new Date().toISOString().slice(0, 10);

  let commitMessages = [];

  // Bug fix: fetch-depth: 0 保证完整历史，tag 查找现在可以正常工作。
  // 若有旧版本对应的 tag，使用精确 range；否则回退到两个 commit 之间的 diff。
  try {
    // 先尝试用 tag 锁定 range
    const tagName = `v${oldVer}`;
    const tagExists = oldVer
      ? execSync(`git tag -l "${tagName}"`).toString().trim()
      : '';

    let raw = '';
    if (tagExists) {
      // 精确 range：从旧版本 tag 到当前 HEAD
      raw = execSync(
        `git log "${tagName}..HEAD" --pretty=format:"%s" --no-merges -- "${file}"`
      ).toString().trim();
      console.log(`  Using tag range: ${tagName}..HEAD`);
    } else if (oldVer) {
      // tag 不存在时，用两次版本 bump commit 之间的范围
      // 找到最近一次含旧版本号的 commit hash
      const prevCommit = execSync(
        `git log --pretty=format:"%H" --no-merges -- "${file}" | xargs -I{} git show {}:"${file}" 2>/dev/null | grep -l "@version ${oldVer}" || true`
      ).toString().trim();

      if (prevCommit) {
        raw = execSync(
          `git log "${prevCommit}..HEAD" --pretty=format:"%s" --no-merges -- "${file}"`
        ).toString().trim();
        console.log(`  Using commit range from previous version commit`);
      } else {
        // 最终回退：仅取当前 HEAD 的 commit message
        raw = execSync(
          `git log -1 --pretty=format:"%s" -- "${file}"`
        ).toString().trim();
        console.log(`  Fallback: using only HEAD commit message`);
      }
    } else {
      // 全新脚本，无旧版本，仅取最近一条
      raw = execSync(
        `git log -1 --pretty=format:"%s" -- "${file}"`
      ).toString().trim();
      console.log(`  New script, using HEAD commit message`);
    }

    commitMessages = raw.split('\n').filter(Boolean);
  } catch (err) {
    console.warn(`  Warning: could not retrieve commit messages: ${err.message}`);
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
console.log('✅ CHANGELOG.md updated successfully');