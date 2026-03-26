// ==UserScript==
// @name                FFA Linkify
// @version             0.0.2
// @namespace           https://github.com/ffainy/FFA-UserScripts
// @icon                data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMzZhYTZkIiBkPSJNMTIgMEExMiAxMiAwIDAgMCAwIDEyYTEyIDEyIDAgMCAwIDEyIDEyYTEyIDEyIDAgMCAwIDEyLTEyQTEyIDEyIDAgMCAwIDEyIDBNNi43MTggNS4yODJMMTMuNDM2IDEybC02LjcxOCA2LjcxOGwtMi4wMzYtMi4wMzZMOS4zNjQgMTJMNC42ODIgNy4zMTh6bTcuMiAwTDIwLjYzNiAxMmwtNi43MTggNi43MThsLTIuMDM2LTIuMDM2TDE2LjU2NCAxMmwtNC42ODItNC42ODJ6Ii8+PC9zdmc+
// @description         Triple-click any plain-text URL to make it clickable
// @description:zh-CN   三击将纯文本 URL 转为可跳转链接
// @author              Farfaraway
// @tag                 productivity
// @match               *://*/*
// @grant               GM_addStyle
// @homepage            https://github.com/ffainy
// @supportURL          https://github.com/ffainy/FFA-UserScripts
// @downloadURL         https://raw.githubusercontent.com/ffainy/FFA-UserScripts/refs/heads/master/FFA-Linkify.js
// @updateURL           https://raw.githubusercontent.com/ffainy/FFA-UserScripts/refs/heads/master/FFA-Linkify.js
// ==/UserScript==

(function () {
    'use strict';

    // ─── 配置 ────────────────────────────────────────────────────────────────────

    /** 三击时间窗口（毫秒）：三次点击必须在此时间内完成 */
    const CLICK_TIMEOUT = 1000;

    /** 三击位置容差（像素）：每次点击偏移不超过此值才算同一位置 */
    const CLICK_THRESHOLD = 10;

    /**
     * URL 匹配正则
     * 注意：不在模块级复用同一实例，每次调用 findUrls() 时重新创建，
     * 避免带 g 标志的正则 lastIndex 状态在多次调用间污染匹配结果。
     */
    const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+\.[^\s<]{2,})/gi;

    /**
     * URL 尾部需要剥离的标点符号
     * 防止将句子结尾的标点（如句号、右括号）误纳入链接地址
     */
    const TRAILING_PUNCTUATION = /[.,;:!?)'"】）。，、]+$/;

    /** 注入的 CSS 类名，用于统一管理转换后链接的样式 */
    const LINK_CLASS = 'ffa-linkify';

    // ─── 样式注入 ─────────────────────────────────────────────────────────────────

    // 通过 GM_addStyle 注入 CSS，比直接操作 style 属性更健壮、易维护
    GM_addStyle(`
        .${LINK_CLASS} {
            color: #66CCFF;
            background: #163E64;
        }
    `);

    // ─── 三击检测 ─────────────────────────────────────────────────────────────────

    /** 存储最近三次点击记录（时间 + 坐标） */
    let recentClicks = [];

    document.addEventListener('click', function (e) {
        const now = Date.now();

        // 追加本次点击，只保留最近 3 条
        recentClicks.push({ time: now, x: e.clientX, y: e.clientY });
        if (recentClicks.length > 3) recentClicks.shift();

        if (recentClicks.length === 3) {
            const [first, second, third] = recentClicks;

            const withinTime     = third.time - first.time < CLICK_TIMEOUT;
            const withinDistance = getDistance(first, second) < CLICK_THRESHOLD
                                && getDistance(second, third) < CLICK_THRESHOLD;

            if (withinTime && withinDistance) {
                processTripleClick(e.clientX, e.clientY);
                recentClicks = []; // 重置，避免连续触发
            }
        }
    });

    // ─── 核心逻辑 ─────────────────────────────────────────────────────────────────

    /**
     * 三击命中后的处理入口：
     * 1. 找到鼠标下方的文本节点
     * 2. 检查是否已在链接内（避免重复处理）
     * 3. 提取文本中的 URL 并替换为 <a> 元素
     */
    function processTripleClick(x, y) {
        const textNode = getTextNodeFromPoint(x, y);
        if (!textNode || isInsideLink(textNode)) return;

        const urls = findUrls(textNode.nodeValue);
        if (urls.length > 0) {
            replaceTextWithLinks(textNode, urls);
        }
    }

    /**
     * 获取指定坐标下的文本节点
     * 兼容 Chrome（caretRangeFromPoint）和 Firefox（caretPositionFromPoint）
     *
     * @param {number} x
     * @param {number} y
     * @returns {Text | null}
     */
    function getTextNodeFromPoint(x, y) {
        let range;

        if (document.caretRangeFromPoint) {
            // Chrome / Edge
            range = document.caretRangeFromPoint(x, y);
        } else if (document.caretPositionFromPoint) {
            // Firefox
            const pos = document.caretPositionFromPoint(x, y);
            if (!pos) return null;
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
        }

        return range?.startContainer?.nodeType === Node.TEXT_NODE
            ? range.startContainer
            : null;
    }

    /**
     * 检查节点是否位于 <a> 元素内部（已是链接）
     *
     * @param {Node} node
     * @returns {boolean}
     */
    function isInsideLink(node) {
        let parent = node.parentNode;
        while (parent) {
            if (parent.tagName === 'A') return true;
            parent = parent.parentNode;
        }
        return false;
    }

    /**
     * 从文本中提取所有 URL 的位置与内容
     * 每次调用重新构造正则实例，确保 lastIndex 从 0 开始
     *
     * @param {string} text
     * @returns {{ start: number, end: number, url: string }[]}
     */
    function findUrls(text) {
        const regex = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
        const results = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            // 去除尾部标点，防止句末符号被误纳入链接
            const url = match[0].replace(TRAILING_PUNCTUATION, '');
            results.push({
                start: match.index,
                end:   match.index + url.length,
                url,
            });
        }

        return results;
    }

    /**
     * 将文本节点中识别出的 URL 替换为 <a> 元素
     * 使用 DocumentFragment 一次性完成 DOM 替换，减少重排次数
     *
     * @param {Text} textNode  - 原始文本节点
     * @param {{ start: number, end: number, url: string }[]} urls
     */
    function replaceTextWithLinks(textNode, urls) {
        const original = textNode.nodeValue;
        const fragment = document.createDocumentFragment();
        let cursor = 0;

        for (const { start, end, url } of urls) {
            // 插入 URL 前的普通文本段
            if (start > cursor) {
                fragment.appendChild(
                    document.createTextNode(original.slice(cursor, start))
                );
            }

            // 构建链接元素
            const a = document.createElement('a');
            a.className = LINK_CLASS;
            a.href      = url.startsWith('http') ? url : `http://${url}`;
            a.textContent = url;
            a.target    = '_blank';
            a.rel       = 'noopener noreferrer'; // 防止新页面通过 opener 访问当前页

            fragment.appendChild(a);
            cursor = end;
        }

        // 插入最后一段普通文本（URL 之后的部分）
        if (cursor < original.length) {
            fragment.appendChild(
                document.createTextNode(original.slice(cursor))
            );
        }

        textNode.parentNode.replaceChild(fragment, textNode);
    }

    // ─── 工具函数 ─────────────────────────────────────────────────────────────────

    /**
     * 计算两个坐标点之间的欧氏距离
     *
     * @param {{ x: number, y: number }} a
     * @param {{ x: number, y: number }} b
     * @returns {number}
     */
    function getDistance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

})();