const { execSync } = require('child_process');
const fs = require('fs');

// 1. 配置与逻辑分离：从环境变量读取目标脚本列表
const envScripts = process.env.TARGET_SCRIPTS;
if (!envScripts) {
    console.error("错误: 未在环境变量中找到 TARGET_SCRIPTS。");
    process.exit(1);
}

const SCRIPTS = envScripts.split(/[\s,]+/).filter(Boolean);
const CHANGELOG_FILE = 'CHANGELOG.md';
const beforeSha = process.env.BEFORE_SHA;
const afterSha = process.env.AFTER_SHA;

// 2. 分类映射（遵循精简原则：Breaking, Added, Fixed, Improvements）
const CATEGORIES = {
    'breaking': '### BREAKING CHANGES',
    'feat': '### Added',
    'fix': '### Fixed',
    'improvements': '### Improvements'
};

/**
 * 从指定提交中提取脚本的 @version 字段
 */
function getVersion(sha, file) {
    try {
        const content = execSync(`git show "${sha}:${file}"`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
        const match = content.match(/@version\s+([^\s\n\r]+)/);
        return match ? match[1] : null;
    } catch (e) { return null; }
}

function update() {
    // 获取本次推送涉及的所有提交记录
    const commits = execSync(`git rev-list --reverse ${beforeSha}..${afterSha}`).toString().trim().split('\n');
    let lastBumpPoint = {};
    SCRIPTS.forEach(s => lastBumpPoint[s] = beforeSha);

    let allNewSections = "";
    let updatedScripts = []; // 用于记录本次真正产生更新日志的脚本名

    for (const commit of commits) {
        if (!commit) continue;
        for (const file of SCRIPTS) {
            if (!fs.existsSync(file)) continue;

            const oldVer = getVersion(`${commit}^`, file);
            const newVer = getVersion(commit, file);

            // 检测到版本号变动
            if (newVer && oldVer !== newVer) {
                const range = `${lastBumpPoint[file]}..${commit}`;
                const logs = execSync(`git log ${range} --pretty=format:"%s|%b|%h" --no-merges -- "${file}"`).toString().trim().split('\n');
                
                let groups = { 'breaking': [], 'feat': [], 'fix': [], 'improvements': [] };

                logs.forEach(line => {
                    if (!line.includes('|')) return;
                    const [subject, body, hash] = line.split('|');
                    const fullText = (subject + " " + (body || "")).toLowerCase();
                    
                    // 过滤无关提交
                    const typeMatch = subject.match(/^(\w+)/);
                    const type = typeMatch ? typeMatch[1].toLowerCase() : '';
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

                    if (finalMsg && targetKey) groups[targetKey].push(finalMsg);
                });

                let sectionBody = "";
                for (const [key, title] of Object.entries(CATEGORIES)) {
                    if (groups[key].length > 0) {
                        sectionBody += `${title}\n${groups[key].join('\n')}\n\n`;
                    }
                }

                if (sectionBody) {
                    const date = new Date().toISOString().split('T')[0];
                    const section = `## ${file} [${newVer}] - ${date}\n\n${sectionBody}\n\n`;
                    allNewSections = section + allNewSections;
                    
                    // 记录更新了日志的脚本
                    if (!updatedScripts.includes(file)) updatedScripts.push(file);
                }
                lastBumpPoint[file] = commit;
            }
        }
    }

    if (allNewSections) {
        const header = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n`;
        
        let oldContent = "";
        if (fs.existsSync(CHANGELOG_FILE)) {
            const currentFile = fs.readFileSync(CHANGELOG_FILE, 'utf8');
            oldContent = currentFile.replace(/^# Changelog[\s\S]*?---\n\n/, "");
        }

        fs.writeFileSync(CHANGELOG_FILE, header + allNewSections + oldContent);

        // 关键：将更新的脚本列表导出给 GitHub Actions 环境变量
        if (process.env.GITHUB_OUTPUT) {
            const listStr = updatedScripts.join(' & ');
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `updated_list=${listStr}\n`);
        }
        console.log(`更新成功: ${updatedScripts.join(', ')}`);
    } else {
        process.exit(0); // 没有更新也正常退出
    }
}

update();