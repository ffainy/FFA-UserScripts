/*
$env:TARGET_SCRIPTS="apple.js banana.js"; node .github/scripts/rebuild-changelog.js
*/


const { execSync } = require('child_process');
const fs = require('fs');

// 从环境变量读取脚本列表，如果没有读取到则提示错误
const envScripts = process.env.TARGET_SCRIPTS;
if (!envScripts) {
    console.error("错误: 未在环境变量中找到 TARGET_SCRIPTS。");
    process.exit(1);
}

// 将字符串转换为数组（支持空格或逗号分隔）
const SCRIPTS = envScripts.split(/[\s,]+/).filter(Boolean);
console.log(`正在处理脚本: ${SCRIPTS.join(', ')}`);

const CHANGELOG_FILE = 'CHANGELOG.md';

const CATEGORIES = {
    'breaking': '### BREAKING CHANGES',
    'feat': '### Added',
    'fix': '### Fixed',
    'improvements': '### Improvements'
};

function getVersion(sha, file) {
    try {
        const content = execSync(`git show "${sha}:${file}"`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
        const match = content.match(/@version\s+([^\s\n\r]+)/);
        return match ? match[1] : null;
    } catch (e) { return null; }
}

function rebuild() {
    if (fs.existsSync(CHANGELOG_FILE)) {
        fs.copyFileSync(CHANGELOG_FILE, `${CHANGELOG_FILE}.bak`);
    }

    console.log("开始全量历史回溯...");
    let allSections = "";

    for (const file of SCRIPTS) {
        if (!fs.existsSync(file)) continue;
        console.log(`>>> 正在提取文件完整历史: ${file}`);

        // 1. 获取所有修改过该文件的提交（按时间从新到旧）
        const allCommits = execSync(`git log --pretty=format:%H -- "${file}"`).toString().trim().split('\n');
        
        // 2. 识别版本区块
        // 我们反向遍历，记录每个版本号对应的提交集合
        let versionsFound = []; // { ver: '0.1.0', endSha: 'xxx', commits: [] }
        let currentVer = null;
        let currentBlock = null;

        // 从旧到新遍历所有提交，划分版本边界
        const chronologicalCommits = allCommits.reverse();
        
        chronologicalCommits.forEach((sha) => {
            const ver = getVersion(sha, file);
            if (!ver) return;

            if (ver !== currentVer) {
                // 发现新版本（或者是第一个版本）
                currentVer = ver;
                currentBlock = { ver: ver, endSha: sha, commits: [] };
                versionsFound.push(currentBlock);
            }
            // 将当前提交归入当前版本号区块
            currentBlock.commits.push(sha);
        });

        // 3. 针对每个版本区块生成日志
        // 这里的逻辑是：一个版本的日志 = (上个版本的 endSha .. 当前版本的 endSha) 之间所有关于该文件的提交
        versionsFound.forEach((block, index) => {
            let groups = { 'breaking': [], 'feat': [], 'fix': [], 'improvements': [] };
            
            block.commits.forEach(sha => {
                const logLine = execSync(`git log -1 --pretty=format:"%s|%b|%h" ${sha}`).toString().trim();
                const [subject, body, hash] = logLine.split('|');
                
                const fullText = (subject + " " + (body || "")).toLowerCase();
                const typeMatch = subject.match(/^(\w+)/);
                const type = typeMatch ? typeMatch[1].toLowerCase() : '';
                
                // 过滤掉没意义的
                if (['ci', 'docs', 'chore', 'test', 'build', 'style'].includes(type) || 
                    subject.toLowerCase().includes('update changelog')) return;

                const isBreaking = subject.includes('!:') || fullText.includes('breaking change');
                const match = subject.match(/^(\w+)(?:\((.+?)\))?\s*!?\s*:\s*(.+)$/);
                
                let finalMsg = "";
                let targetKey = isBreaking ? 'breaking' : null;

                if (match) {
                    const [_, rawType, scope, msg] = match;
                    const typeKey = rawType.toLowerCase();
                    const scopePrefix = scope ? `**[${scope}]**: ` : "";
                    finalMsg = `- ${scopePrefix}${msg} (${hash})`;
                    
                    if (!isBreaking) {
                        if (typeKey === 'feat') targetKey = 'feat';
                        else if (typeKey === 'fix') targetKey = 'fix';
                        else if (['refactor', 'perf'].includes(typeKey)) targetKey = 'improvements';
                    }
                }

                if (finalMsg && targetKey) {
                    groups[targetKey].push(finalMsg);
                }
            });

            // 构建 Section
            let sectionContent = "";
            for (const [key, title] of Object.entries(CATEGORIES)) {
                if (groups[key].length > 0) {
                    sectionContent += `${title}\n${groups[key].join('\n')}\n`;
                }
            }

            if (sectionContent) {
                const date = execSync(`git log -1 --format=%as ${block.endSha}`).toString().trim();
                const section = `## ${file} [${block.ver}] - ${date}\n\n${sectionContent}\n\n`;
                // 最新的在最上面
                allSections = section + allSections;
            }
        });
    }

    const header = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n\n\n`;

    fs.writeFileSync(CHANGELOG_FILE, header + allSections);
    console.log(`[Success] 历史全量重构完成，已覆盖从 0.0.1 开始的所有版本。`);
}

rebuild();