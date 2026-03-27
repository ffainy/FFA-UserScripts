// ==UserScript==
// @name                FFA NoRestrict
// @version             0.0.1
// @namespace           https://github.com/ffainy/FFA-UserScripts
// @icon                data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMzZhYTZkIiBkPSJNMTIgMEExMiAxMiAwIDAgMCAwIDEyYTEyIDEyIDAgMCAwIDEyIDEyYTEyIDEyIDAgMCAwIDEyLTEyQTEyIDEyIDAgMCAwIDEyIDBNNi43MTggNS4yODJMMTMuNDM2IDEybC02LjcxOCA2LjcxOGwtMi4wMzYtMi4wMzZMOS4zNjQgMTJMNC42ODIgNy4zMTh6bTcuMiAwTDIwLjYzNiAxMmwtNi43MTggNi43MThsLTIuMDM2LTIuMDM2TDE2LjU2NCAxMmwtNC42ODItNC42ODJ6Ii8+PC9zdmc+
// @description         Unlocks text selection, copy, and right-click on pages that block them. Works silently in the background — just enable it for the sites you need.
// @description:zh-CN   解除网页对文字选择、复制和右键菜单的屏蔽，让你自由阅读和摘录内容。按需为指定网站开启，静默运行无干扰。
// @author              Farfaraway
// @tag                 productivity
// @match               *://*/*
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_addStyle
// @noframes
// @run-at              document-start
// @homepage            https://github.com/ffainy
// @supportURL          https://github.com/ffainy/FFA-UserScripts
// @downloadURL         https://raw.githubusercontent.com/ffainy/FFA-UserScripts/refs/heads/master/FFA-NoRestrict.js
// @updateURL           https://raw.githubusercontent.com/ffainy/FFA-UserScripts/refs/heads/master/FFA-NoRestrict.js
// ==/UserScript==

(function () {
    'use strict';

    // ─── 常量 ─────────────────────────────────────────────────────────────────────

    const STORAGE_KEY = 'ffa_norestrict_settings';

    /**
     * 需要拦截（强制返回 true）的事件列表
     * 这些事件常被网页用于屏蔽复制/右键/选择等操作
     */
    const BLOCK_EVENTS = [
        'copy', 'cut', 'contextmenu',
        'selectstart', 'select',
        'dragstart',
        'beforeunload',
    ];

    /**
     * 需要保留原始处理逻辑但去掉 preventDefault 的事件
     * 例如 mousedown/mouseup/keydown/keyup 通常用于正常交互，不应完全拦截
     */
    const PASSTHROUGH_EVENTS = ['mousedown', 'mouseup', 'keydown', 'keyup'];

    // ─── 默认设置 ─────────────────────────────────────────────────────────────────

    const DEFAULT_SETTINGS = {
        enabled: true,         // 全局开关
        showBadge: true,       // 是否显示角标徽章
        themeMode: 'auto',     // auto | light | dark
        lang: 'auto',          // 界面语言：'en' | 'zh' | 'auto'
        hooks: {
            addEventListener: true,
            dom0handlers:     true,
            preventDefault:   true,
            cssUserSelect:    true,
        },
        // 仅在该列表中的站点才启用（默认所有站点关闭，手动开启）
        enabledSites: [],
    };

    // ─── 多语言 ───────────────────────────────────────────────────────────────────

    const LOCALES = {
        panelTitle:              { en: 'FFA NoRestrict',                          zh: 'FFA NoRestrict'                    },
        enabledOnPage:           { en: 'Enable on this page',                     zh: '在此页面启用'                      },
        enabledOnPageHint:       { en: 'Resets when you refresh the page',        zh: '仅本次访问有效，刷新后重置'         },
        hookEventListener:       { en: 'Block copy / right-click restrictions',   zh: '解除复制 / 右键 / 选择限制'         },
        hookAELHint:             { en: 'Intercepts scripts that block these actions', zh: '拦截网页脚本对这些操作的封锁'   },
        hookDOM0:                { en: 'Remove direct element locks',             zh: '清除元素上的直接封锁'               },
        hookDOM0Hint:            { en: 'Clears oncopy / oncontextmenu set on elements', zh: '移除写死在页面元素上的复制 / 右键禁用' },
        hookPreventDefault:      { en: 'Disable "block copy" code',               zh: '让"阻止复制"的代码失效'             },
        hookPreventDefaultHint:  { en: 'Makes the page\'s block commands ineffective', zh: '使网页调用的禁止操作指令不再生效' },
        hookUserSelect:          { en: 'Allow text selection',                    zh: '允许鼠标选中文字'                   },
        hookCSSHint:             { en: 'Removes CSS-level text selection locks',  zh: '解除 CSS 层面的文字选择禁用'         },
        sectionSites:            { en: 'Enabled Sites',                           zh: '已启用的网站'                      },
        sectionSitesCount:       { en: 'Enabled Sites ({n})',                     zh: '已启用的网站（{n}）'                },
        btnAddCurrent:           { en: 'Add current site',                        zh: '添加当前网站'                      },
        btnClearAll:             { en: 'Clear all',                               zh: '清空列表'                          },
        inputPlaceholder:        { en: 'Exact hostname, e.g. docs.example.com',   zh: '精确域名，如 docs.example.com'      },
        btnAdd:                  { en: 'Add',                                     zh: '添加'                              },
        noSites:                 { en: 'No sites added yet.',                     zh: '还没有添加任何网站。'               },
        badgeCurrentSite:        { en: 'Current',                                 zh: '当前'                              },
        errInvalidHost:          { en: 'Invalid hostname. Try: docs.example.com', zh: '域名格式不正确，如 docs.example.com' },
        errAlreadyInList:        { en: 'This site is already in the list.',       zh: '该网站已在列表中。'                 },
        errCurrentAlreadyInList: { en: 'Current site is already in the list.',    zh: '当前网站已在列表中。'               },
        errListEmpty:            { en: 'The list is already empty.',              zh: '列表已经是空的。'                   },
        confirmClearAll:         { en: 'Clear all enabled sites?',                zh: '确定要清空所有已启用的网站吗？'      },
        btnEnableGlobal:         { en: 'Enable Globally',                         zh: '全局启用'                          },
        btnDisableGlobal:        { en: 'Disable Globally',                        zh: '全局禁用'                          },
        btnManageSites:          { en: 'Manage Sites',                            zh: '管理网站'                          },
        subpanelSitesTitle:      { en: 'Enabled Sites',                           zh: '已启用的网站'                      },
        sitesHint:               { en: 'Each hostname is matched exactly. example.com and docs.example.com are separate entries.', zh: '精确匹配域名。example.com 与 docs.example.com 是两个独立条目。' },
        removeSite:              { en: 'Remove {site}',                           zh: '移除 {site}'                       },
        themeSwitchToDark:       { en: 'Switch to dark theme',                    zh: '切换到深色主题'                     },
        themeSwitchToLight:      { en: 'Switch to light theme',                   zh: '切换到浅色主题'                     },
        langLabel:               { en: 'Language',                                zh: '语言'                              },
    };

    /** 获取当前语言，auto 时跟随浏览器 */
    function getEffectiveLang() {
        const setting = Settings.current?.lang ?? 'auto';
        if (setting === 'zh' || setting === 'en') return setting;
        // auto：检测浏览器语言
        const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        return nav.startsWith('zh') ? 'zh' : 'en';
    }

    /** 翻译函数，支持 {key} 插值 */
    function t(key, vars) {
        const entry = LOCALES[key];
        if (!entry) return key;
        const lang = getEffectiveLang();
        let str = entry[lang] ?? entry.en;
        if (vars) {
            Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
        }
        return str;
    }

    // ─── 站点特定规则 ──────────────────────────────────────────────────────────────
    //
    // 结构：{ match, action }
    //   match  — 字符串（精确主机名）或 RegExp
    //   action — 函数，在 DOM ready 后执行，可进行额外的站点特定处理
    //
    // 扩展时只在此处新增条目，不需要修改任何核心逻辑。

    const SITE_RULES = [
        {
            match: 'www.zhihu.com',
            action() {
                // 知乎通过 mousemove 检测选择行为，额外屏蔽
                hookEvent('mousemove');
            },
        },
        {
            match: /^(www\.)?zhihu\.com$/,
            action() {
                waitForElement('.CopyLimitDialog', el => el.remove());
            },
        },
    ];

    const UI_THEMES = {
        light: { bg: '#F5ECD8', accent: '#8B5E3C' }, // Warm Sepia
        dark:  { bg: '#080F0A', accent: '#4AC878' }, // Deep Forest
    };
    const THEME_ICON_SUN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 19a7 7 0 1 1 0-14a7 7 0 0 1 0 14m0-1.5a5.5 5.5 0 1 0 0-11a5.5 5.5 0 1 0 0 11m-5.657.157a.75.75 0 0 1 0 1.06l-1.768 1.768a.749.749 0 0 1-1.275-.326a.75.75 0 0 1 .215-.734l1.767-1.768a.75.75 0 0 1 1.061 0M3.515 3.515a.75.75 0 0 1 1.06 0l1.768 1.768a.749.749 0 0 1-.326 1.275a.75.75 0 0 1-.734-.215L3.515 4.575a.75.75 0 0 1 0-1.06M12 0a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 12 0M4 12a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h2.5A.75.75 0 0 1 4 12m8 8a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 12 20m12-8a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h2.5A.75.75 0 0 1 24 12m-6.343 5.657a.75.75 0 0 1 1.06 0l1.768 1.768a.75.75 0 0 1-.018 1.042a.75.75 0 0 1-1.042.018l-1.768-1.767a.75.75 0 0 1 0-1.061m2.828-14.142a.75.75 0 0 1 0 1.06l-1.768 1.768a.75.75 0 0 1-1.042-.018a.75.75 0 0 1-.018-1.042l1.767-1.768a.75.75 0 0 1 1.061 0"/></svg>';
    const THEME_ICON_MOON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m14.768 3.96l-.002-.005a9 9 0 0 0-.218-.779c-.13-.394.21-.8.602-.67q.435.144.855.328l.01.005A10.002 10.002 0 0 1 12 22a10 10 0 0 1-9.162-5.985l-.004-.01a10 10 0 0 1-.329-.855c-.13-.392.277-.732.67-.602q.386.126.78.218l.004.002A9 9 0 0 0 14.999 6a9 9 0 0 0-.231-2.04M16.5 6c0 5.799-4.701 10.5-10.5 10.5q-.64 0-1.26-.075A8.5 8.5 0 1 0 16.425 4.74q.075.62.075 1.259Z"/></svg>';

    // ─── 工具函数 ─────────────────────────────────────────────────────────────────

    /** 等待某个 CSS 选择器对应的元素出现后执行回调（MutationObserver 实现） */
    function waitForElement(selector, callback, timeout = 10_000) {
        const existing = document.querySelector(selector);
        if (existing) { callback(existing); return; }

        const obs = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) { obs.disconnect(); callback(el); }
        });

        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => obs.disconnect(), timeout);
    }

    /** 获取当前页面主机名 */
    const hostname = window.location.hostname.toLowerCase();

    function hexToRgb(hex) {
        const clean = String(hex || '').replace('#', '');
        if (!/^[0-9a-fA-F]{6}$/.test(clean)) return [0, 0, 0];
        return [0, 2, 4].map(i => parseInt(clean.slice(i, i + 2), 16));
    }

    function hexToRgba(hex, alpha) {
        const [r, g, b] = hexToRgb(hex);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function detectPreferredColorMode() {
        try {
            if (typeof window.matchMedia !== 'function') return 'light';
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    }

    function detectPreferredLang() {
        try {
            const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
            return nav.startsWith('zh') ? 'zh' : 'en';
        } catch {
            return 'en';
        }
    }

    function getEffectiveThemeMode() {
        const modeSetting = Settings.current?.themeMode;
        if (modeSetting === 'light' || modeSetting === 'dark') return modeSetting;
        return detectPreferredColorMode();
    }

    function getUIThemeVars() {
        const mode = getEffectiveThemeMode();
        const theme = mode === 'dark' ? UI_THEMES.dark : UI_THEMES.light;
        const accentRgb = hexToRgb(theme.accent).join(',');
        const isDark = mode === 'dark';
        const panelAlpha = isDark ? 0.9 : 0.92;

        return {
            '--ffa-nr-accent'           : theme.accent,
            '--ffa-nr-accent-rgb'       : accentRgb,
            '--ffa-nr-glow-accent'      : hexToRgba(theme.accent, isDark ? 0.28 : 0.16),
            '--ffa-nr-glow-accent-hover': hexToRgba(theme.accent, isDark ? 0.36 : 0.22),
            '--ffa-nr-glow-accent-sm'   : `0 0 4px ${hexToRgba(theme.accent, isDark ? 0.38 : 0.26)}`,
            '--ffa-nr-glow-text'        : isDark ? '0 0 4px rgba(255,255,255,0.18)'                 : '0 0 4px rgba(0,0,0,0.12)',
            '--ffa-nr-glow-on-accent'   : isDark ? '0 0 5px rgba(255,255,255,0.28)'                 : '0 0 5px rgba(255,255,255,0.22)',
            '--ffa-nr-border'           : isDark ? 'rgba(255,255,255,0.14)'                         : 'rgba(86,58,34,0.2)',
            '--ffa-nr-text-primary'     : isDark ? 'rgba(255,255,255,0.9)'                          : 'rgba(40,28,20,0.92)',
            '--ffa-nr-text-secondary'   : isDark ? 'rgba(255,255,255,0.54)'                         : 'rgba(75,52,36,0.62)',
            '--ffa-nr-bg-panel'         : hexToRgba(theme.bg, panelAlpha),
            '--ffa-nr-bg-surface'       : isDark ? 'rgba(255,255,255,0.045)'                        : 'rgba(255,255,255,0.52)',
            '--ffa-nr-bg-surface-hover' : isDark ? 'rgba(255,255,255,0.08)'                         : 'rgba(255,255,255,0.75)',
        };
    }

    function applyThemeVars(host) {
        const themeVars = getUIThemeVars();
        Object.entries(themeVars).forEach(([name, value]) => host.style.setProperty(name, value));
    }

    /** 检查当前主机名是否命中某条规则的 match 字段 */
    function matchesRule(match) {
        if (typeof match === 'string') return hostname === match;
        if (match instanceof RegExp) return match.test(hostname);
        return false;
    }

    // ─── 设置管理 ─────────────────────────────────────────────────────────────────

    const Settings = {
        _data: null,

        get current() { return this._data; },

        load() {
            const saved = GM_getValue(STORAGE_KEY, {});
            const isFirstInstall = Object.keys(saved).length === 0;
            const normalizedSites = Array.isArray(saved.enabledSites)
                ? [...new Set(saved.enabledSites.map(site => this.normalizeHost(site)).filter(Boolean))]
                : [];
            this._data = {
                ...DEFAULT_SETTINGS,
                ...saved,
                themeMode: (saved.themeMode === 'light' || saved.themeMode === 'dark' || saved.themeMode === 'auto')
                    ? saved.themeMode
                    : DEFAULT_SETTINGS.themeMode,
                lang: (saved.lang === 'en' || saved.lang === 'zh' || saved.lang === 'auto')
                    ? saved.lang
                    : DEFAULT_SETTINGS.lang,
                hooks: { ...DEFAULT_SETTINGS.hooks, ...(saved.hooks ?? {}) },
                enabledSites: normalizedSites,
            };
            if (isFirstInstall) {
                this._data.lang = detectPreferredLang();
                this.save();
            }
            return this._data;
        },

        save() { GM_setValue(STORAGE_KEY, this._data); },

        update(patch) {
            Object.assign(this._data, patch);
            this.save();
        },

        isSiteEnabled() {
            return this._data.enabledSites.includes(hostname);
        },

        getEnabledSites() {
            return [...this._data.enabledSites];
        },

        normalizeHost(input) {
            const raw = String(input ?? '').trim();
            if (!raw) return '';
            let host = '';
            try {
                host = new URL(raw).hostname.toLowerCase();
            } catch {
                host = raw
                    .replace(/^\w+:\/\//i, '')
                    .replace(/\/.*$/, '')
                    .replace(/:\d+$/, '')
                    .toLowerCase();
            }
            if (!/^[a-z0-9.-]+$/.test(host)) return '';
            if (!host.includes('.')) return '';
            return host;
        },

        addSiteEnabled(site = hostname) {
            const normalized = this.normalizeHost(site);
            if (!normalized) return false;
            if (!this._data.enabledSites.includes(normalized)) {
                this._data.enabledSites.push(normalized);
                this.save();
                return true;
            }
            return false;
        },

        removeSiteEnabled(site = hostname) {
            const normalized = this.normalizeHost(site);
            const next = this._data.enabledSites.filter(e => e !== normalized);
            if (next.length === this._data.enabledSites.length) return false;
            this._data.enabledSites = next;
            this.save();
            return true;
        },
    };

    // ─── 核心 Hook 逻辑 ───────────────────────────────────────────────────────────

    // 在 document-start 时保存原始引用，此时页面脚本尚未运行
    const _origAddEventListener = EventTarget.prototype.addEventListener;
    const _origPreventDefault    = Event.prototype.preventDefault;
    let _sessionSiteEnabled = false;
    let _domReady = false;
    let _dom0CleanerStop = null;
    let _cssUnlockStyle = null;
    let _siteRulesApplied = false;

    /** 强制将事件处理器替换为返回 true 的 noop */
    function returnTrue() { return true; }

    /**
     * 拦截 addEventListener：
     * - BLOCK_EVENTS 中的事件直接替换为 returnTrue
     * - PASSTHROUGH_EVENTS 中的事件保留处理器，但其内部的 preventDefault 调用会被阻断
     * - 其他事件照常注册
     */
    function hookEvent(type) {
        if (!BLOCK_EVENTS.includes(type)) BLOCK_EVENTS.push(type);
    }

    function installAddEventListenerHook() {
        EventTarget.prototype.addEventListener = function (type, listener, options) {
            const s = Settings.current;
            if (!isFeatureActive() || !s?.hooks?.addEventListener) {
                return _origAddEventListener.apply(this, arguments);
            }

            if (BLOCK_EVENTS.includes(type)) {
                // 用 returnTrue 替换原始处理器，保持注册（不影响 removeEventListener）
                return _origAddEventListener.call(this, type, returnTrue, options);
            }

            return _origAddEventListener.apply(this, arguments);
        };
    }

    /** 拦截 Event.prototype.preventDefault，使其在受控事件上无效 */
    function installPreventDefaultHook() {
        Event.prototype.preventDefault = function () {
            const s = Settings.current;
            if (isFeatureActive() && s?.hooks?.preventDefault && BLOCK_EVENTS.includes(this.type)) {
                return; // 静默忽略
            }
            return _origPreventDefault.call(this);
        };
    }

    /**
     * 清理 DOM0 内联处理器（element.oncopy = fn 等形式）
     * 周期轮询以覆盖动态插入的元素
     */
    function installDOM0Cleaner() {
        const allEvents = [...BLOCK_EVENTS];
        let _timer = null;

        function clean() {
            const s = Settings.current;
            if (!isFeatureActive() || !s?.hooks?.dom0handlers) return;

            const elements = [document, document.documentElement, ...document.getElementsByTagName('*')];
            for (const el of elements) {
                for (const type of allEvents) {
                    const prop = `on${type}`;
                    if (el[prop] && el[prop] !== returnTrue) {
                        el[prop] = returnTrue;
                    }
                }
            }
        }

        // 初次立即执行，之后每 1.5s 轮询一次（页面动态注入处理器的情况）
        clean();
        _timer = setInterval(clean, 1500);
        return () => clearInterval(_timer);
    }

    /** 注入 CSS 解除 user-select 限制 */
    function installCSSUnlock() {
        return GM_addStyle(`
            html,
            body,
            *:not([class*="ffa-"]) {
                -webkit-user-select: text !important;
                -moz-user-select:    text !important;
                user-select:         text !important;
            }
        `);
    }

    /** 在 DOM ready 后执行站点特定规则 */
    function applySiteRules() {
        const matched = SITE_RULES.filter(r => matchesRule(r.match));
        if (matched.length === 0) return;

        const run = () => matched.forEach(r => { try { r.action(); } catch (e) { console.warn('[FFA NoRestrict] site rule error', e); } });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
    }

    function isFeatureActive() {
        return !!(Settings.current?.enabled && (_sessionSiteEnabled || Settings.isSiteEnabled()));
    }

    function updateRuntimeFeatures() {
        const s = Settings.current;
        if (!s) return;
        const active = isFeatureActive();

        if (active && s.hooks.cssUserSelect) {
            if (!_cssUnlockStyle) _cssUnlockStyle = installCSSUnlock();
        } else if (_cssUnlockStyle) {
            _cssUnlockStyle.remove();
            _cssUnlockStyle = null;
        }

        if (_domReady) {
            if (active && s.hooks.dom0handlers) {
                if (!_dom0CleanerStop) _dom0CleanerStop = installDOM0Cleaner();
            } else if (_dom0CleanerStop) {
                _dom0CleanerStop();
                _dom0CleanerStop = null;
            }

            if (active && !_siteRulesApplied) {
                applySiteRules();
                _siteRulesApplied = true;
            }
        }
    }

    // ─── UI ───────────────────────────────────────────────────────────────────────

    const UI_THEME_CSS = `
        :host {
            all: initial;
            --ffa-nr-accent           : #36aa6d;
            --ffa-nr-accent-rgb       : 54,        170, 109;
            --ffa-nr-glow-accent      : rgba(54,170,109,0.28);
            --ffa-nr-glow-accent-hover: rgba(54,170,109,0.36);
            --ffa-nr-border           : rgba(255,255,255,0.14);
            --ffa-nr-text-primary     : rgba(255,255,255,0.9);
            --ffa-nr-text-secondary   : rgba(255,255,255,0.54);
            --ffa-nr-bg-panel         : rgba(10,18,12,0.9);
            --ffa-nr-bg-surface       : rgba(255,255,255,0.045);
            --ffa-nr-bg-surface-hover : rgba(255,255,255,0.08);
            --ffa-nr-glow-text        : 0 0 4px rgba(255,255,255,0.16);
            --ffa-nr-glow-accent-sm   : 0 0 4px rgba(54,170,109,0.3);
            --ffa-nr-glow-on-accent   : 0 0 5px rgba(255,255,255,0.26);
            --ffa-nr-radius-panel     : 14px;
            --ffa-nr-radius-widget    : 10px;
            --ffa-nr-easing           : cubic-bezier(0.23,1,0.32,1);
            --ffa-nr-font-stack       : system-ui, sans-serif;
        }
        :host, :host * {
            box-sizing: border-box;
            font-family: var(--ffa-nr-font-stack);
        }
    `;

    const UI_COMPONENT_CSS = `
        .ffa-nr-root {
            position: fixed;
            bottom: 24px;
            left: 0;
            z-index: 2147483647;
            pointer-events: none;
        }

        /* ── 迷你图标 ── */
        .ffa-nr-mini-icon {
            position: fixed;
            top: 12px;
            left: 0;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            pointer-events: auto;
            transform: translateX(-33%);
            transition: transform 0.5s var(--ffa-nr-easing), opacity 0.4s var(--ffa-nr-easing);
            user-select: none;
            -webkit-user-select: none;
            overflow: visible;
        }

        .ffa-nr-mini-icon svg {
            width: 22px;
            height: 22px;
            color: var(--ffa-nr-accent);
            stroke: currentColor;
            filter: drop-shadow(0 0 4px var(--ffa-nr-accent));
            transition: all 0.5s var(--ffa-nr-easing);
            flex-shrink: 0;
        }

        /* 未激活状态：图标变灰，无光晕 */
        .ffa-nr-mini-icon--off svg {
            color: rgba(255,255,255,0.28);
            stroke: currentColor;
            filter: none;
        }

        /* 鼠标悬停：完全展开 + 双层光晕 */
        .ffa-nr-mini-icon:hover {
            transform: translateX(0);
        }

        .ffa-nr-mini-icon:hover svg {
            transform: scale(1.15);
            filter: drop-shadow(0 0 6px var(--ffa-nr-accent)) drop-shadow(0 0 16px var(--ffa-nr-accent));
        }

        .ffa-nr-mini-icon--off:hover svg {
            filter: none;
        }

        /* 菜单打开时：完全缩回 */
        .ffa-nr-mini-icon--hidden {
            opacity: 0;
            pointer-events: none;
            transform: translateX(-100%);
        }

        /* ── 热区（覆盖左上角，比图标更大，捕捉鼠标接近） ── */
        .ffa-nr-mini-hitarea {
            position: fixed;
            top: 0;
            left: 0;
            width: 72px;
            height: 72px;
            pointer-events: auto;
            cursor: pointer;
        }

        .ffa-nr-menu {
            position: fixed;
            top: 8px;
            left: 8px;
            width: 320px;
            background: var(--ffa-nr-bg-panel);
            border: 1px solid rgba(var(--ffa-nr-accent-rgb),0.25);
            border-radius: var(--ffa-nr-radius-panel);
            backdrop-filter: blur(16px) saturate(180%);
            box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(var(--ffa-nr-accent-rgb),0.12) inset, 0 0 28px var(--ffa-nr-glow-accent-hover);
            padding: 8px 0;
            pointer-events: auto;
            max-height: min(82vh, 760px);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            visibility: hidden;
            opacity: 0;
            transform: translateX(-12px);
            transition: opacity 0.25s var(--ffa-nr-easing), transform 0.3s var(--ffa-nr-easing), visibility 0s linear 0.3s;
        }

        /* 子面板定位容器，撑满 menu 内部 */
        .ffa-nr-menu__inner {
            position: relative;
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .ffa-nr-menu--visible {
            visibility: visible;
            opacity: 1;
            transform: translateX(0);
            transition: opacity 0.25s var(--ffa-nr-easing), transform 0.3s var(--ffa-nr-easing);
            box-shadow: 0 14px 44px rgba(0,0,0,0.58), 0 0 0 1px rgba(var(--ffa-nr-accent-rgb),0.16) inset, 0 0 36px var(--ffa-nr-glow-accent-hover);
        }

        .ffa-nr-menu__body {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .ffa-nr-menu__header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px 10px;
            border-bottom: 1px solid rgba(var(--ffa-nr-accent-rgb),0.14);
            margin-bottom: 4px;
        }

        .ffa-nr-menu__header-btns {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }

        .ffa-nr-menu__header-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .ffa-nr-icon-btn {
            width: 24px;
            height: 24px;
            border-radius: 8px;
            border: 1px solid var(--ffa-nr-border);
            background: var(--ffa-nr-bg-surface);
            color: var(--ffa-nr-text-secondary);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.2s var(--ffa-nr-easing), border-color 0.2s var(--ffa-nr-easing), color 0.2s var(--ffa-nr-easing), transform 0.2s var(--ffa-nr-easing), box-shadow 0.25s var(--ffa-nr-easing);
            line-height: 1;
        }

        .ffa-nr-icon-btn svg {
            width: 14px;
            height: 14px;
            display: block;
            flex-shrink: 0;
        }

        .ffa-nr-icon-btn:hover {
            color: var(--ffa-nr-text-primary);
            border-color: rgba(var(--ffa-nr-accent-rgb),0.45);
            background: var(--ffa-nr-bg-surface-hover);
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(0,0,0,0.14), 0 0 14px var(--ffa-nr-glow-accent-hover);
        }

        .ffa-nr-icon-btn:active {
            transform: translateY(0) scale(0.95);
            transition-duration: 0.08s;
            box-shadow: 0 1px 5px rgba(0,0,0,0.16), 0 0 8px var(--ffa-nr-glow-accent);
        }

        .ffa-nr-icon-btn--light {
            color: #b57a42;
            text-shadow: 0 0 6px rgba(181,122,66,0.28), 0 0 14px rgba(181,122,66,0.18);
        }

        .ffa-nr-icon-btn--light:hover {
            color: #c88a4f;
            text-shadow: 0 0 8px rgba(200,138,79,0.38), 0 0 18px rgba(200,138,79,0.24);
        }

        .ffa-nr-icon-btn--dark {
            color: #68d090;
            text-shadow: 0 0 6px rgba(74,200,120,0.32), 0 0 16px rgba(74,200,120,0.2);
        }

        .ffa-nr-icon-btn--dark:hover {
            color: #7ee1a2;
            text-shadow: 0 0 9px rgba(126,225,162,0.4), 0 0 20px rgba(126,225,162,0.26);
        }

        .ffa-nr-menu__title {
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 1.5px;
            color: var(--ffa-nr-accent);
            text-transform: uppercase;
            text-shadow: 0 0 6px var(--ffa-nr-glow-accent), 0 0 14px var(--ffa-nr-glow-accent-hover);
        }

        .ffa-nr-menu__host {
            font-size: 10px;
            color: var(--ffa-nr-text-secondary);
            font-family: monospace;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-shadow: var(--ffa-nr-glow-text);
        }

        .ffa-nr-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 16px;
            cursor: pointer;
            transition: background 0.2s var(--ffa-nr-easing);
        }

        .ffa-nr-row:hover {
            background: rgba(var(--ffa-nr-accent-rgb),0.07);
        }

        .ffa-nr-row--disabled {
            opacity: 0.48;
            cursor: not-allowed;
        }

        .ffa-nr-row--disabled:hover {
            background: transparent;
        }

        .ffa-nr-row__label {
            flex: 1;
            font-size: 12px;
            color: var(--ffa-nr-text-primary);
            font-weight: 600;
            text-shadow: var(--ffa-nr-glow-text);
        }

        .ffa-nr-row__hint {
            font-size: 10px;
            color: var(--ffa-nr-text-secondary);
            margin-top: 1px;
        }

        .ffa-nr-switch {
            width: 40px;
            height: 22px;
            border-radius: 22px;
            background: rgba(255,255,255,0.08);
            border: 1px solid var(--ffa-nr-border);
            position: relative;
            flex-shrink: 0;
            transition: background 0.35s var(--ffa-nr-easing), border-color 0.35s var(--ffa-nr-easing), box-shadow 0.35s var(--ffa-nr-easing);
        }

        .ffa-nr-switch::after {
            content: '';
            position: absolute;
            left: 3px;
            top: 3px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--ffa-nr-text-secondary);
            transition: left 0.35s var(--ffa-nr-easing), background 0.35s var(--ffa-nr-easing), box-shadow 0.35s var(--ffa-nr-easing);
        }

        .ffa-nr-switch--on {
            background: rgba(var(--ffa-nr-accent-rgb),0.2);
            border-color: rgba(var(--ffa-nr-accent-rgb),0.45);
            box-shadow: 0 0 8px var(--ffa-nr-glow-accent);
        }

        .ffa-nr-switch--on::after {
            left: 21px;
            background: var(--ffa-nr-accent);
            box-shadow: 0 0 8px var(--ffa-nr-glow-accent);
        }

        .ffa-nr-divider {
            height: 1px;
            background: rgba(var(--ffa-nr-accent-rgb),0.12);
            margin: 4px 0;
        }

        .ffa-nr-sites__title {
            padding: 9px 16px 5px;
            font-size: 10px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: var(--ffa-nr-text-secondary);
            font-weight: 700;
            text-shadow: var(--ffa-nr-glow-text);
        }

        .ffa-nr-sites {
            padding: 6px 16px 2px;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }

        .ffa-nr-sites__actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
        }

        .ffa-nr-input-row {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 8px;
        }

        .ffa-nr-input {
            flex: 1;
            height: 32px;
            padding: 0 10px;
            border-radius: var(--ffa-nr-radius-widget);
            border: 1px solid var(--ffa-nr-border);
            background: var(--ffa-nr-bg-surface);
            color: var(--ffa-nr-text-primary);
            outline: none;
            font-size: 12px;
        }

        .ffa-nr-input:focus {
            border-color: rgba(var(--ffa-nr-accent-rgb),0.55);
            box-shadow: 0 0 10px var(--ffa-nr-glow-accent);
            background: var(--ffa-nr-bg-surface-hover);
        }

        .ffa-nr-sites__list {
            max-height: 220px;
            min-height: 84px;
            flex: 1;
            overflow: auto;
            padding-right: 2px;
        }

        .ffa-nr-sites__list::-webkit-scrollbar {
            width: 6px;
        }

        .ffa-nr-sites__list::-webkit-scrollbar-thumb {
            background: var(--ffa-nr-glow-accent);
            border-radius: 8px;
        }

        .ffa-nr-sites__empty {
            font-size: 11px;
            color: var(--ffa-nr-text-secondary);
            padding: 8px 2px;
            opacity: 0.8;
            text-shadow: var(--ffa-nr-glow-text);
        }

        .ffa-nr-site-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border: 1px solid var(--ffa-nr-border);
            background: var(--ffa-nr-bg-surface);
            border-radius: var(--ffa-nr-radius-widget);
            margin-bottom: 6px;
            transition: border-color 0.2s var(--ffa-nr-easing), background 0.2s var(--ffa-nr-easing);
        }

        .ffa-nr-site-row:hover {
            border-color: rgba(var(--ffa-nr-accent-rgb),0.35);
            background: var(--ffa-nr-bg-surface-hover);
        }

        .ffa-nr-site-row__domain {
            flex: 1;
            font-size: 11px;
            color: var(--ffa-nr-text-primary);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-shadow: var(--ffa-nr-glow-text);
        }

        .ffa-nr-site-row__tag {
            font-size: 10px;
            color: var(--ffa-nr-accent);
            border: 1px solid rgba(var(--ffa-nr-accent-rgb),0.35);
            border-radius: 999px;
            padding: 2px 6px;
            line-height: 1;
            text-shadow: var(--ffa-nr-glow-accent-sm);
        }

        .ffa-nr-feedback {
            font-size: 10px;
            min-height: 14px;
            color: #ff6b6b;
            padding: 0 2px 6px;
            text-shadow: 0 0 5px rgba(255,107,107,0.35);
        }

        .ffa-nr-footer {
            padding: 10px 16px;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .ffa-nr-footer .ffa-nr-btn {
            flex: 1;
            margin-bottom: 0;
        }

        /* ── 子面板（网站管理，从下方滑入覆盖主面板） ── */
        .ffa-nr-subpanel {
            position: absolute;
            inset: 0;
            background: var(--ffa-nr-bg-panel);
            backdrop-filter: blur(16px) saturate(180%);
            z-index: 10;
            display: flex;
            flex-direction: column;
            transform: translateY(100%);
            transition: transform 0.35s var(--ffa-nr-easing);
            border-radius: var(--ffa-nr-radius-panel);
        }

        .ffa-nr-subpanel--visible {
            transform: translateY(0);
        }

        .ffa-nr-subpanel__header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px 10px;
            border-bottom: 1px solid rgba(var(--ffa-nr-accent-rgb),0.14);
            flex-shrink: 0;
        }

        .ffa-nr-subpanel__back {
            width: 24px;
            height: 24px;
            border-radius: 8px;
            border: 1px solid var(--ffa-nr-border);
            background: var(--ffa-nr-bg-surface);
            color: var(--ffa-nr-text-secondary);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.2s var(--ffa-nr-easing), border-color 0.2s var(--ffa-nr-easing), color 0.2s var(--ffa-nr-easing);
        }

        .ffa-nr-subpanel__back:hover {
            color: var(--ffa-nr-text-primary);
            border-color: rgba(var(--ffa-nr-accent-rgb),0.45);
            background: var(--ffa-nr-bg-surface-hover);
        }

        .ffa-nr-subpanel__back svg {
            width: 14px;
            height: 14px;
            display: block;
        }

        .ffa-nr-subpanel__title {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1px;
            color: var(--ffa-nr-text-primary);
            text-transform: uppercase;
            text-shadow: var(--ffa-nr-glow-text);
        }

        .ffa-nr-subpanel__body {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 8px 0 4px;
        }

        .ffa-nr-subpanel__body::-webkit-scrollbar { width: 4px; }
        .ffa-nr-subpanel__body::-webkit-scrollbar-thumb {
            background: var(--ffa-nr-glow-accent);
            border-radius: 4px;
        }

        .ffa-nr-sites__hint {
            font-size: 10px;
            color: var(--ffa-nr-text-secondary);
            line-height: 1.5;
            margin-bottom: 8px;
            text-shadow: var(--ffa-nr-glow-text);
        }

        .ffa-nr-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 34px;
            padding: 0 12px;
            border-radius: var(--ffa-nr-radius-widget);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.4px;
            text-align: center;
            cursor: pointer;
            border: 1px solid rgba(var(--ffa-nr-accent-rgb),0.25);
            background: rgba(var(--ffa-nr-accent-rgb),0.08);
            color: var(--ffa-nr-accent);
            transition: transform 0.25s var(--ffa-nr-easing), background 0.2s var(--ffa-nr-easing), border-color 0.2s var(--ffa-nr-easing), box-shadow 0.25s var(--ffa-nr-easing);
            margin-bottom: 6px;
            text-shadow: var(--ffa-nr-glow-accent-sm);
        }

        .ffa-nr-btn:hover {
            background: rgba(var(--ffa-nr-accent-rgb),0.15);
            border-color: rgba(var(--ffa-nr-accent-rgb),0.55);
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(0,0,0,0.2), 0 0 18px var(--ffa-nr-glow-accent-hover);
        }

        .ffa-nr-btn--primary {
            background: var(--ffa-nr-accent);
            color: #fff;
            border-color: var(--ffa-nr-accent);
            box-shadow: 0 2px 10px var(--ffa-nr-glow-accent);
            text-shadow: var(--ffa-nr-glow-on-accent);
        }

        .ffa-nr-btn--primary:hover {
            background: var(--ffa-nr-accent);
            border-color: var(--ffa-nr-accent);
        }

        .ffa-nr-btn--tertiary {
            border-color: var(--ffa-nr-border);
            background: var(--ffa-nr-bg-surface);
            color: var(--ffa-nr-text-secondary);
            text-shadow: var(--ffa-nr-glow-text);
        }

        .ffa-nr-btn--tertiary:hover {
            color: var(--ffa-nr-text-primary);
            border-color: rgba(var(--ffa-nr-accent-rgb),0.3);
            background: var(--ffa-nr-bg-surface-hover);
        }

        .ffa-nr-btn--small {
            width: auto;
            min-width: 64px;
            margin-bottom: 0;
            height: 32px;
            padding: 0 10px;
        }

        .ffa-nr-btn--danger {
            border-color: rgba(255,107,107,0.35);
            color: #ff8a8a;
            background: rgba(255,107,107,0.08);
        }

        .ffa-nr-btn--danger:hover {
            border-color: rgba(255,107,107,0.55);
            background: rgba(255,107,107,0.14);
            color: #ff6b6b;
            box-shadow: 0 4px 14px rgba(255,107,107,0.16);
        }

        .ffa-nr-btn-icon {
            width: 24px;
            height: 24px;
            border-radius: 8px;
            border: 1px solid var(--ffa-nr-border);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--ffa-nr-text-secondary);
            cursor: pointer;
            transition: all 0.2s var(--ffa-nr-easing);
            font-size: 12px;
            line-height: 1;
        }

        .ffa-nr-btn-icon:hover {
            color: #ff6b6b;
            border-color: rgba(255,107,107,0.5);
            background: rgba(255,107,107,0.12);
        }
    `;

    const UI_CSS = `${UI_THEME_CSS}\n${UI_COMPONENT_CSS}`;

    /** 创建开关行的 DOM 元素 */
    function createRow(label, hint, isOn, onChange) {
        const row = document.createElement('div');
        row.className = 'ffa-nr-row';
        let disabled = false;

        const text = document.createElement('div');
        text.innerHTML = `
            <div class="ffa-nr-row__label">${label}</div>
            ${hint ? `<div class="ffa-nr-row__hint">${hint}</div>` : ''}
        `;
        text.style.flex = '1';

        const sw = document.createElement('div');
        sw.className = `ffa-nr-switch${isOn ? ' ffa-nr-switch--on' : ''}`;

        row.append(text, sw);
        row.onclick = () => {
            if (disabled) return;
            const next = !sw.classList.contains('ffa-nr-switch--on');
            sw.classList.toggle('ffa-nr-switch--on', next);
            onChange(next);
        };

        const setDisabled = (nextDisabled) => {
            disabled = !!nextDisabled;
            row.classList.toggle('ffa-nr-row--disabled', disabled);
            row.setAttribute('aria-disabled', String(disabled));
        };

        const refresh = (newLabel, newHint) => {
            text.innerHTML = `
                <div class="ffa-nr-row__label">${newLabel}</div>
                ${newHint ? `<div class="ffa-nr-row__hint">${newHint}</div>` : ''}
            `;
        };

        return { row, sw, setDisabled, refresh };
    }

    function createSitesSubpanel({
        hostname,
        onFeatureStateMaybeChanged,
        onCurrentSitePersisted,
        onCurrentSiteCleared,
        onBack,
    }) {
        const subpanel = document.createElement('div');
        subpanel.className = 'ffa-nr-subpanel';

        // ── 子面板 header ──
        const subHeader = document.createElement('div');
        subHeader.className = 'ffa-nr-subpanel__header';

        const backBtn = document.createElement('div');
        backBtn.className = 'ffa-nr-subpanel__back';
        backBtn.title = '← Back';
        backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7l-7 7l7 7"/></svg>`;
        backBtn.onclick = onBack;

        const subTitle = document.createElement('span');
        subTitle.className = 'ffa-nr-subpanel__title';
        subTitle.textContent = t('subpanelSitesTitle');

        subHeader.append(backBtn, subTitle);

        // ── 子面板 body ──
        const subBody = document.createElement('div');
        subBody.className = 'ffa-nr-subpanel__body';

        // 内容区（复用原 sites section 的内部结构）
        const sitesActions = document.createElement('div');
        sitesActions.className = 'ffa-nr-sites__actions';
        sitesActions.style.padding = '6px 16px 0';

        const sitesAddCurrent = document.createElement('div');
        sitesAddCurrent.className = 'ffa-nr-btn ffa-nr-btn--tertiary ffa-nr-btn--small';
        sitesAddCurrent.style.width = '100%';
        sitesAddCurrent.textContent = t('btnAddCurrent');

        const sitesClearAll = document.createElement('div');
        sitesClearAll.className = 'ffa-nr-btn ffa-nr-btn--danger ffa-nr-btn--small';
        sitesClearAll.style.width = '100%';
        sitesClearAll.textContent = t('btnClearAll');

        sitesActions.append(sitesAddCurrent, sitesClearAll);

        const sitesInputWrap = document.createElement('div');
        sitesInputWrap.style.padding = '8px 16px 0';

        const sitesHint = document.createElement('div');
        sitesHint.className = 'ffa-nr-sites__hint';
        sitesHint.textContent = t('sitesHint');

        const sitesInputRow = document.createElement('div');
        sitesInputRow.className = 'ffa-nr-input-row';

        const sitesInput = document.createElement('input');
        sitesInput.className = 'ffa-nr-input';
        sitesInput.placeholder = t('inputPlaceholder');

        const sitesAdd = document.createElement('div');
        sitesAdd.className = 'ffa-nr-btn ffa-nr-btn--small';
        sitesAdd.textContent = t('btnAdd');

        sitesInputRow.append(sitesInput, sitesAdd);

        const sitesFeedback = document.createElement('div');
        sitesFeedback.className = 'ffa-nr-feedback';
        sitesFeedback.style.padding = '0 16px 4px';

        const sitesList = document.createElement('div');
        sitesList.className = 'ffa-nr-sites__list';
        sitesList.style.padding = '0 16px';
        sitesList.style.maxHeight = 'none';

        sitesInputWrap.append(sitesHint, sitesInputRow);
        subBody.append(sitesActions, sitesInputWrap, sitesFeedback, sitesList);
        subpanel.append(subHeader, subBody);

        const renderSites = () => {
            const sites = Settings.getEnabledSites().sort((a, b) => a.localeCompare(b));
            subTitle.textContent = t('sectionSitesCount', { n: sites.length });
            sitesList.innerHTML = '';

            if (sites.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'ffa-nr-sites__empty';
                empty.textContent = t('noSites');
                sitesList.appendChild(empty);
                return;
            }

            for (const site of sites) {
                const row = document.createElement('div');
                row.className = 'ffa-nr-site-row';

                const hostEl = document.createElement('div');
                hostEl.className = 'ffa-nr-site-row__domain';
                hostEl.textContent = site;
                row.appendChild(hostEl);

                if (site === hostname) {
                    const tag = document.createElement('div');
                    tag.className = 'ffa-nr-site-row__tag';
                    tag.textContent = t('badgeCurrentSite');
                    row.appendChild(tag);
                }

                const remove = document.createElement('div');
                remove.className = 'ffa-nr-btn-icon';
                remove.textContent = '✕';
                remove.title = t('removeSite', { site });
                remove.onclick = (e) => {
                    e.stopPropagation();
                    if (!Settings.removeSiteEnabled(site)) return;
                    renderSites();
                    if (site === hostname) {
                        onCurrentSiteCleared();
                        onFeatureStateMaybeChanged();
                    }
                };

                row.appendChild(remove);
                sitesList.appendChild(row);
            }
        };

        const addSiteFromInput = () => {
            const normalized = Settings.normalizeHost(sitesInput.value);
            if (!normalized) { sitesFeedback.textContent = t('errInvalidHost'); return; }
            sitesFeedback.textContent = '';
            const added = Settings.addSiteEnabled(normalized);
            if (!added) { sitesFeedback.textContent = t('errAlreadyInList'); return; }
            sitesInput.value = '';
            renderSites();
            if (normalized === hostname) { onCurrentSitePersisted(); onFeatureStateMaybeChanged(); }
        };

        sitesAdd.onclick = addSiteFromInput;
        sitesInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSiteFromInput(); } });

        sitesAddCurrent.onclick = () => {
            sitesFeedback.textContent = '';
            const added = Settings.addSiteEnabled(hostname);
            if (!added) { sitesFeedback.textContent = t('errCurrentAlreadyInList'); return; }
            renderSites();
            onCurrentSitePersisted();
            onFeatureStateMaybeChanged();
        };

        sitesClearAll.onclick = () => {
            const sites = Settings.getEnabledSites();
            if (sites.length === 0) { sitesFeedback.textContent = t('errListEmpty'); return; }
            if (!window.confirm(t('confirmClearAll'))) return;
            for (const site of sites) Settings.removeSiteEnabled(site);
            sitesFeedback.textContent = '';
            renderSites();
            onCurrentSiteCleared();
            onFeatureStateMaybeChanged();
        };

        renderSites();

        return {
            subpanel,
            renderSites,
            refreshText() {
                sitesAddCurrent.textContent = t('btnAddCurrent');
                sitesClearAll.textContent = t('btnClearAll');
                sitesInput.placeholder = t('inputPlaceholder');
                sitesAdd.textContent = t('btnAdd');
                sitesHint.textContent = t('sitesHint');
                subTitle.textContent = t('subpanelSitesTitle');
            },
        };
    }

    function createHeaderSection({ hostname, host, onLangChange }) {
        const header = document.createElement('div');
        header.className = 'ffa-nr-menu__header';

        // 左侧按钮组
        const btns = document.createElement('div');
        btns.className = 'ffa-nr-menu__header-btns';

        const themeBtn = document.createElement('div');
        themeBtn.className = 'ffa-nr-icon-btn';

        const langBtn = document.createElement('div');
        langBtn.className = 'ffa-nr-icon-btn';
        langBtn.title = t('langLabel');

        btns.append(themeBtn, langBtn);

        // 右侧文字区：脚本名 + 域名垂直排列
        const textGroup = document.createElement('div');
        textGroup.className = 'ffa-nr-menu__header-text';

        const title = document.createElement('span');
        title.className = 'ffa-nr-menu__title';
        title.textContent = t('panelTitle');

        const hostLabel = document.createElement('span');
        hostLabel.className = 'ffa-nr-menu__host';
        hostLabel.textContent = hostname;

        textGroup.append(title, hostLabel);
        header.append(btns, textGroup);

        const syncThemeButton = () => {
            const mode = getEffectiveThemeMode();
            const isDark = mode === 'dark';
            themeBtn.innerHTML = isDark ? THEME_ICON_MOON : THEME_ICON_SUN;
            themeBtn.title = isDark ? t('themeSwitchToLight') : t('themeSwitchToDark');
            themeBtn.classList.toggle('ffa-nr-icon-btn--dark', isDark);
            themeBtn.classList.toggle('ffa-nr-icon-btn--light', !isDark);
        };

        themeBtn.onclick = () => {
            const current = getEffectiveThemeMode();
            const next = current === 'dark' ? 'light' : 'dark';
            Settings.update({ themeMode: next });
            applyThemeVars(host);
            syncThemeButton();
        };

        syncThemeButton();

        const syncLangButton = () => {
            langBtn.title = t('langLabel');
            langBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.022 7h1a1 1 0 0 1 1 1v1a1 1 0 0 0 2 0V8a3.003 3.003 0 0 0-3-3h-1a1 1 0 0 0 0 2m-4 9h-1a1 1 0 0 1-1-1v-1a1 1 0 0 0-2 0v1a3.003 3.003 0 0 0 3 3h1a1 1 0 0 0 0-2m11-1a1 1 0 0 0 0-2h-3v-.5a1 1 0 0 0-2 0v.5h-3a1 1 0 0 0 0 2h5.184a6.7 6.7 0 0 1-1.225 2.527a6.7 6.7 0 0 1-.63-.983a1 1 0 1 0-1.779.912a8.7 8.7 0 0 0 .96 1.468a6.6 6.6 0 0 1-2.426 1.099a1 1 0 0 0 .427 1.954a8.6 8.6 0 0 0 3.445-1.622a8.7 8.7 0 0 0 3.469 1.622a1 1 0 1 0 .43-1.954a6.7 6.7 0 0 1-2.446-1.09A8.74 8.74 0 0 0 20.244 15Zm-11.97-3.757a1 1 0 0 0 1.94-.486l-1.757-7.03a2.281 2.281 0 0 0-4.426 0l-1.757 7.03a1 1 0 0 0 1.94.486L5.552 9h2.94ZM6.052 7l.698-2.787a.291.291 0 0 1 .544 0L7.991 7Z"/></svg>`;
        };

        langBtn.onclick = () => {
            const current = getEffectiveLang();
            Settings.update({ lang: current === 'zh' ? 'en' : 'zh' });
            syncLangButton();
            if (typeof onLangChange === 'function') onLangChange();
        };

        syncLangButton();
        return { header, syncLangButton };
    }

    function createFooterSection({ isGlobalEnabled, onToggleGlobal, onManageSites }) {
        const footer = document.createElement('div');
        footer.className = 'ffa-nr-footer';

        const btnSites = document.createElement('div');
        btnSites.className = 'ffa-nr-btn ffa-nr-btn--tertiary';
        btnSites.textContent = t('btnManageSites');
        btnSites.onclick = onManageSites;

        const btnGlobal = document.createElement('div');
        btnGlobal.className = 'ffa-nr-btn ffa-nr-btn--primary';
        btnGlobal.textContent = isGlobalEnabled ? t('btnDisableGlobal') : t('btnEnableGlobal');
        btnGlobal.onclick = onToggleGlobal;

        footer.append(btnSites, btnGlobal);

        return {
            footer,
            btnSites,
            setGlobalButtonText(isEnabled) {
                btnGlobal.textContent = isEnabled ? t('btnDisableGlobal') : t('btnEnableGlobal');
            },
            refreshText() {
                btnSites.textContent = t('btnManageSites');
            },
        };
    }

    function createHookSection({ hooks, onHookChange }) {
        const divider1 = document.createElement('div');
        divider1.className = 'ffa-nr-divider';

        const hookEventListener = createRow(
            t('hookEventListener'),
            t('hookAELHint'),
            hooks.addEventListener,
            (on) => {
                hooks.addEventListener = on;
                onHookChange();
            }
        );

        const hookDOM0 = createRow(
            t('hookDOM0'),
            t('hookDOM0Hint'),
            hooks.dom0handlers,
            (on) => {
                hooks.dom0handlers = on;
                onHookChange();
            }
        );

        const hookPreventDefault = createRow(
            t('hookPreventDefault'),
            t('hookPreventDefaultHint'),
            hooks.preventDefault,
            (on) => {
                hooks.preventDefault = on;
                onHookChange();
            }
        );

        const hookUserSelect = createRow(
            t('hookUserSelect'),
            t('hookCSSHint'),
            hooks.cssUserSelect,
            (on) => {
                hooks.cssUserSelect = on;
                onHookChange();
            }
        );

        const divider2 = document.createElement('div');
        divider2.className = 'ffa-nr-divider';

        const setDisabled = (disabled) => {
            hookEventListener.setDisabled(disabled);
            hookDOM0.setDisabled(disabled);
            hookPreventDefault.setDisabled(disabled);
            hookUserSelect.setDisabled(disabled);
        };

        return {
            nodes: [divider1, hookEventListener.row, hookDOM0.row, hookPreventDefault.row, hookUserSelect.row, divider2],
            setDisabled,
            refreshText() {
                hookEventListener.refresh(t('hookEventListener'), t('hookAELHint'));
                hookDOM0.refresh(t('hookDOM0'), t('hookDOM0Hint'));
                hookPreventDefault.refresh(t('hookPreventDefault'), t('hookPreventDefaultHint'));
                hookUserSelect.refresh(t('hookUserSelect'), t('hookCSSHint'));
            },
        };
    }

    function mountUI() {
        if (!Settings.current.showBadge) return;

        // ── Shadow DOM 宿主 ──
        const host = document.createElement('div');
        host.id = 'ffa-norestrict-host';
        applyThemeVars(host);
        document.documentElement.appendChild(host);

        const shadow = host.attachShadow({ mode: 'open' });
        const styleEl = document.createElement('style');
        styleEl.textContent = UI_CSS;
        shadow.appendChild(styleEl);

        const root = document.createElement('div');
        root.className = 'ffa-nr-root';
        shadow.appendChild(root);

        const s = Settings.current;

        // ── 迷你图标 ──
        const miniIcon = document.createElement('div');
        miniIcon.className = 'ffa-nr-mini-icon';
        miniIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 12l-3 9l18-9L3 3zm0 0h6"/></svg>`;

        // ── 热区（覆盖左下角，比图标更大，捕捉鼠标接近） ──
        const miniHitArea = document.createElement('div');
        miniHitArea.className = 'ffa-nr-mini-hitarea';

        // ── 弹出菜单 ──
        const menu = document.createElement('div');
        menu.className = 'ffa-nr-menu';
        const menuBody = document.createElement('div');
        menuBody.className = 'ffa-nr-menu__body';

        // ── 迷你图标状态同步 ──
        const syncMiniIcon = () => {
            miniIcon.classList.toggle('ffa-nr-mini-icon--off', !isFeatureActive());
        };

        const showMiniIcon = () => {
            miniIcon.classList.remove('ffa-nr-mini-icon--hidden');
            miniHitArea.style.pointerEvents = 'auto';
        };

        const hideMiniIcon = () => {
            miniIcon.classList.add('ffa-nr-mini-icon--hidden');
            miniHitArea.style.pointerEvents = 'none';
        };

        const { header, syncLangButton } = createHeaderSection({ hostname, host, onLangChange: () => {
            refreshAllText();
        }});

        // 主开关行
        const { row: rowEnabled, sw: swEnabled, refresh: refreshRowEnabled } = createRow(
            t('enabledOnPage'),
            t('enabledOnPageHint'),
            _sessionSiteEnabled,
            (on) => {
                _sessionSiteEnabled = on;
                syncMiniIcon();
                updateRuntimeFeatures();
                syncHookRowsState();
                syncMainSwitchState();
            }
        );

        const hookSection = createHookSection({
            hooks: s.hooks,
            onHookChange: () => {
                Settings.save();
                location.reload();
            },
        });

        const syncHookRowsState = () => {
            hookSection.setDisabled(!isFeatureActive());
        };

        const syncMainSwitchState = () => {
            swEnabled.classList.toggle('ffa-nr-switch--on', isFeatureActive());
        };

        const refreshAllText = () => {
            refreshRowEnabled(t('enabledOnPage'), t('enabledOnPageHint'));
            hookSection.refreshText();
            footerSection.refreshText();
            footerSection.setGlobalButtonText(Settings.current.enabled);
            sitesSubpanel.refreshText();
            syncLangButton();
        };

        const refreshFeatureUIState = () => {
            syncMiniIcon();
            updateRuntimeFeatures();
            syncHookRowsState();
            syncMainSwitchState();
        };

        const sitesSubpanel = createSitesSubpanel({
            hostname,
            onFeatureStateMaybeChanged: refreshFeatureUIState,
            onCurrentSitePersisted: () => { _sessionSiteEnabled = true; },
            onCurrentSiteCleared: () => { /* keep session state */ },
            onBack: () => sitesSubpanel.subpanel.classList.remove('ffa-nr-subpanel--visible'),
        });

        const footerSection = createFooterSection({
            isGlobalEnabled: s.enabled,
            onToggleGlobal: () => {
                const next = !Settings.current.enabled;
                Settings.update({ enabled: next });
                footerSection.setGlobalButtonText(next);
                refreshFeatureUIState();
            },
            onManageSites: () => {
                sitesSubpanel.renderSites();
                sitesSubpanel.subpanel.classList.add('ffa-nr-subpanel--visible');
            },
        });

        const divider3 = document.createElement('div');
        divider3.className = 'ffa-nr-divider';

        menuBody.append(rowEnabled, ...hookSection.nodes, divider3);

        const menuInner = document.createElement('div');
        menuInner.className = 'ffa-nr-menu__inner';
        menuInner.append(menuBody, footerSection.footer, sitesSubpanel.subpanel);
        menu.append(header, menuInner);
        syncHookRowsState();
        syncMainSwitchState();
        syncMiniIcon();

        // ── 交互：热区 / 图标点击打开菜单 ──
        const openMenu = (e) => {
            e.stopPropagation();
            menu.classList.add('ffa-nr-menu--visible');
            hideMiniIcon();
        };

        miniIcon.addEventListener('click', openMenu);
        miniHitArea.addEventListener('click', openMenu);

        // 点击外部关闭
        document.addEventListener('click', () => {
            if (menu.classList.contains('ffa-nr-menu--visible')) {
                menu.classList.remove('ffa-nr-menu--visible');
                showMiniIcon();
            }
        });
        shadow.addEventListener('click', e => e.stopPropagation());

        root.append(menu, miniIcon, miniHitArea);
    }

    // ─── 初始化 ───────────────────────────────────────────────────────────────────

    function init() {
        Settings.load();
        _sessionSiteEnabled = Settings.isSiteEnabled();

        // Hook 必须在 document-start 就安装（此时页面脚本尚未注入）
        installAddEventListenerHook();
        installPreventDefaultHook();
        updateRuntimeFeatures();

        // DOM ready 后再做需要访问 DOM 的操作
        const onReady = () => {
            _domReady = true;
            mountUI();
            updateRuntimeFeatures();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady, { once: true });
        } else {
            onReady();
        }

    }

    init();

})();
