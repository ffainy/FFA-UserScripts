// ==UserScript==
// @name         FFA Omnibar
// @namespace    http://tampermonkey.net/
// @description  A floating search toolbar that unifies Google, Bing, Baidu, Bilibili, Wikipedia, Steam and more — switch engines instantly, get real-time suggestions, and customize every detail with themes, fonts, and layout settings.
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiMxQTFBMkUiLz4KICA8Y2lyY2xlIGN4PSIyNyIgY3k9IjI2IiByPSIxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDBENEZGIiBzdHJva2Utd2lkdGg9IjMuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPGxpbmUgeDE9IjM0IiB5MT0iMzMiIHgyPSI0MiIgeTI9IjQxIiBzdHJva2U9IiMwMEQ0RkYiIHN0cm9rZS13aWR0aD0iMy41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8bGluZSB4MT0iMjAiIHkxPSI0NyIgeDI9IjQ0IiB5Mj0iNDciIHN0cm9rZT0iIzAwRDRGRiIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC45Ii8+CiAgPGxpbmUgeDE9IjIwIiB5MT0iNTMiIHgyPSIzOCIgeTI9IjUzIiBzdHJva2U9IiMwMEQ0RkYiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuNiIvPgo8L3N2Zz4=
// @version      2.0.0
// @author       Farfaraway
// @match        *://www.google.com/search*
// @match        *://www.baidu.com/s*
// @match        *://www.bing.com/search*
// @match        *://cn.bing.com/search*
// @match        *://duckduckgo.com/*
// @match        *://search.bilibili.com/*
// @match        *://*.wikipedia.org/*
// @match        *://store.steampowered.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      google.com
// @connect      suggestqueries.google.com
// @connect      suggestion.baidu.com
// @connect      ac.duckduckgo.com
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================================
    // 一、常量与默认配置
    // =========================================================================

    const STORAGE_KEY = 'ffa_omnibar_settings';
    const HISTORY_KEY = 'ffa_omnibar_history';
    const HISTORY_MAX = 20;

    /** 内置搜索引擎列表 */
    const DEFAULT_ENGINES = [
        { name: 'Google',    url: 'https://www.google.com/search?q=%s',                host: 'www.google.com',         enabled: true,  icon: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M7 7h3.5M9.5 5.5A4.5 4.5 0 1 0 11.5 7"/><line x1="10.5" y1="10.5" x2="13.5" y2="13.5"/></svg>' },
        { name: 'DuckDuckGo',url: 'https://duckduckgo.com/?q=%s',                      host: 'duckduckgo.com',         enabled: true,  icon: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><circle cx="6.5" cy="6" r="2" opacity="0.9"/><ellipse cx="8" cy="9" rx="5" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="5.5" r="0.8"/><path d="M10.5 4.5 Q12 3 13 4.5" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>' },
        { name: 'Bing',      url: 'https://www.bing.com/search?q=%s',                  host: 'bing.com',               enabled: true,  icon: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M4 2v10.5l2.5-1.2 4 2.2-4-5.5 3.5-1.8-6-3.5z" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round"/></svg>' },
        { name: 'Baidu',     url: 'https://www.baidu.com/s?wd=%s',                     host: 'www.baidu.com',          enabled: true,  icon: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><ellipse cx="8" cy="5.5" rx="2.5" ry="3"/><path d="M3 11c0-2.5 2.2-3.5 5-3.5s5 1 5 3.5"/><circle cx="3.5" cy="7" r="1.2"/><circle cx="12.5" cy="7" r="1.2"/></svg>' },
        { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s',    host: 'en.wikipedia.org',       enabled: false, icon: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h2l2 6 2-5 2 5 2-6h2"/><line x1="8" y1="12" x2="8" y2="14"/></svg>' },
        { name: 'Steam',     url: 'https://store.steampowered.com/search/?term=%s',    host: 'store.steampowered.com', enabled: false, icon: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="7" r="4.5"/><circle cx="8" cy="7" r="2"/><path d="M5.5 11.5 L3 14" stroke-width="2"/></svg>' },
        { name: 'Bilibili',  url: 'https://search.bilibili.com/all?keyword=%s',        host: 'search.bilibili.com',    enabled: false, icon: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="12" height="8" rx="2"/><path d="M5 5 L6.5 2.5"/><path d="M11 5 L9.5 2.5"/><line x1="5.5" y1="9" x2="5.5" y2="11"/><line x1="10.5" y1="9" x2="10.5" y2="11"/></svg>' },
    ];

    /** 内置主题 */
    const THEMES = {
        minimal: { n: { en: 'Clean Steel',  zh: '极简工业' }, b: '#F5F5F7', a: '#2C2C3E', r: 18, ir: 12, ta: 50, pa: 60 },
        warm:    { n: { en: 'Warm Reading', zh: '午后书屋' }, b: '#F9F3E9', a: '#6B4C3B', r: 32, ir: 14, ta: 50, pa: 60 },
        cyber:   { n: { en: 'Neon Noir',    zh: '暗夜霓虹' }, b: '#0D0D1A', a: '#00D4FF', r: 40, ir: 16, ta: 45, pa: 55 },
        forest:  { n: { en: 'Deep Forest',  zh: '宁静森林' }, b: '#0F1A12', a: '#89D4A0', r: 20, ir: 12, ta: 45, pa: 55 },
    };

    /** 国际化文本表 */
    const LOCALES = {
        panelTitle:          { en: 'FFA Omnibar',                    zh: 'FFA Omnibar'         },
        cardTheme:           { en: 'Theme Style',                    zh: '主题风格'             },
        cardVisual:          { en: 'Visual Settings',                zh: '视觉设置'             },
        cardInteraction:     { en: 'Behaviour',                      zh: '行为设置'             },
        cardEngines:         { en: 'Search Engines',                 zh: '搜索引擎'             },
        cardSearch:          { en: 'Search Behavior',                 zh: '搜索行为'             },
        cardLanguage:        { en: 'Language',                       zh: '语言'                },
        cardData:            { en: 'Data',                           zh: '数据'                },
        labelOffset:         { en: 'Bottom Offset',                  zh: '底部间距'             },
        labelFontSize:       { en: 'Font Size',                      zh: '字体大小'             },
        labelPanelRadius:    { en: 'Panel Radius',                   zh: '面板圆角'             },
        labelWidgetRadius:   { en: 'Widget Radius',                  zh: '控件圆角'             },
        labelToolbarAlpha:   { en: 'Toolbar Background',             zh: '搜索条背景'            },
        labelPanelAlpha:     { en: 'Panel Background',               zh: '面板背景'             },
        labelBgColor:        { en: 'Background Color',               zh: '背景颜色'             },
        labelAccentColor:    { en: 'Accent Color',                   zh: '强调颜色'             },
        labelAutoFade:       { en: 'Auto Fade',                      zh: '自动渐隐'             },
        labelNewTab:         { en: 'Open in New Tab',                 zh: '新标签页打开'         },
        hintNewTab:          { en: 'Search results will open in a new tab', zh: '搜索结果将在新标签页打开' },
        labelFont:           { en: 'Font Family',                    zh: '字体'                },
        labelFontHint:       { en: 'e.g. "Microsoft Yahei"',         zh: '例如 "Microsoft Yahei"' },
        btnAddEngine:        { en: 'Add New Engine',                 zh: '添加新引擎'            },
        btnApply:            { en: 'Done',                           zh: '完成'                },
        btnReset:            { en: 'Reset All',                      zh: '恢复默认'             },
        btnExport:           { en: 'Export Settings',                zh: '导出设置'             },
        btnImport:           { en: 'Import Settings',                zh: '导入设置'             },
        importFail:          { en: 'Invalid settings file.',         zh: '文件格式无效。'        },
        subPanelTitle:       { en: 'Edit Engine',                    zh: '编辑引擎'             },
        subPanelTitleAdd:    { en: 'Add Engine',                     zh: '添加引擎'             },
        labelName:           { en: 'Name',                           zh: '名称'                },
        labelUrl:            { en: 'Search URL',                     zh: '搜索网址'             },
        labelHost:           { en: 'Hostname',                       zh: '主机名'              },
        labelIcon:           { en: 'Icon  (optional)',               zh: '图标（可选）'          },
        labelIconPreview:    { en: 'Preview',                        zh: '预览'                },
        btnConfirm:          { en: 'Confirm',                        zh: '确认'                },
        btnCancel:           { en: 'Cancel',                         zh: '取消'                },
        btnRemoveHistory:    { en: 'Remove',                         zh: '删除'                },
        btnCustomColor:      { en: 'Custom',                         zh: '自定义'               },
        btnCopied:           { en: '✓ Copied',                       zh: '✓ 已复制'             },
        confirmReset:        { en: 'Reset to factory defaults?',     zh: '确定恢复出厂设置？'    },
        confirmDeleteEngine: { en: 'Delete this engine?',            zh: '确定删除该引擎？'      },
        labelRecent:         { en: 'Recent',                         zh: '最近搜索'             },
        labelSuggestions:    { en: 'Suggestions',                    zh: '搜索建议'             },
        hintNameDesc:        { en: 'Label shown on the toolbar button. Keep it short.', zh: '显示在工具栏按钮上的名称，建议简短。' },
        hintNameEx:          { en: 'Google',                         zh: 'Google'              },
        hintUrlDesc:         { en: 'Search URL template. Use %s as the query placeholder.', zh: '搜索链接模板，用 %s 代表搜索词。' },
        hintUrlEx:           { en: 'https://www.google.com/search?q=%s', zh: 'https://www.google.com/search?q=%s' },
        hintHostDesc:        { en: 'Domain of the results page. Used to highlight the active engine.', zh: '搜索结果页的域名，用于识别当前页面并高亮对应按钮。' },
        hintHostEx:          { en: 'www.google.com',                 zh: 'www.google.com'      },
        hintHostTip:         { en: 'Tip: copy the domain from your Search URL and remove the path.', zh: '提示：从搜索网址中截取域名部分即可。' },
        hintIconDesc:        { en: "Paste a raw SVG string or a base64 data URI. Leave blank to use the engine's initial letter.", zh: '粘贴原始 SVG 字符串或 base64 data URI。留空则自动使用首字母作为图标。' },
        hintIconFmt1:        { en: 'Format 1 — Raw SVG:',            zh: '格式一 — 原始 SVG：'  },
        hintIconFmt2:        { en: 'Format 2 — Base64 data URI:',    zh: '格式二 — Base64 data URI：' },
        hintIconEx1:         { en: '&lt;svg viewBox="0 0 16 16" ...&gt;...&lt;/svg&gt;', zh: '&lt;svg viewBox="0 0 16 16" ...&gt;...&lt;/svg&gt;' },
        hintIconEx2:         { en: 'data:image/svg+xml;base64,PHN2Zy4uLg==', zh: 'data:image/svg+xml;base64,PHN2Zy4uLg==' },
        hintIconErr:         { en: 'Invalid format. Must start with &lt;svg or data:image/svg+xml;base64,', zh: '格式错误，必须以 &lt;svg 或 data:image/svg+xml;base64, 开头。' },
    };

    /** 全局默认设置 */
    const DEFAULT_SETTINGS = {
        bt: 30,           // 工具栏距底部距离 (px)
        fs: 14,           // 字体大小 (px)
        ta: 50,           // 工具栏背景透明度 (%)
        pa: 60,           // 面板背景透明度 (%)
        ah: true,         // 自动渐隐
        lang: 'en',       // 语言
        font: '',         // 自定义字体
        searchBehavior: {
            openInNewTab: true,  // 搜索时是否在新标签页打开
        },
        en: DEFAULT_ENGINES,
        ...THEMES.minimal,
    };

    // =========================================================================
    // 二、EventBus（模块间发布/订阅）
    // =========================================================================

    const EventBus = {
        _h: new Map(),
        /**
         * 订阅事件，返回取消订阅函数
         * @param {string} event
         * @param {Function} handler
         * @returns {Function} unsubscribe
         */
        on(event, handler) {
            if (!this._h.has(event)) this._h.set(event, new Set());
            this._h.get(event).add(handler);
            return () => this._h.get(event)?.delete(handler);
        },
        emit(event, data) {
            this._h.get(event)?.forEach(fn => {
                try { fn(data); } catch (e) { console.error('[FFA EventBus]', event, e); }
            });
        },
    };

    // =========================================================================
    // 三、SecurityUtils（所有用户输入的唯一安全出口）
    // =========================================================================

    const SecurityUtils = {
        /**
         * HTML 实体转义，防止 XSS。
         * 用于将任意字符串安全插入 innerHTML 上下文。
         */
        escapeHtml(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        /**
         * SVG 白名单清洗：
         *   - 移除 <script>、<use>、<foreignObject>
         *   - 移除所有 on* 事件属性
         *   - 移除 href/xlink:href 中的 javascript: 协议
         * @param {string} raw
         * @returns {string|null} 清洗后的 SVG 字符串，不合法时返回 null
         */
        sanitizeSvg(raw) {
            if (!raw || typeof raw !== 'string') return null;
            const trimmed = raw.trim();
            if (!trimmed.startsWith('<svg')) return null;
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(trimmed, 'image/svg+xml');
                if (doc.querySelector('parsererror')) return null;
                const svg = doc.documentElement;
                // 移除危险元素
                svg.querySelectorAll('script,use,foreignObject').forEach(el => el.remove());
                // 移除危险属性
                svg.querySelectorAll('*').forEach(el => {
                    [...el.attributes].forEach(attr => {
                        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
                        if (/^(xlink:)?href$/i.test(attr.name) &&
                            /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
                    });
                });
                return svg.outerHTML;
            } catch (e) {
                return null;
            }
        },

        /**
         * 校验并清洗图标输入
         * @param {string} raw
         * @returns {{ valid: true, type: 'svg'|'base64'|'default', value: string }
         *         |{ valid: false, reason: string }}
         */
        validateIcon(raw) {
            if (!raw?.trim()) return { valid: true, type: 'default', value: '' };
            const trimmed = raw.trim();
            if (trimmed.startsWith('<svg')) {
                const sanitized = this.sanitizeSvg(trimmed);
                return sanitized
                    ? { valid: true,  type: 'svg',    value: sanitized }
                    : { valid: false, reason: 'invalid_svg' };
            }
            if (trimmed.startsWith('data:image/svg+xml;base64,')) {
                return { valid: true, type: 'base64', value: trimmed };
            }
            return { valid: false, reason: 'unknown_format' };
        },
    };

    // =========================================================================
    // 四、工具函数
    // =========================================================================

    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function contrastColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#000' : '#fff';
    }

    function escAttr(str) {
        return String(str ?? '').replace(/"/g, '&quot;');
    }

    function debounce(fn, delay = 16) {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    /**
     * 国际化：根据当前设置语言返回文本
     * @param {string} key
     */
    function t(key) {
        const entry = LOCALES[key];
        if (!entry) return key;
        const lang = SettingsManager.current?.lang ?? 'en';
        return entry[lang] ?? entry.en;
    }

    /**
     * 为无内置图标的引擎生成首字母 SVG（使用 textContent，无 XSS 风险）
     */
    function makeDefaultIcon(name) {
        const letter = SecurityUtils.escapeHtml((name || '?')[0].toUpperCase());
        return `<svg viewBox="0 0 16 16" width="16" height="16"><text x="8" y="11.5" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor" font-family="system-ui,sans-serif">${letter}</text></svg>`;
    }

    /**
     * 从各搜索引擎 URL 提取当前查询词
     * 支持: q (Google/Bing/DDG), wd (Baidu), keyword (Bilibili), search (Wikipedia)
     */
    function extractPageQuery() {
        const p = new URLSearchParams(location.search);
        return p.get('q') || p.get('wd') || p.get('keyword') || p.get('search') || '';
    }

    /**
     * 判断当前页面 hostname 是否与引擎 host 匹配。
     * 支持子域名：引擎 host 为根域（如 "bing.com"）时，
     * "www.bing.com" 和 "cn.bing.com" 均可命中。
     * @param {string} hostname  - location.hostname
     * @param {string} engineHost
     * @returns {boolean}
     */
    function hostMatches(hostname, engineHost) {
        return hostname === engineHost || hostname.endsWith('.' + engineHost);
    }

    /** 内置引擎的 host 集合，编辑时图标输入框不回填内置图标 */
    const BUILTIN_HOSTS = new Set(DEFAULT_ENGINES.map(e => e.host));

    /**
     * 根据图标字符串更新预览容器（安全版）
     */
    function updateIconPreview(raw, el) {
        if (!el) return;
        if (!raw?.trim()) {
            el.innerHTML = '<span style="font-size:10px;opacity:0.4">—</span>';
            return;
        }
        const result = SecurityUtils.validateIcon(raw);
        if (!result.valid) {
            el.innerHTML = '<span style="font-size:16px">✕</span>';
            return;
        }
        el.innerHTML = '';
        if (result.type === 'svg') {
            el.innerHTML = result.value;
            const svg = el.querySelector('svg');
            if (svg) { svg.style.width = '24px'; svg.style.height = '24px'; }
        } else if (result.type === 'base64') {
            const img = document.createElement('img');
            img.src = result.value;
            img.style.cssText = 'width:24px;height:24px';
            el.appendChild(img);
        }
    }

    /**
     * 构建 CSS 自定义属性声明块
     * 被 StyleEngine.update() 调用写入 <style> 标签
     */
    function buildCSSVariables(s) {
        const textColor  = contrastColor(s.b);
        const isDark     = textColor === '#fff';
        const shadowColor = hexToRgba(s.a, isDark ? 0.4 : 0.25);
        const shadowSpec  = `0 ${isDark ? 20 : 15}px ${isDark ? 80 : 45}px ${shadowColor}`;
        const blurLevel   = isDark ? '45px' : '40px';
        const saturation  = isDark ? '210%' : '180%';
        const dimText     = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.78)';
        const borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
        const innerBg     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const fontStack   = s.font?.trim()
            ? s.font.split(',').map(f => `"${f.trim().replace(/^["']+|["']+$/g, '')}"`).filter(f => f !== '""').join(',') + ','
            : '';

        return `:host,:root{` +
            `--nb:${s.bt}px;` +
            `--nr:${s.r}px;` +
            `--ni:${s.ir}px;` +
            `--nfs:${s.fs}px;` +
            `--nbp:${hexToRgba(s.b, s.pa / 100)};` +
            `--nbs:${hexToRgba(s.b, Math.max(s.pa / 100, 0.85))};` +
            `--nbt:${hexToRgba(s.b, s.ta / 100)};` +
            `--na:${s.a};` +
            `--ntm:${textColor};` +
            `--ntd:${dimText};` +
            `--noa:${contrastColor(s.a)};` +
            `--nbd:${borderColor};` +
            `--nag:${hexToRgba(s.a, 0.35)};` +
            `--nib:${innerBg};` +
            `--ho:${s.ah ? 0.2 : 1};` +
            `--hy:${s.ah ? 40 : 0}px;` +
            `--nf:${fontStack}system-ui,sans-serif;` +
            `--sp:cubic-bezier(0.23,1,0.32,1);` +
            `--sd:${shadowSpec};` +
            `--ng:blur(${blurLevel}) saturate(${saturation});` +
            `--ncb:var(--nbp)` +
            `}` +
            `:host *{font-family:${fontStack}system-ui,sans-serif !important}`;
    }

    // =========================================================================
    // 五、SettingsManager（设置读写的唯一入口）
    // =========================================================================

    const SettingsManager = {
        _s: null,

        get current() { return this._s; },

        /** 从 GM storage 加载并合并，内置引擎保持最新结构 */
        load() {
            const saved = GM_getValue(STORAGE_KEY, {});
            this._s = { ...DEFAULT_SETTINGS, ...saved };

            const defaultHostSet = new Set(DEFAULT_ENGINES.map(e => e.host));
            const mergedBuiltins = DEFAULT_ENGINES.map(def => {
                const savedEntry = saved.en?.find(e => e.host === def.host);
                return savedEntry ? { ...def, ...savedEntry } : { ...def };
            });
            const customEngines = saved.en?.filter(e => !defaultHostSet.has(e.host)) ?? [];
            this._s.en = [...mergedBuiltins, ...customEngines];
            return this._s;
        },

        /** 持久化当前设置 */
        save() {
            GM_setValue(STORAGE_KEY, this._s);
        },

        /**
         * 批量更新字段并持久化，触发 'settings:changed' 事件
         * @param {object} patch
         */
        update(patch) {
            Object.assign(this._s, patch);
            this.save();
            EventBus.emit('settings:changed', patch);
        },

        /** 恢复出厂默认 */
        reset() {
            this._s = { ...DEFAULT_SETTINGS, en: DEFAULT_ENGINES.map(e => ({ ...e })) };
            this.save();
            EventBus.emit('settings:reset');
        },

        addEngine(eng) {
            this._s.en.push(eng);
            this.save();
            EventBus.emit('settings:engines:changed');
        },

        updateEngine(ref, patch) {
            Object.assign(ref, patch);
            if (patch.icon === undefined) delete ref.icon;
            this.save();
            EventBus.emit('settings:engines:changed');
        },

        removeEngine(ref) {
            this._s.en = this._s.en.filter(e => e !== ref);
            this.save();
            EventBus.emit('settings:engines:changed');
        },

        /** 重排引擎顺序，校验总数后持久化 */
        reorderEngines(newOrder) {
            if (newOrder.length !== this._s.en.length) return false;
            this._s.en = newOrder;
            this.save();
            EventBus.emit('settings:engines:changed');
            return true;
        },

        /** 导出为 JSON 字符串 */
        exportJSON() {
            return JSON.stringify(this._s, null, 2);
        },

        /** 从 JSON 字符串导入，成功返回 true */
        importJSON(jsonStr) {
            try {
                const parsed = JSON.parse(jsonStr);
                if (typeof parsed !== 'object' || !parsed) throw new Error('invalid');
                // 重用 load 逻辑进行引擎合并
                const saved = parsed;
                this._s = { ...DEFAULT_SETTINGS, ...saved };
                const defaultHostSet = new Set(DEFAULT_ENGINES.map(e => e.host));
                const mergedBuiltins = DEFAULT_ENGINES.map(def => {
                    const savedEntry = saved.en?.find(e => e.host === def.host);
                    return savedEntry ? { ...def, ...savedEntry } : { ...def };
                });
                const customEngines = saved.en?.filter(e => !defaultHostSet.has(e.host)) ?? [];
                this._s.en = [...mergedBuiltins, ...customEngines];
                this.save();
                EventBus.emit('settings:reset');
                return true;
            } catch (e) {
                return false;
            }
        },
    };

    // =========================================================================
    // 六、StyleEngine（样式注入，用 setProperty 替代字符串替换）
    // =========================================================================

    const StyleEngine = {
        _globalEl: null,

        /**
         * 初始化：向 document.head 注入 <style>（只执行一次）
         * 静态 PANEL_CSS 写入后永不修改；CSS 变量通过 update() 刷新。
         */
        init() {
            let el = document.getElementById('ffa-global-style');
            if (!el) {
                el = document.createElement('style');
                el.id = 'ffa-global-style';
                document.head.appendChild(el);
            }
            this._globalEl = el;
            this.update();
        },

        /**
         * 更新 CSS 变量声明块。
         * PANEL_CSS 中所有 var(--xxx) 引用自然生效，无需任何字符串替换。
         */
        update() {
            if (!this._globalEl) return;
            this._globalEl.textContent = buildCSSVariables(SettingsManager.current) + PANEL_CSS;
        },
    };

    // =========================================================================
    // 七、CSS 样式字符串
    // =========================================================================

    const PANEL_CSS = [
        /* 遮罩 */
        `.neo-mask{position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);z-index:2147483640;visibility:hidden;opacity:0;transition:0.5s}`,
        `.neo-mask.show{visibility:visible;opacity:1}`,
        /* 面板主体 */
        `.neo-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-48%) scale(0.94);width:520px;min-height:40vh;max-height:70vh;border-radius:var(--nr);padding:30px 0;z-index:2147483645;visibility:hidden;opacity:0;color:var(--ntm);font-family:var(--nf);box-shadow:var(--sd);transition:0.5s var(--sp);background:var(--nbs);border:1px solid var(--nbd);backdrop-filter:var(--ng);display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}`,
        `.neo-panel.show{visibility:visible;opacity:1;transform:translate(-50%,-50%) scale(1)}`,
        `.neo-panel *{font-family:var(--nf) !important;color:inherit;box-sizing:border-box}`,
        `.neo-panel a,.neo-panel a:visited,.neo-panel a:hover{color:inherit;text-decoration:none}`,
        /* 滚动区 */
        `.neo-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:0 28px}`,
        `.neo-scroll::-webkit-scrollbar{width:4px}`,
        `.neo-scroll::-webkit-scrollbar-track{background:transparent}`,
        `.neo-scroll::-webkit-scrollbar-thumb{background:var(--nbd);border-radius:10px}`,
        /* 引擎行 */
        `.neo-engine-host{font-size:10px;color:var(--ntd) !important}`,
        `.neo-engine-row{display:flex;align-items:center;gap:15px;padding:12px 15px;background:var(--nib);border-radius:var(--ni);border:1px solid var(--nbd);margin-bottom:12px;cursor:grab;transition:0.25s var(--sp);position:relative}`,
        `.neo-engine-row:hover{border-color:var(--na);background:var(--nag);transform:translateY(-3px);box-shadow:0 6px 20px var(--nag),0 0 10px var(--nag)}`,
        `.neo-engine-row.dragging{opacity:0.5;border-color:var(--na);background:var(--na);color:var(--noa);cursor:grabbing;box-shadow:0 10px 40px var(--nag),0 0 20px var(--nag);transform:scale(1.02) rotate(2deg);transition:0.15s var(--sp)}`,
        `.n-list.drag-active{background:rgba(0,0,0,0.02);border-radius:var(--ni);padding:8px}`,
        /* 开关 */
        `.neo-switch{width:40px;height:20px;border-radius:20px;background:var(--nbd);position:relative;cursor:pointer;transition:0.25s var(--sp)}`,
        `.neo-switch::after{content:'';position:absolute;left:4px;top:4px;width:12px;height:12px;background:var(--ntd);border-radius:50%;transition:0.25s var(--sp)}`,
        `.neo-switch.on{background:var(--na)}`,
        `.neo-switch.on::after{left:24px;background:var(--noa)}`,
        /* 卡片 */
        `.neo-card{background:var(--nbp);backdrop-filter:blur(15px);border-radius:min(calc(var(--nr) * 0.7),20px);padding:22px;margin-bottom:16px;border:1px solid var(--nbd);box-shadow:0 10px 30px rgba(0,0,0,0.05);box-sizing:border-box}`,
        `.neo-card-title{font-size:13px;font-weight:900;letter-spacing:1px;color:var(--na);margin-bottom:16px;display:block;text-transform:uppercase;transform:translateZ(0);text-shadow:0 0 12px var(--na)}`,
        /* 标签行 */
        `.neo-label{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--ntm);margin-bottom:8px;font-weight:600;transform:translateZ(0)}`,
        `.neo-label b{font-weight:400;color:var(--ntd);font-size:11px;background:var(--nib);padding:2px 8px;border-radius:10px}`,
        /* range 滑块 */
        `input[type=range]{width:100%;cursor:pointer;accent-color:var(--na);margin:12px 0;height:4px;font-family:var(--nf)}`,
        /* 底部按钮区 */
        `.neo-footer{padding:20px 28px;display:flex;gap:15px;border-top:1px solid var(--nbd)}`,
        `.neo-btn-main{padding:14px;background:var(--na);color:var(--noa);border:none;border-radius:var(--ni);font-weight:800;cursor:pointer;transition:0.25s var(--sp);box-sizing:border-box;box-shadow:0 4px 15px var(--nag);font-family:var(--nf);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;transform:translateZ(0)}`,
        `.neo-btn-main:hover{transform:translateY(-3px);box-shadow:0 8px 25px var(--nag),0 0 15px var(--nag);text-shadow:0 0 10px var(--noa),0 0 25px var(--noa)}`,
        /* 编辑引擎子面板 */
        `.neo-sub-panel{position:absolute;inset:0;background:var(--nbs);backdrop-filter:var(--ng);z-index:100;padding:0;transform:translateY(100%);transition:0.5s var(--sp);display:flex;flex-direction:column;box-sizing:border-box;border-top:1px solid var(--nbd)}`,
        `.neo-sub-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:30px;box-sizing:border-box}`,
        `.neo-sub-panel.show{transform:translateY(0)}`,
        `.neo-edit-input{width:100%;padding:14px;background:var(--nib);border:1px solid var(--nbd);border-radius:var(--ni);color:var(--ntm);margin-bottom:15px;outline:none;box-sizing:border-box;font-family:var(--nf)}`,
        `.neo-edit-input:focus{border-color:var(--na);background:var(--nbp);box-shadow:0 0 12px var(--nag)}`,
        /* 主题切换按钮 */
        `.neo-theme-btn{flex:1;padding:12px 5px;font-size:11px;border-radius:var(--ni);cursor:pointer;border:1px solid var(--nbd);background:var(--nib);color:var(--ntm);font-weight:bold;transition:0.25s var(--sp);font-family:var(--nf);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;transform:translateZ(0)}`,
        `.neo-theme-btn:hover{background:var(--nag);border-color:var(--na);box-shadow:0 4px 15px var(--nag),0 0 10px var(--nag);text-shadow:0 0 10px var(--na),0 0 20px var(--na)}`,
        `.neo-theme-btn.active{border-color:var(--na);background:var(--na);color:var(--noa);text-shadow:0 0 6px var(--noa),0 0 16px var(--noa)}`,
        /* 字段说明 */
        `.neo-field-hint{font-size:11px;color:var(--ntd);margin:4px 0 12px;line-height:1.6}`,
        `.neo-field-ex{display:inline-flex;align-items:center;gap:6px;margin-top:4px;padding:5px 10px;background:var(--nib);border:1px solid var(--nbd);border-radius:8px;font-size:11px;font-family:monospace;color:var(--na);letter-spacing:0.3px;cursor:pointer;transition:0.2s var(--sp);user-select:none}`,
        `.neo-field-ex:hover{border-color:var(--na);background:var(--nag);box-shadow:0 0 8px var(--nag)}`,
        `.neo-field-ex .ex-icon{font-size:10px;opacity:0.6}`,
        `.neo-field-tip{font-size:10px;color:var(--ntd);margin-top:6px;padding-left:2px;opacity:0.8;font-style:italic}`,
        /* 图标行 */
        `.neo-icon-row{display:flex;gap:12px;align-items:flex-start;margin-bottom:0}`,
        `.neo-icon-textarea{flex:1;height:48px;padding:10px;background:var(--nib);border:1px solid var(--nbd);border-radius:var(--ni);color:var(--ntm);outline:none;box-sizing:border-box;font-family:monospace;font-size:11px;resize:none;line-height:1.5}`,
        `.neo-icon-textarea:focus{border-color:var(--na);background:var(--nbp);box-shadow:0 0 12px var(--nag)}`,
        `.neo-icon-preview{width:48px;height:48px;flex-shrink:0;border:1px solid var(--nbd);border-radius:var(--ni);display:flex;align-items:center;justify-content:center;background:var(--nib);color:var(--na);font-size:10px;overflow:hidden}`,
        `.neo-icon-preview svg,.neo-icon-preview img{width:24px;height:24px}`,
        `.neo-icon-error{font-size:10px;color:#ff4757;margin-top:5px;display:none}`,
        `.neo-icon-error.show{display:block}`,
        /* 色板 */
        `.neo-swatch-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;align-items:center}`,
        `.neo-swatch{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:0.2s var(--sp);flex-shrink:0;box-sizing:border-box}`,
        `.neo-swatch:hover{transform:scale(1.2);box-shadow:0 0 8px rgba(0,0,0,0.3)}`,
        `.neo-swatch.selected{border-color:var(--na);transform:scale(1.15);box-shadow:0 0 10px var(--nag)}`,
        `.neo-swatch-custom{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px dashed var(--ntd);transition:0.2s var(--sp);flex-shrink:0;overflow:hidden;position:relative;box-sizing:border-box}`,
        `.neo-swatch-custom:hover{border-color:var(--na);transform:scale(1.2)}`,
        `.neo-swatch-custom input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;padding:0;border:none}`,
    ].join('');

    const TOOLBAR_CSS = [
        `:host{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--nb) + 6px);z-index:2147483642;font-family:var(--nf)}`,
        `.wrapper{transition:0.8s var(--sp);opacity:var(--ho);transform:translateY(var(--hy))}`,
        `.wrapper:hover,.wrapper.active,.wrapper.pinned{opacity:1;transform:translateY(0)}`,
        `.toolbar{display:flex;align-items:center;gap:6px;padding:8px 14px;background:var(--nbt);backdrop-filter:var(--ng);border:1px solid var(--nbd);border-radius:var(--nr);box-shadow:var(--sd);transition:0.4s var(--sp)}`,
        `.toolbar.focused{border-color:var(--na);background:var(--nbp);box-shadow:var(--sd),0 0 25px var(--nag),0 0 50px var(--nag)}`,
        `.engine-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;font-size:var(--nfs);line-height:1.2;color:var(--ntm);cursor:pointer;background:var(--nib);border-radius:var(--ni);transition:opacity 0.4s var(--sp),box-shadow 0.25s var(--sp),border-color 0.25s var(--sp),background 0.25s var(--sp),transform 0.25s var(--sp);white-space:nowrap;font-weight:700;border:1px solid var(--nbd);box-sizing:border-box;font-family:var(--nf);-webkit-font-smoothing:antialiased;opacity:0.5}`,
        `.engine-btn .btn-icon{flex-shrink:0;display:flex;align-items:center;width:16px;height:16px}`,
        `.engine-btn .btn-label{display:none;opacity:0;transition:opacity 0.3s var(--sp)}`,
        `.toolbar:hover .engine-btn:not(.active),.toolbar.pinned .engine-btn:not(.active){opacity:1}`,
        `.toolbar:hover .engine-btn:not(.active) .btn-label,.toolbar.pinned .engine-btn:not(.active) .btn-label{display:inline;opacity:1}`,
        `.engine-btn:hover{border-color:var(--na);background:var(--nag);transform:translateY(-3px);box-shadow:0 8px 20px var(--nag),0 0 12px var(--nag);text-shadow:0 0 12px var(--na),0 0 25px var(--na)}`,
        `.engine-btn.active{background:var(--na);color:var(--noa);padding:8px 14px;box-shadow:0 8px 25px var(--nag);border-color:var(--na);text-shadow:0 0 8px var(--noa),0 0 20px var(--noa);opacity:1 !important}`,
        `.engine-btn.active .btn-label{display:inline;opacity:1}`,
        `.engine-btn.active:hover{transform:translateY(-3px)}`,
        `.input-container{position:relative;display:flex;align-items:center}`,
        `.search-input{-webkit-appearance:none;appearance:none;border:1px solid var(--nbd);background:var(--nib);padding:10px 20px;outline:none;width:150px;font-size:var(--nfs);line-height:1.2;color:var(--ntm);border-radius:var(--ni);transition:all 0.5s var(--sp);box-sizing:border-box;font-family:var(--nf)}`,
        `.search-input:focus{width:300px;border-color:var(--na);background:transparent;box-shadow:0 0 15px var(--nag);animation:pulse-focus 0.6s var(--sp)}`,
        `@keyframes pulse-focus{0%{box-shadow:0 0 0 0 var(--nag)}50%{box-shadow:0 0 25px 6px var(--nag)}100%{box-shadow:0 0 15px var(--nag)}}`,
        `.suggest-box{position:absolute;bottom:110%;left:50%;transform:translateX(-50%);width:95vw;max-width:720px;display:none;flex-wrap:wrap;gap:12px;justify-content:center;padding-bottom:35px}`,
        `.suggest-box.show{display:flex;animation:su 0.5s var(--sp)}`,
        `@keyframes su{from{opacity:0;transform:translateX(-50%) translateY(30px) scale(0.9)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}`,
        `@keyframes si{from{opacity:0;transform:translateY(16px) scale(0.92)}to{opacity:1;transform:translateY(0) scale(1)}}`,
        `.suggest-item:nth-child(1){animation-delay:0ms}.suggest-item:nth-child(2){animation-delay:40ms}.suggest-item:nth-child(3){animation-delay:80ms}.suggest-item:nth-child(4){animation-delay:120ms}.suggest-item:nth-child(5){animation-delay:160ms}.suggest-item:nth-child(6){animation-delay:200ms}.suggest-item:nth-child(7){animation-delay:240ms}.suggest-item:nth-child(8){animation-delay:280ms}.suggest-item:nth-child(9){animation-delay:320ms}.suggest-item:nth-child(10){animation-delay:360ms}`,
        `.suggest-item{padding:10px 24px;font-size:13px;font-weight:600;cursor:pointer;border-radius:999px;background:linear-gradient(135deg,var(--nib),var(--nbt));color:var(--ntm);border:1px solid var(--nbd);backdrop-filter:var(--ng);transition:0.25s var(--sp);font-family:var(--nf);transform:translateZ(0);opacity:0;animation:si 0.4s var(--sp) forwards;box-shadow:0 2px 8px rgba(0,0,0,0.08);letter-spacing:0.3px}`,
        `.suggest-item:hover,.suggest-item.kb-focus{background:linear-gradient(135deg,var(--na),var(--na));color:var(--noa);border-color:var(--na);box-shadow:0 8px 25px var(--nag),0 0 15px var(--nag);transform:translateY(-4px) scale(1.02);text-shadow:0 0 8px var(--noa),0 0 20px var(--noa)}`,
        `.suggest-divider{width:100%;display:flex;align-items:center;gap:8px;padding:0 4px;opacity:0;animation:si 0.3s var(--sp) forwards}`,
        `.suggest-divider-line{flex:1;height:1px;background:rgba(255,255,255,0.25)}`,
        `.suggest-divider-label{font-size:10px;font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,0.55);text-transform:uppercase;white-space:nowrap}`,
        `.history-item{padding:10px 20px 10px 16px;font-size:13px;font-weight:600;cursor:pointer;border-radius:999px;background:linear-gradient(135deg,var(--nib),var(--nbt));color:var(--ntd);border:1px solid var(--nbd);backdrop-filter:var(--ng);transition:0.25s var(--sp);font-family:var(--nf);transform:translateZ(0);opacity:0;animation:si 0.4s var(--sp) forwards;box-shadow:0 2px 8px rgba(0,0,0,0.06);letter-spacing:0.3px;display:flex;align-items:center;gap:8px;position:relative}`,
        `.history-item:hover,.history-item.kb-focus{background:linear-gradient(135deg,var(--na),var(--na));color:var(--noa);border-color:var(--na);box-shadow:0 8px 25px var(--nag),0 0 15px var(--nag);transform:translateY(-4px) scale(1.02);text-shadow:0 0 8px var(--noa),0 0 20px var(--noa)}`,
        `.history-icon{font-size:12px;opacity:0.5;flex-shrink:0;transition:0.25s}`,
        `.history-item:hover .history-icon{opacity:1}`,
        `.history-del{margin-left:4px;width:16px;height:16px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:10px;opacity:0;transition:0.2s var(--sp);flex-shrink:0;color:inherit}`,
        `.history-item:hover .history-del{opacity:0.6}`,
        `.history-del:hover{opacity:1 !important;background:rgba(255,71,87,0.25);color:#ff4757}`,
        `.settings-btn{width:45px;height:45px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ntm);transition:0.5s var(--sp);border-radius:50%;opacity:0.5}`,
        `.settings-btn:hover{opacity:1;background:var(--nag);color:var(--na);transform:rotate(90deg);box-shadow:0 0 15px var(--nag),0 0 30px var(--nag)}`,
    ].join('');

    // =========================================================================
    // 八、HistoryModule（搜索历史管理）
    // =========================================================================

    const HistoryModule = {
        get() {
            try { return GM_getValue(HISTORY_KEY, []); } catch (e) { return []; }
        },
        push(term) {
            if (!term?.trim()) return;
            const trimmed = term.trim();
            let hist = this.get().filter(h => h !== trimmed);
            hist.unshift(trimmed);
            if (hist.length > HISTORY_MAX) hist = hist.slice(0, HISTORY_MAX);
            GM_setValue(HISTORY_KEY, hist);
        },
        remove(term) {
            GM_setValue(HISTORY_KEY, this.get().filter(h => h !== term));
        },
    };

    // =========================================================================
    // 九、SuggestModule（多源建议 + 缓存 + 键盘导航）
    // =========================================================================

    const SuggestModule = {
        _cache: new Map(),
        _CACHE_MAX: 100,
        _CACHE_TTL: 5 * 60 * 1000,
        _sources: { google: true, baidu: false, duckduckgo: true },
        _initialized: false,
        _requestToken: 0,      // 取消过期请求
        _focusedIndex: -1,
        _navItems: [],         // 当前可导航的词条列表

        // ── 缓存 ──────────────────────────────────────────────────────────────

        _cacheGet(key) {
            const item = this._cache.get(key);
            if (!item) return null;
            if (Date.now() - item.ts > this._CACHE_TTL) { this._cache.delete(key); return null; }
            return item.value;
        },

        _cacheSet(key, value) {
            if (this._cache.size >= this._CACHE_MAX) {
                this._cache.delete(this._cache.keys().next().value);
            }
            this._cache.set(key, { value, ts: Date.now() });
        },

        // ── 可访问性探测（初始化时一次性检测）────────────────────────────────

        initAccessibility() {
            if (this._initialized) return;
            this._initialized = true;
            const probe = (source, url) => new Promise(resolve => {
                GM_xmlhttpRequest({
                    method: 'GET', url, timeout: 2000,
                    onload:    () => { this._sources[source] = true;  resolve(); },
                    onerror:   () => { this._sources[source] = false; resolve(); },
                    ontimeout: () => { this._sources[source] = false; resolve(); },
                });
            });
            Promise.all([
                probe('google', 'https://suggestqueries.google.com/complete/search?client=chrome&q=a'),
                probe('baidu',  'https://suggestion.baidu.com/su?wd=a'),
            ]).catch(() => {});
        },

        // ── 底层 GM_xmlhttpRequest 封装 ──────────────────────────────────────

        _gmFetch(url, parser) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET', url, timeout: 4000,
                    onload:    r => { try { resolve(parser(r.responseText)); } catch (e) { reject(new Error('parse')); } },
                    onerror:   () => reject(new Error('network')),
                    ontimeout: () => reject(new Error('timeout')),
                });
            });
        },

        _fetchGoogle(q) {
            return this._gmFetch(
                `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}`,
                text => { const d = JSON.parse(text); return Array.isArray(d?.[1]) ? d[1].slice(0, 8) : []; }
            );
        },

        _fetchBaidu(q) {
            return this._gmFetch(
                `https://suggestion.baidu.com/su?wd=${encodeURIComponent(q)}`,
                text => { const d = JSON.parse(text); return Array.isArray(d?.s) ? d.s.slice(0, 8) : []; }
            );
        },

        _fetchDuckDuckGo(q) {
            return this._gmFetch(
                `https://ac.duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`,
                text => {
                    if (!text.startsWith('[')) return [];
                    const d = JSON.parse(text);
                    return Array.isArray(d)
                        ? d.slice(0, 8).map(i => (typeof i === 'string' ? i : i?.phrase) ?? '').filter(Boolean)
                        : [];
                }
            );
        },

        // ── 多源瀑布（Google → Baidu → DuckDuckGo）──────────────────────────

        async _fetchFromSources(q) {
            const cached = this._cacheGet(q);
            if (cached) return cached;

            const trySource = async (name, fetcher) => {
                if (!this._sources[name]) return [];
                try {
                    const results = await fetcher(q);
                    if (results.length > 0) this._cacheSet(q, results);
                    return results;
                } catch (e) {
                    if (name === 'google') this._sources.google = false;
                    return [];
                }
            };

            const google = await trySource('google', q => this._fetchGoogle(q));
            if (google.length > 0) return google;
            const baidu = await trySource('baidu', q => this._fetchBaidu(q));
            if (baidu.length > 0) return baidu;
            return trySource('duckduckgo', q => this._fetchDuckDuckGo(q));
        },

        // ── 公开接口：获取建议并渲染 ─────────────────────────────────────────

        async fetch(query, box, mask, engineUrl) {
            const token = ++this._requestToken;
            const q = query.trim();

            if (!q) {
                this._render(box, mask, engineUrl, HistoryModule.get(), []);
                return;
            }

            const matchedHistory = HistoryModule.get()
                .filter(h => h.toLowerCase().startsWith(q.toLowerCase()))
                .slice(0, 5);

            this._render(box, mask, engineUrl, matchedHistory, [], true);

            try {
                const suggests = await this._fetchFromSources(q);
                if (token !== this._requestToken) return; // 请求已过期，丢弃
                const deduped = suggests.filter(s => !matchedHistory.includes(s));
                this._render(box, mask, engineUrl, matchedHistory, deduped);
            } catch (e) {
                if (token !== this._requestToken) return;
                this._render(box, mask, engineUrl, matchedHistory, []);
            }
        },

        // ── 渲染（使用 textContent 插入词条，完全无 XSS 风险）────────────────

        _render(box, mask, engineUrl, history, suggests, keepOpen = false) {
            if (history.length === 0 && suggests.length === 0) {
                if (!keepOpen) { box.classList.remove('show'); mask.classList.remove('show'); }
                return;
            }

            box.innerHTML = '';
            this._navItems = [];
            this._focusedIndex = -1;
            let delay = 0;
            const STEP = 40;

            const makeDivider = (label) => {
                const wrap = document.createElement('div');
                wrap.className = 'suggest-divider';
                wrap.style.animationDelay = delay + 'ms';
                const line = () => { const l = document.createElement('div'); l.className = 'suggest-divider-line'; return l; };
                const lbl = document.createElement('span');
                lbl.className = 'suggest-divider-label';
                lbl.textContent = label; // safe
                wrap.append(line(), lbl, line());
                return wrap;
            };

            if (history.length > 0) {
                if (suggests.length > 0) { box.appendChild(makeDivider(t('labelRecent'))); delay += STEP; }
                history.forEach(term => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.style.animationDelay = delay + 'ms';

                    const icon = document.createElement('span'); icon.className = 'history-icon'; icon.textContent = '🕐';
                    const text = document.createElement('span'); text.className = 'history-text'; text.textContent = term;
                    const del  = document.createElement('span'); del.className  = 'history-del';  del.textContent = '✕'; del.title = t('btnRemoveHistory');

                    text.onclick = e => { e.stopPropagation(); HistoryModule.push(term); location.href = engineUrl.replace('%s', encodeURIComponent(term)); };
                    del.onclick  = e => {
                        e.stopPropagation();
                        HistoryModule.remove(term);
                        item.style.transition = '0.2s';
                        item.style.opacity = '0';
                        item.style.transform = 'scale(0.85)';
                        setTimeout(() => { item.remove(); this._navItems = this._navItems.filter(x => x.el !== item); }, 200);
                    };

                    item.append(icon, text, del);
                    box.appendChild(item);
                    this._navItems.push({ el: item, term });
                    delay += STEP;
                });
            }

            if (suggests.length > 0) {
                if (history.length > 0) { box.appendChild(makeDivider(t('labelSuggestions'))); delay += STEP; }
                suggests.forEach(term => {
                    const item = document.createElement('div');
                    item.className = 'suggest-item';
                    item.style.animationDelay = delay + 'ms';
                    item.textContent = term; // safe
                    item.onclick = e => { e.stopPropagation(); HistoryModule.push(term); location.href = engineUrl.replace('%s', encodeURIComponent(term)); };
                    box.appendChild(item);
                    this._navItems.push({ el: item, term });
                    delay += STEP;
                });
            }

            mask.classList.add('show');
            box.classList.add('show');
        },

        // ── 键盘导航（↑↓ 选择，Enter 跳转，Escape 关闭）────────────────────

        /**
         * 处理键盘事件，返回 true 表示已消费该按键
         * @param {KeyboardEvent} e
         * @param {HTMLElement} box
         * @param {HTMLElement} mask
         * @param {string} engineUrl
         * @returns {boolean}
         */
        handleKeyNav(e, box, mask, engineUrl) {
            const items = this._navItems;
            if (!box.classList.contains('show') || items.length === 0) return false;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this._moveFocus(1, items);
                return true;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this._moveFocus(-1, items);
                return true;
            }
            if (e.key === 'Enter' && this._focusedIndex >= 0) {
                e.preventDefault();
                const { term } = items[this._focusedIndex];
                HistoryModule.push(term);
                location.href = engineUrl.replace('%s', encodeURIComponent(term));
                return true;
            }
            if (e.key === 'Escape') {
                box.classList.remove('show');
                mask.classList.remove('show');
                box.innerHTML = '';
                this._navItems = [];
                this._focusedIndex = -1;
                return true;
            }
            return false;
        },

        _moveFocus(dir, items) {
            if (this._focusedIndex >= 0) items[this._focusedIndex].el.classList.remove('kb-focus');
            const next = this._focusedIndex + dir;
            this._focusedIndex = Math.max(-1, Math.min(items.length - 1, next));
            if (this._focusedIndex >= 0) {
                items[this._focusedIndex].el.classList.add('kb-focus');
                items[this._focusedIndex].el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        },

        clearNav() {
            this._navItems = [];
            this._focusedIndex = -1;
        },
    };

    /** 防抖版建议请求：300ms 内连续输入只触发最后一次 */
    const fetchSuggestions = debounce(
        (query, box, mask, engineUrl) => SuggestModule.fetch(query, box, mask, engineUrl),
        300
    );

    // =========================================================================
    // 十、主初始化
    // =========================================================================

    function init() {
        SettingsManager.load();
        StyleEngine.init();
        SuggestModule.initAccessibility();

        // ── 10.1 创建设置面板 & 遮罩（注入到页面 DOM）──────────────────────

        const mask  = document.createElement('div');
        const panel = document.createElement('div');
        mask.className  = 'neo-mask';
        panel.className = 'neo-panel';
        document.body.append(mask, panel);

        // ── 10.2 创建工具栏（Shadow DOM 隔离）──────────────────────────────

        const host        = document.createElement('div');
        const shadowRoot  = host.attachShadow({ mode: 'open' });
        const shadowStyle = document.createElement('style');
        const wrapper     = document.createElement('div');
        const toolbar     = document.createElement('div');
        const suggestBox  = document.createElement('div');

        wrapper.className    = 'wrapper';
        toolbar.className    = 'toolbar';
        suggestBox.className = 'suggest-box';

        shadowRoot.append(shadowStyle, suggestBox, wrapper);
        wrapper.append(toolbar);
        document.body.append(host);

        // ── 10.3 EventBus 订阅 ──────────────────────────────────────────────

        EventBus.on('settings:changed', () => {
            StyleEngine.update();
            shadowStyle.textContent = buildCSSVariables(SettingsManager.current) + TOOLBAR_CSS;
        });
        EventBus.on('settings:engines:changed', () => {
            renderToolbar();
        });

        // ── 10.4 渲染工具栏 ─────────────────────────────────────────────────

        function renderToolbar() {
            const s = SettingsManager.current;
            toolbar.innerHTML = '';

            // 齿轮按钮（修正 SVG path）
            const settingsBtn = document.createElement('div');
            settingsBtn.className = 'settings-btn';
            settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.3 7.3 0 0 0-1.62-.94l-.36-2.54A.484.484 0 0 0 14 3h-4c-.24 0-.43.17-.47.41l-.36 2.54a7.4 7.4 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.65 9.47a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54a7.4 7.4 0 0 0 1.62-.94l2.39.96a.48.48 0 0 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`;
            settingsBtn.onclick = () => {
                // 重新同步 storage（防止多标签页状态不一致）
                const fresh = GM_getValue(STORAGE_KEY, null);
                if (fresh) Object.assign(SettingsManager.current, fresh);
                mask.classList.add('show');
                panel.classList.add('show');
                wrapper.classList.add('pinned');
                toolbar.classList.add('pinned');
                renderPanel();
            };
            toolbar.append(settingsBtn);

            const currentQuery = extractPageQuery();
            const enabled = s.en.filter(e => e.enabled);
            const sorted  = [
                ...enabled.filter(e =>  hostMatches(location.hostname, e.host)),
                ...enabled.filter(e => !hostMatches(location.hostname, e.host)),
            ];

            sorted.forEach(eng => {
                const btn = document.createElement('div');
                btn.className = 'engine-btn';
                if (hostMatches(location.hostname, eng.host)) btn.classList.add('active');

                // 图标：安全插入（sanitize SVG / img for base64）
                const iconSpan = document.createElement('span');
                iconSpan.className = 'btn-icon';
                const rawIcon = eng.icon || makeDefaultIcon(eng.name);
                if (rawIcon.startsWith('data:image/svg+xml;base64,')) {
                    const img = document.createElement('img');
                    img.src = rawIcon;
                    img.style.cssText = 'width:16px;height:16px';
                    iconSpan.appendChild(img);
                } else {
                    const safe = SecurityUtils.sanitizeSvg(rawIcon);
                    if (safe) iconSpan.innerHTML = safe;
                }

                const labelSpan = document.createElement('span');
                labelSpan.className = 'btn-label';
                labelSpan.textContent = eng.name; // safe: textContent

                btn.append(iconSpan, labelSpan);

                if (hostMatches(location.hostname, eng.host)) {
                    // 当前引擎：高亮 + 搜索框
                    const inputContainer = document.createElement('div');
                    inputContainer.className = 'input-container';
                    const input = document.createElement('input');
                    input.className = 'search-input';
                    input.value = currentQuery;
                    input.setAttribute('aria-label', 'Search');

                    input.onfocus = () => {
                        wrapper.classList.add('active', 'pinned');
                        toolbar.classList.add('focused', 'pinned');
                        mask.classList.add('show');
                        suggestBox.classList.add('show');
                        fetchSuggestions(input.value, suggestBox, mask, eng.url);
                    };
                    input.onblur = () => {
                        toolbar.classList.remove('focused');
                        if (!suggestBox.classList.contains('show') && !panel.classList.contains('show')) {
                            wrapper.classList.remove('pinned');
                            toolbar.classList.remove('pinned');
                        }
                    };
                    input.oninput = () => {
                        mask.classList.add('show');
                        suggestBox.classList.add('show');
                        fetchSuggestions(input.value, suggestBox, mask, eng.url);
                    };
                    input.onkeydown = (e) => {
                        // 先走键盘导航，消费后不执行搜索跳转
                        if (SuggestModule.handleKeyNav(e, suggestBox, mask, eng.url)) return;
                        if (e.key === 'Enter' && input.value.trim()) {
                            HistoryModule.push(input.value.trim());
                            location.href = eng.url.replace('%s', encodeURIComponent(input.value));
                        }
                    };

                    inputContainer.append(input);
                    toolbar.append(btn, inputContainer);
                } else {
                    // 其他引擎：点击携带当前词跳转
                    btn.onclick = () => {
                        const q = shadowRoot.querySelector('.search-input')?.value || currentQuery;
                        location.href = eng.url.replace('%s', encodeURIComponent(q));
                    };
                    toolbar.append(btn);
                }
            });
        }

        // ── 10.5 渲染设置面板 ────────────────────────────────────────────────

        let editingEngine = null;

        function renderPanel() {
            const s = SettingsManager.current;

            // 主题按钮
            const themeButtons = Object.keys(THEMES).map(key => {
                const active = s.b.toUpperCase() === THEMES[key].b.toUpperCase();
                return `<button class="neo-theme-btn${active ? ' active' : ''}" data-action="theme" data-key="${key}">${SecurityUtils.escapeHtml(THEMES[key].n[s.lang] ?? THEMES[key].n.en)}</button>`;
            }).join('');

            // 引擎行（name/host 全部过 escapeHtml，icon 过 sanitizeSvg）
            const engineRows = s.en.map((eng, i) => {
                const iconHtml = (() => {
                    if (!eng.icon) return makeDefaultIcon(eng.name).replace(/width="16"/g, 'width="18"').replace(/height="16"/g, 'height="18"');
                    if (eng.icon.startsWith('data:image/svg+xml;base64,')) return `<img src="${escAttr(eng.icon)}" style="width:18px;height:18px">`;
                    const safe = SecurityUtils.sanitizeSvg(eng.icon);
                    return safe
                        ? safe.replace(/width="16"/g, 'width="18"').replace(/height="16"/g, 'height="18"')
                        : makeDefaultIcon(eng.name).replace(/width="16"/g, 'width="18"').replace(/height="16"/g, 'height="18"');
                })();
                return `
                    <div class="neo-engine-row" draggable="true" data-i="${i}">
                        <div style="cursor:grab;opacity:0.3">☰</div>
                        <div style="width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--ntm);opacity:0.8">${iconHtml}</div>
                        <div class="neo-switch ${eng.enabled ? 'on' : ''}" data-action="toggle-engine" data-i="${i}"></div>
                        <div style="flex:1">
                            <div style="font-size:13px;font-weight:700">${SecurityUtils.escapeHtml(eng.name)}</div>
                            <div class="neo-engine-host">${SecurityUtils.escapeHtml(eng.host)}</div>
                        </div>
                        <div data-action="edit-engine" data-i="${i}" style="cursor:pointer">✎</div>
                        <div data-action="delete-engine" data-i="${i}" style="color:#ff6b6b;cursor:pointer">✕</div>
                    </div>`;
            }).join('');

            // 色板
            const bgColors = ['#FFFFFF','#F5F5F7','#F9F3E9','#F0EEF8','#E8F0FE','#E8F5E9','#FFF8E1','#1A1A2E','#0D0D1A','#0F1A12','#1A0A0A','#12121F'];
            const acColors = ['#1D1D1F','#2C2C3E','#6B4C3B','#8E6D5A','#007AFF','#5856D6','#FF2D55','#FF9500','#34C759','#00D4FF','#89D4A0','#FFD60A'];
            const mkSwatches = (colors, target, currentVal) =>
                colors.map(c => `<div class="neo-swatch${currentVal===c?' selected':''}" data-action="swatch" data-color="${c}" data-target="${target}" style="background:${c}" title="${c}"></div>`).join('');

            panel.innerHTML = `
                <div style="text-align:center;font-weight:900;letter-spacing:4px;margin-bottom:24px;color:var(--na);font-size:20px;text-shadow:0 0 10px var(--na),0 0 25px var(--na),0 0 50px var(--na)">
                    ${t('panelTitle')}
                </div>
                <div class="neo-scroll">

                    <div class="neo-card">
                        <span class="neo-card-title">${t('cardLanguage')}</span>
                        <div style="display:flex;gap:8px">
                            <button class="neo-theme-btn ${s.lang==='en'?'active':''}" data-action="lang" data-lang="en">English</button>
                            <button class="neo-theme-btn ${s.lang==='zh'?'active':''}" data-action="lang" data-lang="zh">中文</button>
                        </div>
                    </div>

                    <div class="neo-card">
                        <span class="neo-card-title">${t('cardTheme')}</span>
                        <div style="display:flex;gap:8px">${themeButtons}</div>
                    </div>

                    <div class="neo-card">
                        <span class="neo-card-title">${t('cardVisual')}</span>
                        <div class="neo-label">${t('labelOffset')} <b>${s.bt}px</b></div>
                        <input type="range" id="s-bt" min="0" max="300" value="${s.bt}">
                        <div class="neo-label" style="margin-top:12px">${t('labelFontSize')} <b>${s.fs}px</b></div>
                        <input type="range" id="s-fs" min="10" max="24" value="${s.fs}">
                        <div style="display:flex;gap:20px;margin-top:20px">
                            <div style="flex:1">
                                <div class="neo-label">${t('labelPanelRadius')} <b>${s.r}px</b></div>
                                <input type="range" id="s-r" min="0" max="60" value="${s.r}">
                            </div>
                            <div style="flex:1">
                                <div class="neo-label">${t('labelWidgetRadius')} <b>${s.ir}px</b></div>
                                <input type="range" id="s-ir" min="0" max="40" value="${s.ir}">
                            </div>
                        </div>
                        <div style="display:flex;gap:20px;margin-top:20px">
                            <div style="flex:1">
                                <div class="neo-label">${t('labelToolbarAlpha')} <b>${s.ta}%</b></div>
                                <input type="range" id="s-ta" min="5" max="100" value="${s.ta}">
                            </div>
                            <div style="flex:1">
                                <div class="neo-label">${t('labelPanelAlpha')} <b>${s.pa}%</b></div>
                                <input type="range" id="s-pa" min="5" max="100" value="${s.pa}">
                            </div>
                        </div>
                        <div style="margin-top:20px">
                            <div class="neo-label">${t('labelBgColor')}</div>
                            <div class="neo-swatch-row">
                                ${mkSwatches(bgColors, 'b', s.b)}
                                <div class="neo-swatch-custom" title="${t('btnCustomColor')}"><input type="color" id="s-bc" value="${escAttr(s.b)}"></div>
                            </div>
                        </div>
                        <div style="margin-top:16px">
                            <div class="neo-label">${t('labelAccentColor')}</div>
                            <div class="neo-swatch-row">
                                ${mkSwatches(acColors, 'a', s.a)}
                                <div class="neo-swatch-custom" title="${t('btnCustomColor')}"><input type="color" id="s-ac" value="${escAttr(s.a)}"></div>
                            </div>
                        </div>
                        <div style="margin-top:20px">
                            <div class="neo-label">${t('labelFont')}</div>
                            <input type="text" id="s-font" class="neo-edit-input"
                                value="${escAttr(s.font)}"
                                placeholder="${escAttr(t('labelFontHint'))}"
                                style="margin-bottom:0">
                        </div>
                    </div>

                    <div class="neo-card">
                        <span class="neo-card-title">${t('cardInteraction')}</span>
                        <div class="neo-label">${t('labelAutoFade')} <div class="neo-switch ${s.ah?'on':''}" data-action="toggle-ah"></div></div>
                    </div>

                    <div class="neo-card">
                        <span class="neo-card-title">${t('cardSearch')}</span>
                        <div class="neo-label">
                            <span>${t('labelNewTab')}</span>
                            <div class="neo-switch ${s.searchBehavior.openInNewTab?'on':''}" data-action="toggle-newtab"></div>
                        </div>
                        <div class="neo-field-hint">${t('hintNewTab')}</div>
                    </div>

                    <div class="neo-card">
                        <span class="neo-card-title">${t('cardEngines')}</span>
                        <div class="n-list">${engineRows}</div>
                        <button data-action="add-engine" class="neo-btn-main"
                            style="width:100%;background:var(--nib);color:var(--ntm);border:1px solid var(--nbd);font-size:11px;margin-top:15px;box-shadow:none;font-weight:600">
                            ${t('btnAddEngine')}
                        </button>
                    </div>

                    <div class="neo-card">
                        <span class="neo-card-title">${t('cardData')}</span>
                        <div style="display:flex;gap:10px">
                            <button data-action="export" class="neo-btn-main"
                                style="flex:1;background:var(--nib);color:var(--ntm);border:1px solid var(--nbd);font-size:11px;box-shadow:none;font-weight:600">
                                ${t('btnExport')}
                            </button>
                            <label style="flex:1;display:block">
                                <span class="neo-btn-main"
                                    style="display:block;text-align:center;background:var(--nib);color:var(--ntm);border:1px solid var(--nbd);font-size:11px;box-shadow:none;font-weight:600;cursor:pointer">
                                    ${t('btnImport')}
                                </span>
                                <input type="file" id="s-import" accept=".json" style="display:none">
                            </label>
                        </div>
                    </div>

                </div>
                <div class="neo-footer">
                    <button data-action="apply" class="neo-btn-main" style="flex:2">${t('btnApply')}</button>
                    <button data-action="reset"  class="neo-btn-main" style="flex:1;background:var(--nib);color:#ff4757;border:1px solid var(--nbd);box-shadow:none;font-weight:600;text-shadow:0 0 6px rgba(255,71,87,0.6),0 0 16px rgba(255,71,87,0.3)">${t('btnReset')}</button>
                </div>

                <div class="neo-sub-panel" id="n-sub">
                    <div class="neo-sub-scroll">
                        <h3 id="sub-title" style="color:var(--na);margin:0 0 20px;font-size:16px;font-weight:900;letter-spacing:2px"></h3>
                        <div class="neo-label">${t('labelName')}</div>
                        <input type="text" id="e-n" class="neo-edit-input">
                        <div class="neo-field-hint">
                            ${t('hintNameDesc')}<br>
                            <span class="neo-field-ex" data-field-copy="${escAttr(t('hintNameEx'))}">
                                <span class="ex-icon">⎘</span>${t('hintNameEx')}
                            </span>
                        </div>
                        <div class="neo-label">${t('labelIcon')}</div>
                        <div class="neo-icon-row">
                            <textarea id="e-icon" class="neo-icon-textarea" placeholder="${escAttr(t('hintIconEx1'))}"></textarea>
                            <div class="neo-icon-preview" id="e-icon-preview" title="${escAttr(t('labelIconPreview'))}">—</div>
                        </div>
                        <div class="neo-field-hint" style="margin-top:6px">
                            ${t('hintIconDesc')}<br><br>
                            <span style="font-size:10px;font-weight:700;color:var(--ntd)">${t('hintIconFmt1')}</span><br>
                            <span class="neo-field-ex" data-field-copy="${escAttr(t('hintIconEx1'))}"><span class="ex-icon">⎘</span>${t('hintIconEx1')}</span><br>
                            <span style="font-size:10px;font-weight:700;color:var(--ntd);margin-top:6px;display:inline-block">${t('hintIconFmt2')}</span><br>
                            <span class="neo-field-ex" data-field-copy="${escAttr(t('hintIconEx2'))}"><span class="ex-icon">⎘</span>${t('hintIconEx2')}</span>
                        </div>
                        <div class="neo-icon-error" id="e-icon-error">${t('hintIconErr')}</div>
                        <div class="neo-label">${t('labelUrl')}</div>
                        <input type="text" id="e-u" class="neo-edit-input">
                        <div class="neo-field-hint">
                            ${t('hintUrlDesc')}<br>
                            <span class="neo-field-ex" data-field-copy="${escAttr(t('hintUrlEx'))}"><span class="ex-icon">⎘</span>${t('hintUrlEx')}</span>
                        </div>
                        <div class="neo-label">${t('labelHost')}</div>
                        <input type="text" id="e-h" class="neo-edit-input">
                        <div class="neo-field-hint">
                            ${t('hintHostDesc')}<br>
                            <span class="neo-field-ex" data-field-copy="${escAttr(t('hintHostEx'))}"><span class="ex-icon">⎘</span>${t('hintHostEx')}</span>
                            <div class="neo-field-tip">${t('hintHostTip')}</div>
                        </div>
                    </div>
                    <div style="padding:16px 30px;border-top:1px solid var(--nbd);display:flex;gap:15px;flex-shrink:0">
                        <button data-action="confirm-engine" class="neo-btn-main" style="flex:1">${t('btnConfirm')}</button>
                        <button data-action="cancel-engine"  class="neo-btn-main" style="flex:1;background:var(--nib);color:var(--ntm);border:1px solid var(--nbd);box-shadow:none;font-weight:600">${t('btnCancel')}</button>
                    </div>
                </div>`;

            bindPanelInputs();
        }

        // ── 10.6 面板事件绑定 ──────────────────────────────────────────────────
        //
        // 策略：
        //   • 点击动作 → 事件委托（panel 上 1 个监听器，通过 data-action 分发）
        //   • range/color/text 输入 → 每次渲染后重新绑定（元素已重建）
        //   • 委托监听器在 init() 中注册一次，永不重复添加

        // 事件委托主监听器（在 init() 中只注册一次）
        panel.addEventListener('click', function onPanelClick(e) {
            const s = SettingsManager.current;
            const el = e.target.closest('[data-action]');
            if (!el) return;

            switch (el.dataset.action) {

                case 'swatch': {
                    const { color, target } = el.dataset;
                    s[target] = color;
                    panel.querySelectorAll(`.neo-swatch[data-target="${target}"]`).forEach(sw => sw.classList.remove('selected'));
                    el.classList.add('selected');
                    const picker = panel.querySelector(target === 'b' ? '#s-bc' : '#s-ac');
                    if (picker) picker.value = color;
                    SettingsManager.save();
                    applyStyles();
                    break;
                }

                case 'toggle-ah': {
                    s.ah = !s.ah;
                    SettingsManager.save();
                    applyStyles();
                    renderPanel();
                    break;
                }

                case 'toggle-newtab': {
                    s.searchBehavior.openInNewTab = !s.searchBehavior.openInNewTab;
                    SettingsManager.save();
                    renderPanel();
                    break;
                }

                case 'toggle-engine': {
                    const idx = parseInt(el.dataset.i);
                    if (idx >= 0 && idx < s.en.length) {
                        s.en[idx].enabled = !s.en[idx].enabled;
                        SettingsManager.save();
                        applyStyles();
                        renderPanel();
                    }
                    break;
                }

                case 'delete-engine': {
                    const idx = parseInt(el.dataset.i);
                    if (idx >= 0 && idx < s.en.length && confirm(t('confirmDeleteEngine'))) {
                        SettingsManager.removeEngine(s.en[idx]);
                        applyStyles();
                        renderPanel();
                    }
                    break;
                }

                case 'edit-engine': {
                    const idx = parseInt(el.dataset.i);
                    if (idx >= 0 && idx < s.en.length) {
                        editingEngine = s.en[idx];
                        const subPanel = panel.querySelector('#n-sub');
                        panel.querySelector('#sub-title').textContent = t('subPanelTitle');
                        panel.querySelector('#e-n').value    = editingEngine.name;
                        panel.querySelector('#e-u').value    = editingEngine.url;
                        panel.querySelector('#e-h').value    = editingEngine.host;
                        const iconVal = editingEngine.icon && !BUILTIN_HOSTS.has(editingEngine.host) ? editingEngine.icon : '';
                        panel.querySelector('#e-icon').value = iconVal;
                        updateIconPreview(iconVal, panel.querySelector('#e-icon-preview'));
                        subPanel.classList.add('show');
                    }
                    break;
                }

                case 'add-engine': {
                    editingEngine = null;
                    const subPanel = panel.querySelector('#n-sub');
                    panel.querySelector('#sub-title').textContent = t('subPanelTitleAdd');
                    ['#e-n','#e-u','#e-h','#e-icon'].forEach(sel => { if (panel.querySelector(sel)) panel.querySelector(sel).value = ''; });
                    updateIconPreview('', panel.querySelector('#e-icon-preview'));
                    subPanel.classList.add('show');
                    break;
                }

                case 'confirm-engine': {
                    const name    = panel.querySelector('#e-n').value.trim();
                    const url     = panel.querySelector('#e-u').value.trim();
                    const host    = panel.querySelector('#e-h').value.trim();
                    const iconRaw = panel.querySelector('#e-icon').value.trim();
                    const errorEl = panel.querySelector('#e-icon-error');
                    if (!name || !url) return;

                    const iconResult = SecurityUtils.validateIcon(iconRaw);
                    if (iconRaw && !iconResult.valid) { errorEl.classList.add('show'); return; }
                    errorEl.classList.remove('show');
                    const icon = (iconResult.valid && iconResult.type !== 'default') ? iconResult.value : undefined;

                    if (!editingEngine) {
                        SettingsManager.addEngine({ name, url, host, enabled: true, ...(icon ? { icon } : {}) });
                    } else {
                        const patch = { name, url, host };
                        if (icon) patch.icon = icon; else delete editingEngine.icon;
                        SettingsManager.updateEngine(editingEngine, patch);
                    }

                    panel.querySelector('#n-sub').classList.remove('show');
                    editingEngine = null;
                    applyStyles();
                    renderPanel();
                    break;
                }

                case 'cancel-engine': {
                    panel.querySelector('#n-sub').classList.remove('show');
                    editingEngine = null;
                    break;
                }

                case 'theme': {
                    const theme = THEMES[el.dataset.key];
                    if (theme) {
                        SettingsManager.update({ ...theme });
                        applyStyles();
                        renderPanel();
                    }
                    break;
                }

                case 'lang': {
                    SettingsManager.update({ lang: el.dataset.lang });
                    renderPanel();
                    break;
                }

                case 'apply': {
                    SettingsManager.save();
                    location.reload();
                    break;
                }

                case 'reset': {
                    if (confirm(t('confirmReset'))) {
                        SettingsManager.reset();
                        location.reload();
                    }
                    break;
                }

                case 'export': {
                    const blob = new Blob([SettingsManager.exportJSON()], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'ffa-omnibar-settings.json';
                    a.click();
                    URL.revokeObjectURL(a.href);
                    break;
                }
            }
        });

        /**
         * 绑定 range/color/text 输入类控件（每次 renderPanel 调用一次）
         * 这些控件在 innerHTML 替换后被重新创建，必须重新绑定
         */
        function bindPanelInputs() {
            const s = SettingsManager.current;

            // Range 滑块：只更新 CSS 变量 + 标签数值，不重建 DOM
            const bindRange = (id, key, suffix = 'px') => {
                const el = panel.querySelector(`#${id}`);
                if (!el) return;
                const labelEl = el.previousElementSibling?.querySelector('b');
                el.oninput = e => {
                    s[key] = +e.target.value;
                    if (labelEl) labelEl.textContent = s[key] + suffix;
                    SettingsManager.save();
                    applyStyles();
                };
            };
            bindRange('s-bt', 'bt');
            bindRange('s-fs', 'fs');
            bindRange('s-ta', 'ta', '%');
            bindRange('s-pa', 'pa', '%');
            bindRange('s-r',  'r');
            bindRange('s-ir', 'ir');

            // 自定义颜色拾色器
            panel.querySelector('#s-bc').oninput = e => {
                s.b = e.target.value;
                panel.querySelectorAll('.neo-swatch[data-target="b"]').forEach(sw => sw.classList.remove('selected'));
                SettingsManager.save();
                applyStyles();
            };
            panel.querySelector('#s-ac').oninput = e => {
                s.a = e.target.value;
                panel.querySelectorAll('.neo-swatch[data-target="a"]').forEach(sw => sw.classList.remove('selected'));
                SettingsManager.save();
                applyStyles();
            };

            // 字体输入
            panel.querySelector('#s-font').oninput = e => {
                s.font = e.target.value;
                SettingsManager.save();
                applyStyles();
            };

            // 图标实时预览
            const iconInput = panel.querySelector('#e-icon');
            if (iconInput) {
                iconInput.oninput = () => {
                    panel.querySelector('#e-icon-error')?.classList.remove('show');
                    updateIconPreview(iconInput.value.trim(), panel.querySelector('#e-icon-preview'));
                };
            }

            // 示例芯片点击复制到输入框
            panel.querySelectorAll('[data-field-copy]').forEach(chip => {
                chip.onclick = e => {
                    e.stopPropagation();
                    const hint  = chip.closest('.neo-field-hint');
                    const label = hint?.previousElementSibling;
                    const input = label?.previousElementSibling;
                    if (input?.tagName === 'INPUT' && !input.value.trim()) {
                        input.value = chip.dataset.fieldCopy;
                        input.focus();
                        const origHTML = chip.innerHTML;
                        chip.textContent = t('btnCopied');
                        setTimeout(() => chip.innerHTML = origHTML, 1200);
                    }
                };
            });

            // 设置导入
            const importInput = panel.querySelector('#s-import');
            if (importInput) {
                importInput.onchange = e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                        if (SettingsManager.importJSON(ev.target.result)) {
                            applyStyles();
                            renderPanel();
                        } else {
                            alert(t('importFail'));
                        }
                    };
                    reader.readAsText(file);
                    importInput.value = ''; // 允许重复导入同一文件
                };
            }

            // ── 引擎列表拖拽排序 ──────────────────────────────────────────────
            const list = panel.querySelector('.n-list');
            if (!list) return;
            let draggingEngine = null;

            list.ondragstart = e => {
                const row = e.target.closest('.neo-engine-row');
                if (!row) return;
                const idx = parseInt(row.dataset.i);
                if (isNaN(idx) || idx < 0 || idx >= s.en.length) return;
                draggingEngine = s.en[idx];
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            };

            list.ondragenter = e => {
                if (!draggingEngine) return;
                e.preventDefault();
                list.classList.add('drag-active');
            };

            list.ondragover = e => {
                if (!draggingEngine) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const dragging = list.querySelector('.dragging');
                if (!dragging) return;
                const sibling = [...list.querySelectorAll('.neo-engine-row:not(.dragging)')]
                    .reduce((best, row) => {
                        const rect   = row.getBoundingClientRect();
                        const offset = e.clientY - rect.top - rect.height / 2;
                        return (offset < 0 && offset > best.offset) ? { offset, element: row } : best;
                    }, { offset: -Infinity }).element;
                sibling ? list.insertBefore(dragging, sibling) : list.appendChild(dragging);
            };

            list.ondragleave = e => {
                if (e.target === list || !list.contains(e.relatedTarget)) list.classList.remove('drag-active');
            };

            list.ondrop = e => { e.preventDefault(); e.stopPropagation(); };

            list.ondragend = e => {
                e.target.closest('.neo-engine-row')?.classList.remove('dragging');
                list.classList.remove('drag-active');
                if (!draggingEngine) return;

                // 根据 DOM 当前顺序重建引擎数组（对象引用，不受索引变化影响）
                const reordered = [...list.querySelectorAll('.neo-engine-row')].reduce((acc, row) => {
                    const idx = parseInt(row.dataset.i);
                    if (!isNaN(idx) && idx >= 0 && idx < s.en.length) {
                        const eng = s.en[idx];
                        if (!acc.includes(eng)) acc.push(eng);
                    }
                    return acc;
                }, []);

                if (!SettingsManager.reorderEngines(reordered)) {
                    console.warn('[FFA] Drag sort count mismatch, re-rendering');
                    renderPanel();
                }
                draggingEngine = null;
            };
        }

        // ── 10.7 样式更新（防抖，不重建 DOM）────────────────────────────────

        const applyStyles = debounce(() => {
            StyleEngine.update();
            shadowStyle.textContent = buildCSSVariables(SettingsManager.current) + TOOLBAR_CSS;
            renderToolbar();
        }, 16);

        // ── 10.8 遮罩点击关闭 ───────────────────────────────────────────────

        mask.onclick = () => {
            mask.classList.remove('show');
            panel.classList.remove('show');
            suggestBox.classList.remove('show');
            suggestBox.innerHTML = '';
            SuggestModule.clearNav();
            panel.querySelector('#n-sub')?.classList.remove('show');
            wrapper.classList.remove('active', 'pinned');
            toolbar.classList.remove('pinned');
        };

        // ── 10.9 初始渲染 ────────────────────────────────────────────────────

        applyStyles();
        renderPanel();
    }

    // =========================================================================
    // 十一、启动
    // =========================================================================

    init();

})();