// ==UserScript==
// @name         FFA Omnibar
// @namespace    https://github.com/ffainy/FFA-UserScripts
// @description  A floating search toolbar — unify Google, Bing, Baidu, Bilibili, Wikipedia, Steam and more. Switch engines instantly, get real-time suggestions, customize themes, fonts, and layout.
// @description:zh-CN  悬浮搜索栏，整合 Google、Bing、百度、Bilibili、维基百科、Steam 等引擎，即时切换，智能补全，支持主题、字体与布局自定义。
// @icon64       data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjZjk1Y2UzIiBkPSJNMCAxMmMwIDkuNjggMi4zMiAxMiAxMiAxMnMxMi0yLjMyIDEyLTEyUzIxLjY4IDAgMTIgMFMwIDIuMzIgMCAxMm00Ljg0IDIuNDkybDMuNzYyLTguNTU1QzkuMjM4IDQuNDk4IDEwLjQ2IDMuNzE2IDEyIDMuNzE2czIuNzYyLjc4MSAzLjM5OCAyLjIyM2wzLjc2MiA4LjU1NGMuMTcyLjQxOC4zMi45NTMuMzIgMS40MThjMCAyLjEyNS0xLjQ5MiAzLjYxNy0zLjYxNyAzLjYxN2MtLjcyNiAwLTEuMy0uMTgzLTEuODgzLS4zN2MtLjU5Ny0uMTkyLTEuMjAzLS4zODctMS45OC0uMzg3Yy0uNzcgMC0xLjM5LjE5NS0xLjk5Ni4zODZjLS41OS4xODgtMS4xNjguMzcxLTEuODY3LjM3MWMtMi4xMjUgMC0zLjYxNy0xLjQ5Mi0zLjYxNy0zLjYxN2MwLS40NjUuMTQ4LTEgLjMyLTEuNDE4Wk0xMiA3LjQzbC0zLjcxNSA4LjQwNmMxLjEwMi0uNTEyIDIuMzcxLS43NTggMy43MTUtLjc1OGMxLjI5NyAwIDIuNjEzLjI0NiAzLjY2NC43NThaIi8+PC9zdmc+
// @version      3.4.0
// @author       Farfaraway
// @homepage     https://github.com/ffainy/FFA-UserScripts
// @supportURL   https://github.com/ffainy/FFA-UserScripts/issues
// @updateURL    https://raw.githubusercontent.com/ffainy/FFA-UserScripts/refs/heads/master/FFA-Omnibar.js
// @tag          productivity
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      suggestqueries.google.com
// @connect      suggestion.baidu.com
// @connect      ac.duckduckgo.com
// @noframes
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    let _isInitialized = false;

    const STORAGE_KEY = 'ffa_omnibar_settings';
    const HISTORY_KEY = 'ffa_omnibar_history';
    const HISTORY_MAX = 20;

    const DEFAULT_ENGINES = [
        { name: 'Google',    url: 'https://www.google.com/search?q=%s',                host: 'www.google.com',         enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133c-1.147 1.147-2.933 2.4-6.053 2.4c-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0C5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36c2.16-2.16 2.84-5.213 2.84-7.667c0-.76-.053-1.467-.173-2.053z"/></svg>' },
        { name: 'DuckDuckGo',url: 'https://duckduckgo.com/?q=%s',                      host: 'duckduckgo.com',         enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12s12-5.37 12-12S18.63 0 12 0m0 .984C18.083.984 23.016 5.916 23.016 12S18.084 23.016 12 23.016S.984 18.084.984 12S5.916.984 12 .984m0 .938C6.434 1.922 1.922 6.434 1.922 12c0 4.437 2.867 8.205 6.85 9.55c-.237-.82-.776-2.753-1.6-6.052c-1.184-4.741-2.064-8.606 2.379-9.813c.047-.011.064-.064.03-.093c-.514-.467-1.382-.548-2.233-.38a.06.06 0 0 1-.07-.058c0-.011 0-.023.011-.035c.205-.286.572-.507.822-.64a1.8 1.8 0 0 0-.607-.335c-.059-.022-.059-.12-.006-.144q.008-.01.024-.012c1.749-.233 3.586.292 4.49 1.448a.1.1 0 0 0 .035.023c2.968.635 3.509 4.837 3.328 5.998a9.6 9.6 0 0 0 2.346-.576c.746-.286 1.008-.222 1.101-.053c.1.193-.018.513-.28.81c-.496.567-1.393 1.01-2.974 1.137c-.546.044-1.029.024-1.445.006c-.789-.035-1.339-.059-1.633.39c-.192.298-.041.998 1.487 1.22c1.09.157 2.078.047 2.798-.034c.643-.07 1.073-.118 1.172.069c.21.402-.996 1.207-3.066 1.224q-.238-.002-.467-.011c-1.283-.065-2.227-.414-2.816-.735a.1.1 0 0 1-.035-.017c-.105-.059-.31.045-.188.267c.07.134.444.478 1.004.776c-.058.466.087 1.184.338 2l.088-.016q.063-.015.134-.025c.507-.082.775.012.926.175c.717-.536 1.913-1.294 2.03-1.154c.583.694.66 2.332.53 2.99q-.006.018-.04.035c-.274.117-1.783-.296-1.783-.511c-.059-1.075-.26-1.173-.493-1.225h-.156a.1.1 0 0 1 .018.03l.052.12c.093.257.24 1.063.13 1.26c-.112.199-.835.297-1.284.303c-.443.006-.543-.158-.637-.408c-.07-.204-.103-.675-.103-.95a1 1 0 0 1 .012-.216c-.134.058-.333.193-.397.281c-.017.262-.017.682.123 1.149c.07.221-1.518 1.164-1.74.99c-.227-.181-.634-1.952-.459-2.67c-.187.017-.338.075-.42.191c-.367.508.093 2.933.582 3.248c.257.169 1.54-.553 2.176-1.095c.105.145.305.158.553.158c.326-.012.782-.06 1.103-.158c.192.45.423.972.613 1.388c4.47-1.032 7.803-5.037 7.803-9.82c0-5.566-4.512-10.078-10.078-10.078m1.791 5.646c-.42 0-.678.146-.795.332c-.023.047.047.094.094.07c.14-.075.357-.161.701-.156c.328.006.516.09.67.159l.023.01c.041.017.088-.03.059-.065c-.134-.18-.332-.35-.752-.35m-5.078.198a1.2 1.2 0 0 0-.522.082c-.454.169-.67.526-.67.76c0 .051.112.057.141.011c.081-.123.21-.31.617-.478c.408-.17.73-.146.951-.094c.047.012.083-.041.041-.07a1 1 0 0 0-.558-.211m5.434 1.423a.65.65 0 0 0-.655.647a.652.652 0 0 0 1.307 0a.646.646 0 0 0-.652-.647m.283.262h.008a.17.17 0 0 1 .17.17c0 .093-.077.17-.17.17a.17.17 0 0 1-.17-.17c0-.09.072-.165.162-.17m-5.358.076a.75.75 0 0 0-.758.758c0 .42.338.758.758.758s.758-.337.758-.758a.756.756 0 0 0-.758-.758m.328.303h.01a.199.199 0 1 1 0 .397a.195.195 0 0 1-.197-.198c0-.107.082-.194.187-.199"/></svg>' },
        { name: 'Bing',      url: 'https://www.bing.com/search?q=%s',                  host: 'bing.com',               enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="-4 -2 24 24"><path fill="currentColor" d="M15.973 8.57a.48.48 0 0 0-.317-.434L6.273 5.23c-.175-.054-.255.039-.178.206L7.84 9.269c.077.168.276.367.442.443l2.394 1.096c.166.076.17.209.008.295L.47 16.535c-.161.086-.182.056-.046-.067l3.924-3.534a.86.86 0 0 0 .248-.558L4.6 1.664a.48.48 0 0 0-.318-.435L.355.014C.18-.04.037.067.037.252v16.25c0 .185.122.423.272.529l3.99 2.827c.15.106.4.115.557.02l10.832-6.523a.66.66 0 0 0 .286-.507V8.57z"/></svg>' },
        { name: 'Baidu',     url: 'https://www.baidu.com/s?wd=%s',                     host: 'www.baidu.com',          enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.154 0C7.71 0 6.54 1.658 6.54 3.707c0 2.051 1.171 3.71 2.615 3.71c1.446 0 2.614-1.659 2.614-3.71C11.768 1.658 10.6 0 9.154 0m7.025.594C14.86.58 13.347 2.589 13.2 3.927c-.187 1.745.25 3.487 2.179 3.735c1.933.25 3.175-1.806 3.422-3.364c.252-1.555-.995-3.364-2.362-3.674a1.2 1.2 0 0 0-.261-.03zM3.582 5.535a3 3 0 0 0-.156.008c-2.118.19-2.428 3.24-2.428 3.24c-.287 1.41.686 4.425 3.297 3.864c2.617-.561 2.262-3.68 2.183-4.362c-.125-1.018-1.292-2.773-2.896-2.75m16.534 1.753c-2.308 0-2.617 2.119-2.617 3.616c0 1.43.121 3.425 2.988 3.362s2.553-3.238 2.553-3.988c0-.745-.62-2.99-2.924-2.99m-8.264 2.478c-1.424.014-2.708.925-3.323 1.947c-1.118 1.868-2.863 3.05-3.112 3.363c-.25.309-3.61 2.116-2.864 5.42c.746 3.301 3.365 3.237 3.365 3.237s1.93.19 4.171-.31c2.24-.495 4.17.123 4.17.123s5.233 1.748 6.665-1.616c1.43-3.364-.808-5.109-.808-5.109s-2.99-2.306-4.736-4.798c-1.072-1.665-2.348-2.268-3.528-2.257m-2.234 3.84l1.542.024v8.197H7.758c-1.47-.291-2.055-1.292-2.13-1.462c-.072-.173-.488-.976-.268-2.343c.635-2.049 2.447-2.196 2.447-2.196h1.81zm3.964 2.39v3.881c.096.413.612.488.612.488h1.614v-4.343h1.689v5.782h-3.915c-1.517-.39-1.59-1.465-1.59-1.465v-4.317zm-5.458 1.147c-.66.197-.978.708-1.05.928c-.076.22-.247.78-.1 1.269c.294 1.095 1.248 1.144 1.248 1.144h1.37v-3.34z"/></svg>' },
        { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s',    host: 'en.wikipedia.org',       enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 4.984h2m3 0h2.5m4 0H17m5 0h-2m-16 0L9.455 19.5L16 4.984"/><path d="M9 4.984L15 19.5l6-14.516"/></g></svg>' },
        { name: 'GitHub',    url: 'https://github.com/search?q=%s',                    host: 'github.com',             enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>' },
        { name: 'X',         url: 'https://x.com/search?q=%s',                         host: 'x.com',                  enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="m17.687 3.063l-4.996 5.711l-4.32-5.711H2.112l7.477 9.776l-7.086 8.099h3.034l5.469-6.25l4.78 6.25h6.102l-7.794-10.304l6.625-7.571zm-1.064 16.06L5.654 4.782h1.803l10.846 14.34z"/></svg>' },
        { name: 'YouTube',   url: 'https://www.youtube.com/results?search_query=%s',   host: 'www.youtube.com',        enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M23.498 6.186a3.02 3.02 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.02 3.02 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.02 3.02 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.02 3.02 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.545 15.568V8.432L15.818 12z"/></svg>' },
        { name: 'Bilibili',  url: 'https://search.bilibili.com/all?keyword=%s',        host: 'search.bilibili.com',    enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.813 4.653h.854q2.266.08 3.773 1.574Q23.946 7.72 24 9.987v7.36q-.054 2.266-1.56 3.773c-1.506 1.507-2.262 1.524-3.773 1.56H5.333q-2.266-.054-3.773-1.56C.053 19.614.036 18.858 0 17.347v-7.36q.054-2.267 1.56-3.76t3.773-1.574h.774l-1.174-1.12a1.23 1.23 0 0 1-.373-.906q0-.534.373-.907l.027-.027q.4-.373.92-.373t.92.373L9.653 4.44q.107.106.187.213h4.267a.8.8 0 0 1 .16-.213l2.853-2.747q.4-.373.92-.373c.347 0 .662.151.929.4s.391.551.391.907q0 .532-.373.906zM5.333 7.24q-1.12.027-1.88.773q-.76.748-.786 1.894v7.52q.026 1.146.786 1.893t1.88.773h13.334q1.12-.026 1.88-.773t.786-1.893v-7.52q-.026-1.147-.786-1.894t-1.88-.773zM8 11.107q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q0-.56.386-.947q.387-.386.947-.386m8 0q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q.025-.586.4-.96q.373-.373.933-.373"/></svg>' },
        { name: 'Steam',     url: 'https://store.steampowered.com/search/?term=%s',    host: 'store.steampowered.com', enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658a3.4 3.4 0 0 1 1.912-.59q.094.001.188.006l2.861-4.142V8.91a4.53 4.53 0 0 1 4.524-4.524c2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911l.004.159a3.39 3.39 0 0 1-3.39 3.396a3.41 3.41 0 0 1-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0M7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25a2.551 2.551 0 0 0 3.337-3.324a2.547 2.547 0 0 0-3.255-1.413l1.523.63a1.878 1.878 0 0 1-1.445 3.467zm11.415-9.303a3.02 3.02 0 0 0-3.015-3.015a3.015 3.015 0 1 0 3.015 3.015m-5.273-.005a2.264 2.264 0 1 1 4.531 0a2.267 2.267 0 0 1-2.266 2.265a2.264 2.264 0 0 1-2.265-2.265"/></svg>' },
    ];

    const THEMES = {
        minimal: { n: { en: 'Clean Steel',  zh: '极简工业' }, b: '#F4F4F5', a: '#1A1A2E', r: 8,  ir: 6,  ta: 70, pa: 80, glow: 0.6 },
        warm:    { n: { en: 'Warm Reading', zh: '午后书屋' }, b: '#F5ECD8', a: '#8B5E3C', r: 20, ir: 10, ta: 65, pa: 75, glow: 0.9 },
        cyber:   { n: { en: 'Neon Noir',    zh: '暗夜霓虹' }, b: '#080810', a: '#00FFEA', r: 28, ir: 14, ta: 35, pa: 45, glow: 1.6 },
        forest:  { n: { en: 'Deep Forest',  zh: '宁静森林' }, b: '#0A1A0F', a: '#5C7A5A', r: 16, ir: 10, ta: 40, pa: 50, glow: 1.2 },
    };

    const LOCALES = {
        panelTitle:          { en: 'FFA Omnibar',                    zh: 'FFA Omnibar'         },
        cardTheme:           { en: 'Theme',                          zh: '主题'                },
        cardVisual:          { en: 'Appearance',                     zh: '外观'                },
        cardInteraction:     { en: 'Toolbar',                        zh: '搜索条'               },
        cardEngines:         { en: 'Search Engines',                 zh: '搜索引擎'             },
        cardSearch:          { en: 'Search',                         zh: '搜索'                },
        cardLanguage:        { en: 'Language',                       zh: '语言'                },
        cardData:            { en: 'Import & Export',                zh: '导入导出'             },
        labelOffset:         { en: 'Bottom Gap',                     zh: '底部间距'             },
        labelFontSize:       { en: 'Font Size',                      zh: '字体大小'             },
        labelPanelRadius:    { en: 'Panel Radius',                   zh: '面板圆角'             },
        labelWidgetRadius:   { en: 'Corner Radius',                  zh: '元素圆角'             },
        labelToolbarAlpha:   { en: 'Toolbar Opacity',                zh: '搜索条透明度'          },
        labelPanelAlpha:     { en: 'Panel Opacity',                  zh: '面板透明度'            },
        labelToolbarBlur:    { en: 'Toolbar Blur',                   zh: '搜索条模糊'            },
        labelPanelBlur:      { en: 'Panel Blur',                     zh: '面板模糊'              },
        labelBgColor:        { en: 'Background',                     zh: '背景颜色'             },
        labelAccentColor:    { en: 'Accent',                         zh: '强调颜色'             },
        labelMiniMode:       { en: 'Mini Mode',                      zh: '迷你模式'             },
        hintMiniMode:        { en: 'Collapse to a small icon when idle', zh: '空闲时收起为小图标' },
        labelNewTab:         { en: 'Open in New Tab',                zh: '新标签页打开'         },
        hintNewTab:          { en: 'Search results open in a new tab', zh: '搜索结果将在新标签页打开' },
        labelFont:           { en: 'Font Family',                    zh: '字体族'               },
        labelFontHint:       { en: 'e.g. "Microsoft Yahei"',         zh: '例如 "Microsoft Yahei"' },
        btnAddEngine:        { en: 'Add Engine',                     zh: '添加引擎'             },
        btnApply:            { en: 'Apply & Reload',                 zh: '应用并刷新'            },
        btnReset:            { en: 'Reset',                          zh: '恢复默认'             },
        btnExport:           { en: 'Export',                         zh: '导出'                },
        btnImport:           { en: 'Import',                         zh: '导入'                },
        importFail:          { en: 'Invalid settings file.',         zh: '文件格式无效。'        },
        subPanelTitle:       { en: 'Edit Engine',                    zh: '编辑引擎'             },
        subPanelTitleAdd:    { en: 'Add Engine',                     zh: '添加引擎'             },
        labelName:           { en: 'Name',                           zh: '名称'                },
        labelUrl:            { en: 'Search URL',                     zh: '搜索网址'             },
        labelHost:           { en: 'Hostname',                       zh: '主机名'              },
        labelIcon:           { en: 'Icon (optional)',                zh: '图标（可选）'          },
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
        hintNameDesc:        { en: 'Shown on the toolbar button. Keep it short.', zh: '显示在工具栏按钮上的名称，建议简短。' },
        hintNameEx:          { en: 'Google',                         zh: 'Google'              },
        hintUrlDesc:         { en: 'Search URL template. Use %s as the query placeholder.', zh: '搜索链接模板，用 %s 代表搜索词。' },
        hintUrlEx:           { en: 'https://www.google.com/search?q=%s', zh: 'https://www.google.com/search?q=%s' },
        hintHostDesc:        { en: 'Domain of the results page. Used to highlight the active engine.', zh: '搜索结果页的域名，用于识别当前页面并高亮对应按钮。' },
        hintHostEx:          { en: 'www.google.com',                 zh: 'www.google.com'      },
        hintHostTip:         { en: 'Tip: extract the domain from your Search URL.', zh: '提示：从搜索网址中截取域名部分即可。' },
        hintIconDesc:        { en: "Paste a base64 data URI. Leave blank to use the engine's initial.", zh: '粘贴 base64 data URI。留空则自动使用首字母作为图标。' },
        hintIconFmt1:        { en: 'Format — Base64 data URI:',      zh: '格式 — Base64 data URI：' },
        hintIconEx1:         { en: 'data:image/svg+xml;base64,PHN2Zy4uLg==', zh: 'data:image/svg+xml;base64,PHN2Zy4uLg==' },
        hintIconErr:         { en: 'Invalid format. Must start with data:image/', zh: '格式错误，必须以 data:image/ 开头。' },
        labelSuggestionsToggle:  { en: 'Search Suggestions',                      zh: '关键字预测'                       },
        hintSuggestionsToggle:   { en: 'Fetch real-time suggestions while typing', zh: '输入时从搜索引擎拉取实时补全建议' },
        labelHistoryToggle:      { en: 'Search History',                           zh: '历史关键字记录'                   },
        hintHistoryToggle:       { en: 'Save recent searches for quick access',    zh: '保存搜索词并在下次输入时快速回调' },
        cardBlacklist:       { en: 'Blocklist',                                   zh: '黑名单'                           },
        labelBlacklistHint:  { en: 'Omnibar is hidden on exact matching domains. Add each domain separately — <code>example.com</code> and <code>www.example.com</code> are treated as different entries.', zh: '以下域名上不显示搜索栏，精确匹配。<code>example.com</code> 和 <code>www.example.com</code> 视为不同条目，需分别添加。' },
        labelBlacklistInput: { en: 'e.g. google.com',                             zh: '例如 google.com'                  },
        btnAddDomain:        { en: 'Add',                                         zh: '添加'                             },
        btnAddCurrent:       { en: '+ Add current site',                          zh: '+ 添加当前网站'                   },
        blacklistEmpty:      { en: 'No sites blocked.',                           zh: '暂无屏蔽站点。'                   },
        blacklistDuplicate:  { en: 'Already in blocklist.',                       zh: '该域名已在黑名单中。'              },
        tabGeneral:          { en: 'General',                                     zh: '通用'                             },
        tabAppearance:       { en: 'Appearance',                                  zh: '外观'                             },
        tabEngines:          { en: 'Engines',                                     zh: '引擎'                             },
        tabBlocklist:        { en: 'Blocklist',                                   zh: '黑名单'                           },
        cardColors:          { en: 'Colors & Font',                               zh: '颜色与字体'                        },
        cardLayout:          { en: 'Size & Shape',                                zh: '尺寸与形状'                        },
        cardOpacity:         { en: 'Opacity & Blur',                              zh: '透明度与模糊'                      },
    };

    const DEFAULT_SETTINGS = {
        bt: 30,           // 搜索条距页面底部的距离 (px)
        fs: 14,           // 基准字号 (px)，所有 UI 字号均基于此缩放
        ta: 50,           // 搜索条背景透明度 (%)
        pa: 60,           // 设置面板背景透明度 (%)
        tb: 40,           // 搜索条背景模糊半径 (px)
        pb: 45,           // 设置面板背景模糊半径 (px)
        mm: true,         // 迷你模式：空闲时收起为小图标
        lang: 'en',       // 界面语言：'en' | 'zh'
        font: '',         // 自定义字体族（CSS font-family 字符串）
        searchBehavior: {
            openInNewTab: true,  // 搜索结果是否在新标签页打开
            suggestions: true,   // 是否启用关键字预测
            history: true,       // 是否启用历史关键字记录
        },
        bl: [],           // 黑名单：在这些精确域名上隐藏搜索栏
        en: DEFAULT_ENGINES,   // 搜索引擎列表
        ...THEMES.cyber,  // 当前主题（展开字段：b 背景色、a 强调色、r 面板圆角、ir 元素圆角、ta/pa 透明度、glow 光晕强度）
    };

    let _activeTab = 'general'; // 当前激活的设置 tab，内存状态不持久化

    const EventBus = {
        _h: new Map(),
        on(e, fn) {
            if (!this._h.has(e)) this._h.set(e, new Set());
            this._h.get(e).add(fn);
            return () => this._h.get(e)?.delete(fn);
        },
        emit(e, d) {
            this._h.get(e)?.forEach(fn => { try { fn(d); } catch(err) { console.error('[FFA]',e,err); } });
        },
    };

    const SecurityUtils = {
        escapeHtml(str) {
            return String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
        },

        validateIcon(raw) {
            if (!raw?.trim()) return { valid: true, type: 'default', value: '' };
            const trimmed = raw.trim();
            if (trimmed.startsWith('data:image/')) {
                return { valid: true, type: 'base64', value: trimmed };
            }
            return { valid: false, reason: 'unknown_format' };
        },
    };

    function hexToRgba(hex, alpha) {
        const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)||0);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function contrastColor(hex) {
        const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)||0);
        return (r*299+g*587+b*114)/1000 >= 150 ? '#000' : '#fff';
    }

    const escAttr = str => String(str ?? '').replace(/"/g, '&quot;');

    function debounce(fn, delay=16) {
        let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a),delay); };
    }

    const DEFAULT_ICON_URI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xMS43MSAwQzguMjQgMy45IDYuOTIgNiA2LjY0IDkuMTRjLS4wMS0uMDEtLjAzLS4wMS0uMDQtLjAyYy0xLjI4LS43My0yLjMtMi4yMi0yLjkxLTMuNzNsLTIuMjMuODdjMS42NCA0Ljk1IDIuODEgNy4xMyA1LjM5IDguOTRjLS4wMi4wMS0uMDMuMDItLjA1LjAzYy0xLjI3Ljc0LTMuMDcuODktNC42OC42NmwtLjM2IDIuMzdjNS4xMSAxLjA2IDcuNTkgMS4xNSAxMC40Ni0uMTl2LjA2YzAgMS40Ny0uNzcgMy4wOS0xLjc4IDQuMzhMMTIuMyAyNGMzLjQ2LTMuODkgNC43OC01Ljk5IDUuMDYtOS4xM2MuMDIuMDEuMDMuMDEuMDUuMDJjMS4yNy43MyAyLjI5IDIuMjEgMi45IDMuNzNsMi4yMy0uODdjLTEuNjQtNC45NS0yLjgtNy4xNC01LjM5LTguOTVjLjAyLS4wMS4wMy0uMDIuMDUtLjAzYzEuMjctLjc0IDMuMDctLjg4IDQuNjgtLjY1bC4zNi0yLjM4Yy01LjEtMS4wNi03LjU4LTEuMTQtMTAuNDQuMTl2LS4wNmMwLTEuNDcuNzctMy4wOSAxLjc4LTQuMzh6bS4xOSA4LjgyYTMuMTggMy4xOCAwIDAgMSAzLjI4IDMuMDdhMy4xOCAzLjE4IDAgMCAxLTMuMDcgMy4yOGEzLjE4IDMuMTggMCAwIDEtMy4yOC0zLjA3YTMuMTggMy4xOCAwIDAgMSAzLjA3LTMuMjgiLz48L3N2Zz4=';

    function decodeBase64Icon(dataUri, size = 16) {
        const img = document.createElement('img');
        img.src = dataUri;
        img.style.cssText = `width:${size}px;height:${size}px`;
        img.draggable = false;
        return img;
    }

    function renderIconElement(iconValue, size = 16) {
        if (!iconValue) {
            return decodeBase64Icon(DEFAULT_ICON_URI, size);
        }
        if (iconValue.startsWith('<svg')) {
            const wrap = document.createElement('span');
            wrap.innerHTML = iconValue;
            const svg = wrap.querySelector('svg');
            if (svg) {
                svg.style.width = size + 'px';
                svg.style.height = size + 'px';
                return svg;
            }
        }
        return decodeBase64Icon(iconValue, size);
    }

    function t(key) {
        const entry = LOCALES[key];
        if (!entry) return key;
        const lang = SettingsManager.current?.lang ?? 'en';
        return entry[lang] ?? entry.en;
    }

    function extractPageQuery() {
        const p = new URLSearchParams(location.search);
        return p.get('q') || p.get('wd') || p.get('keyword') || p.get('search') || '';
    }

    function matchCurrentPageToEngine() {
        const currentHost = window.location.host;
        const enabled = SettingsManager.current?.en?.filter(e => e.enabled) ?? [];
        return enabled.find(e => e.host === currentHost)
            || enabled.find(e => currentHost.endsWith('.' + e.host))
            || null;
    }

    function performSearch(engineUrl, query) {
        const term = query?.trim();
        if (!engineUrl || !term) return;
        const url = engineUrl.replace('%s', encodeURIComponent(term));
        if (SettingsManager.current?.searchBehavior?.history) {
            HistoryModule.push(term);
        }
        SettingsManager.current?.searchBehavior?.openInNewTab
            ? window.open(url, '_blank') : (location.href = url);
    }

    const BUILTIN_HOSTS = new Set(DEFAULT_ENGINES.map(e => e.host));

    function updateIconPreview(raw, el) {
        if (!el) return;
        if (!raw?.trim()) {
            el.innerHTML = '<span style="font-size:var(--ffa-font-size-xs);opacity:0.4">—</span>';
            return;
        }
        const result = SecurityUtils.validateIcon(raw);
        if (!result.valid) {
            el.innerHTML = '<span style="font-size:var(--ffa-font-size-md)">✕</span>';
            return;
        }
        el.innerHTML = '';
        el.appendChild(decodeBase64Icon(result.value, 24));
    }

    // ─── CSS 变量构建 ────────────────────────────────────────────────────────────
    // 命名规范：--ffa-* 前缀，按功能分层：
    //   间距/尺寸：--ffa-offset-bottom / --ffa-radius-panel / --ffa-radius-widget / --ffa-font-size-*
    //   背景色：   --ffa-bg-panel / --ffa-bg-panel-deep / --ffa-bg-toolbar / --ffa-bg-inner / --ffa-bg-inner-strong
    //   文字色：   --ffa-text-primary / --ffa-text-secondary / --ffa-text-on-accent
    //   强调色：   --ffa-accent / --ffa-accent-glow / --ffa-border
    //   文字光晕： --ffa-glow-accent-sm / -md / -lg / --ffa-glow-on-accent / --ffa-glow-text
    //   效果：     --ffa-font-stack / --ffa-easing / --ffa-shadow / --ffa-backdrop-toolbar / --ffa-backdrop-panel
    function buildCSSVariables(s) {
        const textColor  = contrastColor(s.b);
        const isDark     = textColor === '#fff';
        const glow       = s.glow ?? 1.0;
        const shadowColor = hexToRgba(s.a, isDark ? 0.4 * glow : 0.3 * glow);
        const shadowSpec  = `0 ${isDark ? 20 : 15}px ${Math.round((isDark ? 80 : 60) * glow)}px ${shadowColor}`;
        const saturation  = isDark ? `${Math.round(180 + 30 * glow)}%` : `${Math.round(160 + 20 * glow)}%`;
        const dimText     = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.78)';
        const borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
        const innerBg     = isDark ? hexToRgba(s.a, 0.08) : hexToRgba(s.a, 0.06);
        const innerBg2    = isDark ? hexToRgba(s.a, 0.1) : hexToRgba(s.a, 0.06);
        const nagAlpha    = isDark ? 0.35 * glow : 0.18 * glow;
        const fontStack   = s.font?.trim()
            ? s.font.split(',').map(f => `"${f.trim().replace(/^["']+|["']+$/g, '')}"`).filter(f => f !== '""').join(',') + ','
            : '';

        return `:host,:root{` +
            // ── 间距 & 尺寸 ──
            `--ffa-offset-bottom:${s.bt}px;` +      // 搜索条距底部距离
            `--ffa-radius-panel:${s.r}px;` +         // 面板圆角半径
            `--ffa-radius-widget:${s.ir}px;` +       // 元素（按钮/输入框）圆角半径
            `--ffa-font-size-base:${s.fs}px;` +      // 基准字号
            `--ffa-font-size-xs:${Math.max(s.fs - 3, 9)}px;` + // 辅助文字：提示、徽章、标注
            `--ffa-font-size-sm:${Math.max(s.fs - 2, 9)}px;` + // 次要文字：标签、幽灵按钮
            `--ffa-font-size-md:${s.fs + 2}px;` +              // 强调文字：卡片标题、列表项
            `--ffa-font-size-lg:${s.fs + 6}px;` +              // 大标题：设置面板顶部标题
            // ── 背景色 ──
            `--ffa-bg-panel:${hexToRgba(s.b, s.pa / 100)};` +                              // 面板背景（面板透明度）
            `--ffa-bg-panel-deep:${hexToRgba(s.b, Math.max(s.pa / 100, 0.85))};` +         // 子面板/加深背景（最低 85%）
            `--ffa-bg-toolbar:${hexToRgba(s.b, s.ta / 100)};` +                             // 搜索条背景（搜索条透明度）
            `--ffa-bg-inner:${innerBg};` +            // 内部元素底色（淡化强调色）
            `--ffa-bg-inner-strong:${innerBg2};` +    // 内部元素底色（稍深版本）
            // ── 颜色：强调 & 边框 ──
            `--ffa-accent:${s.a};` +                  // 强调色（十六进制）
            `--ffa-accent-glow:${hexToRgba(s.a, nagAlpha)};` + // 强调色半透明光晕，用于阴影/发光
            `--ffa-border:${borderColor};` +           // 边框色
            // ── 颜色：文字 ──
            `--ffa-text-primary:${textColor};` +       // 主文字色（根据背景亮暗自动取黑或白）
            `--ffa-text-secondary:${dimText};` +       // 次文字色（灰化处理）
            `--ffa-text-on-accent:${contrastColor(s.a)};` + // 强调色背景上的文字色（自动黑或白）
            // ── 文字光晕（三档强度：sm/md/lg） ──
            `--ffa-glow-accent-sm:0 0 6px ${hexToRgba(s.a, 0.55)};` +
            `--ffa-glow-accent-md:0 0 8px ${hexToRgba(s.a, 0.7)},0 0 20px ${hexToRgba(s.a, 0.35)};` +
            `--ffa-glow-accent-lg:0 0 10px ${hexToRgba(s.a, 0.9)},0 0 25px ${hexToRgba(s.a, 0.55)},0 0 50px ${hexToRgba(s.a, 0.25)};` +
            `--ffa-glow-on-accent:0 0 6px ${hexToRgba(contrastColor(s.a) === '#fff' ? '#ffffff' : '#000000', 0.35)};` + // 强调色背景上的文字光晕
            `--ffa-glow-text:0 0 5px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'};` + // 正文色文字光晕
            // ── 效果 ──
            `--ffa-font-stack:${fontStack}system-ui,sans-serif;` + // 字体栈
            `--ffa-easing:cubic-bezier(0.23,1,0.32,1);` +          // 弹性缓动曲线
            `--ffa-shadow:${shadowSpec};` +                          // 投影（发光效果）
            `--ffa-backdrop-toolbar:blur(${s.tb}px) saturate(${saturation});` +  // 搜索条 backdrop-filter
            `--ffa-backdrop-panel:blur(${s.pb}px) saturate(${saturation});` +    // 面板 backdrop-filter
            `}` +
            `:host *{font-family:${fontStack}system-ui,sans-serif !important}`;
    }

    const SettingsManager = {
        _s: null,

        get current() { return this._s; },

        _mergeEngines(saved) {
            const builtinHosts = new Set(DEFAULT_ENGINES.map(e => e.host));
            const merged = DEFAULT_ENGINES.map(def => {
                const s = saved.en?.find(e => e.host === def.host);
                return s ? { ...def, ...s } : { ...def };
            });
            const custom = saved.en?.filter(e => !builtinHosts.has(e.host)) ?? [];
            return [...merged, ...custom];
        },

        load() {
            const saved = GM_getValue(STORAGE_KEY, {});
            this._s = { ...DEFAULT_SETTINGS, ...saved };
            this._s.en = this._mergeEngines(saved);
            if (!Array.isArray(this._s.bl)) this._s.bl = [];
            return this._s;
        },

        save() { GM_setValue(STORAGE_KEY, this._s); },

        update(patch) {
            Object.assign(this._s, patch);
            this.save();
            EventBus.emit('settings:changed', patch);
        },

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

        reorderEngines(newOrder) {
            if (newOrder.length !== this._s.en.length) return false;
            this._s.en = newOrder;
            this.save();
            EventBus.emit('settings:engines:changed');
            return true;
        },

        addToBlacklist(domain) {
            const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
            if (!d) return false;
            if (!this._s.bl) this._s.bl = [];
            if (this._s.bl.includes(d)) return 'duplicate';
            this._s.bl.push(d);
            this.save();
            return true;
        },

        removeFromBlacklist(domain) {
            if (!this._s.bl) return;
            this._s.bl = this._s.bl.filter(d => d !== domain);
            this.save();
        },

        exportJSON() { return JSON.stringify(this._s, null, 2); },

        importJSON(jsonStr) {
            try {
                const saved = JSON.parse(jsonStr);
                if (!saved || typeof saved !== 'object') throw 0;
                this._s = { ...DEFAULT_SETTINGS, ...saved };
                this._s.en = this._mergeEngines(saved);
                if (!Array.isArray(this._s.bl)) this._s.bl = [];
                this.save();
                EventBus.emit('settings:reset');
                return true;
            } catch { return false; }
        },
    };

    const AppRoot = {
        host: null,
        root: null,
        styleEl: null,
        mount: null,

        init() {
            if (this.root) return this.root;

            this.host = document.getElementById('ffa-omnibar-host');
            if (!this.host) {
                this.host = document.createElement('div');
                this.host.id = 'ffa-omnibar-host';
                document.documentElement.appendChild(this.host);
            }

            this.root = this.host.shadowRoot || this.host.attachShadow({ mode: 'open' });
            this.styleEl = this.root.querySelector('#ffa-shadow-style');
            if (!this.styleEl) {
                this.styleEl = document.createElement('style');
                this.styleEl.id = 'ffa-shadow-style';
                this.root.appendChild(this.styleEl);
            }

            this.mount = this.root.querySelector('.ffa-app-root');
            if (!this.mount) {
                this.mount = document.createElement('div');
                this.mount.className = 'ffa-app-root';
                this.root.appendChild(this.mount);
            }

            return this.root;
        },

        isMounted() {
            return this.host?.dataset.ffaMounted === 'true';
        },

        markMounted(flag) {
            if (this.host) this.host.dataset.ffaMounted = flag ? 'true' : 'false';
        },

        resetMount() {
            if (this.mount) this.mount.replaceChildren();
            this.markMounted(false);
        },

        destroy() {
            this.resetMount();
            if (this.host?.isConnected) this.host.remove();
            this.host = null;
            this.root = null;
            this.styleEl = null;
            this.mount = null;
        },

        updateStyles(extraCss = '') {
            if (this.styleEl) this.styleEl.textContent = buildCSSVariables(SettingsManager.current) + APP_CSS + extraCss;
        },
    };

    const StyleEngine = {
        init() {
            AppRoot.init();
            this.update();
        },
        update(extraCss = TOOLBAR_CSS) {
            AppRoot.updateStyles(extraCss);
        },
    };

    // ─── APP_CSS ─────────────────────────────────────────────────────────────────
    // 注入到统一 shadow root 内，作用于整套隔离 UI。
    // 类名规范：ffa-[block] / ffa-[block]__[element] / ffa-[block]--[modifier]
    //
    // 主要块（block）：
    //   .ffa-app-root          — 全局容器
    //   .ffa-overlay           — 设置面板背后的全屏遮罩
    //   .ffa-panel-shell       — 面板定位外壳（含 tab 导航和面板主体）
    //   .ffa-panel             — 设置面板主体
    //   .ffa-panel__tab-nav    — 左侧 tab 切换抽屉
    //   .ffa-panel__tab-btn    — 单个 tab 按钮
    //   .ffa-card              — 设置卡片
    //   .ffa-subpanel          — 引擎编辑子面板
    //   .ffa-switch            — 开关组件
    //   .ffa-btn--primary/ghost/danger — 按钮变体
    //   .ffa-mini-icon         — 迷你模式图标
    //   .ffa-mini-hitarea      — 迷你模式触发区域
    const APP_CSS = [
        `:host{all:initial}`,
        `:host,:host *,:host *::before,:host *::after{box-sizing:border-box}`,
        `.ffa-app-root{position:fixed;inset:0;z-index:2147483640;pointer-events:none;font-family:var(--ffa-font-stack);line-height:1.4;color:var(--ffa-text-primary);text-size-adjust:none;-webkit-font-smoothing:antialiased}`,
        `.ffa-app-root *{box-sizing:border-box}`,
        `.ffa-overlay,.ffa-panel-shell,.ffa-mini-icon,.ffa-mini-hitarea,.ffa-toolbar-host,.ffa-suggest,.ffa-toolbar-wrapper,.ffa-toolbar,.ffa-toolbar__input,.ffa-toolbar__search-btn,.ffa-toolbar__search-input,.ffa-toolbar__engine-btn,.ffa-toolbar__settings-btn{pointer-events:auto}`,

        // ── 遮罩层 ──
        `.ffa-overlay{position:fixed;inset:0;background:var(--ffa-bg-inner-strong);backdrop-filter:blur(8px);z-index:2147483640;visibility:hidden;opacity:0;pointer-events:none;transition:0.5s}`,
        `.ffa-overlay--visible{visibility:visible;opacity:1;pointer-events:auto}`,

        // ── 面板全局字体继承 ──
        `.ffa-panel *{font-family:var(--ffa-font-stack) !important;color:inherit;box-sizing:border-box;text-shadow:none}`,
        `.ffa-panel a,.ffa-panel a:visited,.ffa-panel a:hover{color:inherit;text-decoration:none}`,

        // ── 面板滚动区 ──
        `.ffa-panel__scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:0 28px}`,
        `.ffa-panel__scroll::-webkit-scrollbar{width:4px}`,
        `.ffa-panel__scroll::-webkit-scrollbar-track{background:transparent}`,
        `.ffa-panel__scroll::-webkit-scrollbar-thumb{background:var(--ffa-accent-glow);border-radius:10px;transition:background 0.2s}`,
        `.ffa-panel__scroll::-webkit-scrollbar-thumb:hover{background:var(--ffa-accent)}`,
        `.ffa-panel__scroll{scrollbar-width:thin;scrollbar-color:var(--ffa-accent-glow) transparent}`,

        // ── 引擎行 ──
        `.ffa-engine-row__host{font-size:var(--ffa-font-size-xs);color:var(--ffa-text-secondary) !important}`,
        `.ffa-engine-row{display:flex;align-items:center;gap:15px;padding:12px 15px;background:var(--ffa-bg-inner);border-radius:var(--ffa-radius-widget);border:1px solid var(--ffa-border);margin-bottom:12px;cursor:grab;transition:0.25s var(--ffa-easing);position:relative}`,
        `.ffa-engine-row:hover{border-color:var(--ffa-accent);background:var(--ffa-accent-glow);transform:translateY(-3px);box-shadow:0 6px 20px var(--ffa-accent-glow),0 0 10px var(--ffa-accent-glow)}`,
        `.ffa-engine-row--dragging{opacity:0.5;border-color:var(--ffa-accent);background:var(--ffa-accent);color:var(--ffa-text-on-accent);cursor:grabbing;box-shadow:0 10px 40px var(--ffa-accent-glow),0 0 20px var(--ffa-accent-glow);transform:scale(1.02) rotate(2deg);transition:0.15s var(--ffa-easing)}`,
        `.ffa-engine-list.ffa-engine-list--drag-active{background:rgba(0,0,0,0.02);border-radius:var(--ffa-radius-widget);padding:8px}`,

        // ── 开关 ──
        `.ffa-switch{width:40px;height:20px;border-radius:20px;background:var(--ffa-border);position:relative;cursor:pointer;transition:0.25s var(--ffa-easing)}`,
        `.ffa-switch::after{content:'';position:absolute;left:4px;top:4px;width:12px;height:12px;background:var(--ffa-text-secondary);border-radius:50%;transition:0.25s var(--ffa-easing)}`,
        `.ffa-switch--on{background:var(--ffa-accent)}`,
        `.ffa-switch--on::after{left:24px;background:var(--ffa-text-on-accent)}`,

        // ── 卡片 ──
        `.ffa-card{background:var(--ffa-bg-panel);backdrop-filter:blur(15px);border-radius:min(calc(var(--ffa-radius-panel) * 0.7),20px);padding:22px;margin-bottom:16px;border:1px solid var(--ffa-border);box-shadow:0 10px 30px rgba(0,0,0,0.05);box-sizing:border-box}`,
        `.ffa-card__title{font-size:var(--ffa-font-size-md);font-weight:900;letter-spacing:1px;color:var(--ffa-accent);margin-bottom:16px;display:block;text-transform:uppercase;transform:translateZ(0);text-shadow:var(--ffa-glow-accent-md) !important}`,

        // ── 字段标签 & 提示 ──
        `.ffa-field__label{display:flex;justify-content:space-between;align-items:center;font-size:var(--ffa-font-size-sm);color:var(--ffa-text-primary);margin-bottom:8px;font-weight:600;transform:translateZ(0)}`,
        `.ffa-field__label b{font-weight:400;color:var(--ffa-text-secondary);font-size:var(--ffa-font-size-xs);background:var(--ffa-bg-inner);padding:2px 8px;border-radius:10px}`,
        `.ffa-field__hint{font-size:var(--ffa-font-size-xs);color:var(--ffa-text-secondary);margin:4px 0 12px;line-height:1.6}`,
        `.ffa-field__hint code{font-family:monospace;font-size:var(--ffa-font-size-xs);color:var(--ffa-accent);background:var(--ffa-bg-inner);padding:1px 5px;border-radius:4px;border:1px solid var(--ffa-border)}`,
        `.ffa-field__example{display:inline-flex;align-items:center;gap:6px;margin-top:4px;padding:5px 10px;background:var(--ffa-bg-inner);border:1px solid var(--ffa-border);border-radius:8px;font-size:var(--ffa-font-size-xs);font-family:monospace;color:var(--ffa-accent);letter-spacing:0.3px;cursor:pointer;transition:0.2s var(--ffa-easing);user-select:none}`,
        `.ffa-field__example:hover{border-color:var(--ffa-accent);background:var(--ffa-accent-glow);box-shadow:0 0 8px var(--ffa-accent-glow)}`,
        `.ffa-field__example .ffa-field__example-icon{font-size:var(--ffa-font-size-xs);opacity:0.6}`,
        `.ffa-field__tip{font-size:var(--ffa-font-size-xs);color:var(--ffa-text-secondary);margin-top:6px;padding-left:2px;opacity:0.8;font-style:italic}`,

        // ── 输入框 & 范围滑块 ──
        `input[type=range]{width:100%;cursor:pointer;margin:12px 0;height:18px;background:transparent;outline:none;border:none;padding:0;-webkit-appearance:none;appearance:none;font-family:var(--ffa-font-stack)}`,
        `input[type=range]::-webkit-slider-runnable-track{height:4px;background:var(--ffa-border);border-radius:2px}`,
        `input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--ffa-accent);margin-top:-5px;box-shadow:0 0 6px var(--ffa-accent-glow);transition:box-shadow 0.2s,transform 0.2s;border:none}`,
        `input[type=range]:hover::-webkit-slider-thumb{box-shadow:0 0 10px var(--ffa-accent),0 0 20px var(--ffa-accent-glow);transform:scale(1.15)}`,
        `input[type=range]::-moz-range-track{height:4px;background:var(--ffa-border);border-radius:2px;border:none}`,
        `input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--ffa-accent);box-shadow:0 0 6px var(--ffa-accent-glow);transition:box-shadow 0.2s,transform 0.2s;border:none;cursor:pointer}`,
        `input[type=range]:hover::-moz-range-thumb{box-shadow:0 0 10px var(--ffa-accent),0 0 20px var(--ffa-accent-glow);transform:scale(1.15)}`,

        // ── 面板底部操作区 ──
        `.ffa-panel__footer{padding:20px 28px;display:flex;gap:15px;border-top:1px solid var(--ffa-border)}`,

        // ── 按钮变体 ──
        `.ffa-btn--primary{padding:14px;background:var(--ffa-accent);color:var(--ffa-text-on-accent);border:none;border-radius:var(--ffa-radius-widget);font-weight:800;cursor:pointer;transition:0.25s var(--ffa-easing);box-sizing:border-box;box-shadow:0 4px 15px var(--ffa-accent-glow);font-family:var(--ffa-font-stack);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;transform:translateZ(0)}`,
        `.ffa-btn--primary:hover{transform:translateY(-3px);box-shadow:0 8px 25px var(--ffa-accent-glow),0 0 15px var(--ffa-accent-glow);text-shadow:var(--ffa-glow-on-accent) !important}`,
        `.ffa-btn--ghost{padding:14px;background:var(--ffa-bg-inner);color:var(--ffa-text-primary);border:1px solid var(--ffa-border);border-radius:var(--ffa-radius-widget);font-size:var(--ffa-font-size-sm);font-weight:600;cursor:pointer;transition:0.25s var(--ffa-easing);box-sizing:border-box;font-family:var(--ffa-font-stack);-webkit-font-smoothing:antialiased;transform:translateZ(0)}`,
        `.ffa-btn--ghost:hover{background:var(--ffa-accent-glow);border-color:var(--ffa-accent);transform:translateY(-3px);box-shadow:0 4px 15px var(--ffa-accent-glow),0 0 10px var(--ffa-accent-glow);color:var(--ffa-text-primary);text-shadow:var(--ffa-glow-accent-sm) !important}`,
        `.ffa-btn--danger{padding:14px;background:var(--ffa-bg-inner);color:#ff4757;border:1px solid rgba(255,71,87,0.3);border-radius:var(--ffa-radius-widget);font-weight:800;cursor:pointer;transition:0.25s var(--ffa-easing);box-sizing:border-box;font-family:var(--ffa-font-stack);-webkit-font-smoothing:antialiased;transform:translateZ(0)}`,
        `.ffa-btn--danger:hover{background:rgba(255,71,87,0.12);border-color:#ff4757;transform:translateY(-3px);box-shadow:0 4px 15px rgba(255,71,87,0.3),0 0 10px rgba(255,71,87,0.2);text-shadow:0 0 6px rgba(255,71,87,0.5) !important}`,

        // ── 子面板（引擎编辑） ──
        `.ffa-subpanel{position:absolute;inset:0;background:var(--ffa-bg-panel-deep);backdrop-filter:var(--ffa-backdrop-panel);z-index:100;padding:0;transform:translateY(100%);transition:0.5s var(--ffa-easing);display:flex;flex-direction:column;box-sizing:border-box;border-top:1px solid var(--ffa-border)}`,
        `.ffa-subpanel__scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:30px;box-sizing:border-box}`,
        `.ffa-subpanel__scroll::-webkit-scrollbar{width:4px}`,
        `.ffa-subpanel__scroll::-webkit-scrollbar-track{background:transparent}`,
        `.ffa-subpanel__scroll::-webkit-scrollbar-thumb{background:var(--ffa-accent-glow);border-radius:10px}`,
        `.ffa-subpanel__scroll::-webkit-scrollbar-thumb:hover{background:var(--ffa-accent)}`,
        `.ffa-subpanel__scroll{scrollbar-width:thin;scrollbar-color:var(--ffa-accent-glow) transparent}`,
        `.ffa-subpanel--visible{transform:translateY(0)}`,

        // ── 通用输入框 ──
        `.ffa-input{width:100%;padding:14px;background:var(--ffa-bg-inner);border:1px solid var(--ffa-border);border-radius:var(--ffa-radius-widget);color:var(--ffa-text-primary);margin-bottom:15px;outline:none;box-sizing:border-box;font-family:var(--ffa-font-stack)}`,
        `.ffa-input:focus{border-color:var(--ffa-accent);background:var(--ffa-bg-panel);box-shadow:0 0 12px var(--ffa-accent-glow)}`,

        // ── 主题按钮 ──
        `.ffa-theme-btn{flex:1;padding:12px 5px;font-size:var(--ffa-font-size-sm);border-radius:var(--ffa-radius-widget);cursor:pointer;border:1px solid var(--ffa-border);background:var(--ffa-bg-inner);color:var(--ffa-text-primary);font-weight:bold;transition:0.25s var(--ffa-easing);font-family:var(--ffa-font-stack);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;transform:translateZ(0)}`,
        `.ffa-theme-btn:hover{background:var(--ffa-accent-glow);border-color:var(--ffa-accent);box-shadow:0 4px 15px var(--ffa-accent-glow),0 0 10px var(--ffa-accent-glow);text-shadow:var(--ffa-glow-accent-sm) !important}`,
        `.ffa-theme-btn--active{border-color:var(--ffa-accent);background:var(--ffa-accent);color:var(--ffa-text-on-accent);text-shadow:var(--ffa-glow-on-accent) !important}`,

        // ── 图标编辑器 ──
        `.ffa-icon-editor{display:flex;gap:12px;align-items:flex-start;margin-bottom:0}`,
        `.ffa-icon-editor__textarea{flex:1;height:48px;padding:10px;background:var(--ffa-bg-inner);border:1px solid var(--ffa-border);border-radius:var(--ffa-radius-widget);color:var(--ffa-text-primary);outline:none;box-sizing:border-box;font-family:monospace;font-size:var(--ffa-font-size-xs);resize:none;line-height:1.5}`,
        `.ffa-icon-editor__textarea:focus{border-color:var(--ffa-accent);background:var(--ffa-bg-panel);box-shadow:0 0 12px var(--ffa-accent-glow)}`,
        `.ffa-icon-editor__preview{width:48px;height:48px;flex-shrink:0;border:1px solid var(--ffa-border);border-radius:var(--ffa-radius-widget);display:flex;align-items:center;justify-content:center;background:var(--ffa-bg-inner);color:var(--ffa-accent);font-size:var(--ffa-font-size-xs);overflow:hidden}`,
        `.ffa-icon-editor__preview svg,.ffa-icon-editor__preview img{width:24px;height:24px}`,
        `.ffa-icon-editor__error{font-size:var(--ffa-font-size-xs);color:#ff4757;margin-top:5px;display:none}`,
        `.ffa-icon-editor__error--visible{display:block}`,

        // ── 颜色色板 ──
        `.ffa-swatch-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;align-items:center}`,
        `.ffa-swatch{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:0.2s var(--ffa-easing);flex-shrink:0;box-sizing:border-box}`,
        `.ffa-swatch:hover{transform:scale(1.2);box-shadow:0 0 8px rgba(0,0,0,0.3)}`,
        `.ffa-swatch--selected{border-color:var(--ffa-accent);transform:scale(1.15);box-shadow:0 0 10px var(--ffa-accent-glow)}`,
        `.ffa-swatch-custom{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px dashed var(--ffa-text-secondary);transition:0.2s var(--ffa-easing);flex-shrink:0;overflow:hidden;position:relative;box-sizing:border-box}`,
        `.ffa-swatch-custom:hover{border-color:var(--ffa-accent);transform:scale(1.2)}`,
        `.ffa-swatch-custom input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;padding:0;border:none}`,

        // ── 迷你图标 & 触发区 ──
        `.ffa-mini-icon{position:fixed;bottom:calc(44px * -1 / 3);left:50%;transform:translateX(-50%);width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity 0.7s,transform 0.7s;opacity:0;pointer-events:none;z-index:2147483641;overflow:visible}`,
        `.ffa-mini-icon svg{width:28px;height:28px;transition:all 0.6s;filter:drop-shadow(0 0 4px var(--ffa-accent));color:var(--ffa-accent)}`,
        `.ffa-mini-icon--hovered svg{transform:scale(1.15) rotate(8deg);filter:drop-shadow(0 0 8px var(--ffa-accent)) drop-shadow(0 0 16px var(--ffa-accent))}`,
        `.ffa-mini-icon--visible{opacity:1;pointer-events:auto}`,
        `.ffa-mini-icon--hidden{opacity:0;transform:translateX(-50%) translateY(25px) scale(0.7);pointer-events:none}`,
        `.ffa-mini-hitarea{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:64px;height:36px;z-index:2147483642;cursor:pointer;pointer-events:none}`,
        `.ffa-mini-hitarea--active{pointer-events:auto}`,

        // ── 面板外壳 & tab 导航 ──
        `.ffa-panel-shell{position:fixed;top:50%;left:50%;transform:translate(-50%,-48%) scale(0.94);z-index:2147483645;visibility:hidden;opacity:0;pointer-events:none;transition:0.5s var(--ffa-easing);display:inline-block}`,
        `.ffa-panel-shell--visible{visibility:visible;opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}`,
        `.ffa-panel__tab-nav{position:absolute;top:50%;transform:translateY(-50%);right:calc(100% + 10px);height:auto;width:40px;display:flex;flex-direction:column;padding:8px 6px;gap:4px;background:var(--ffa-bg-panel-deep);border:1px solid var(--ffa-border);border-radius:var(--ffa-radius-panel);box-shadow:var(--ffa-shadow);transition:width 0.35s var(--ffa-easing);z-index:1}`,
        `.ffa-panel__tab-nav:hover{width:160px}`,
        `.ffa-panel__tab-btn{height:40px;display:flex;align-items:center;gap:10px;padding:0 11px;cursor:pointer;flex-shrink:0;color:var(--ffa-text-secondary);border-radius:var(--ffa-radius-panel);transition:background 0.2s var(--ffa-easing),color 0.2s var(--ffa-easing);position:relative;white-space:nowrap}`,
        `.ffa-panel__tab-btn svg{width:18px;height:18px;flex-shrink:0;transition:color 0.2s var(--ffa-easing)}`,
        `.ffa-panel__tab-label{font-size:var(--ffa-font-size-base);font-weight:700;letter-spacing:0.5px;opacity:0;transition:opacity 0.08s linear}`,
        `.ffa-panel__tab-nav:hover .ffa-panel__tab-label{opacity:1;transition:opacity 0.15s var(--ffa-easing) 0.15s}`,
        `.ffa-panel__tab-btn:not(.ffa-panel__tab-btn--active):hover{background:var(--ffa-accent-glow);color:var(--ffa-text-primary)}`,
        `.ffa-panel__tab-btn--active{background:var(--ffa-accent);color:var(--ffa-text-on-accent);box-shadow:0 4px 14px var(--ffa-accent-glow),0 0 8px var(--ffa-accent-glow)}`,
        `.ffa-panel__tab-btn--active .ffa-panel__tab-label{color:var(--ffa-text-on-accent);text-shadow:var(--ffa-glow-on-accent) !important}`,
        `.ffa-panel__tab-btn--active svg{color:var(--ffa-text-on-accent)}`,

        // ── 面板主体 ──
        `.ffa-panel{position:relative;top:auto;left:auto;transform:none;width:520px;height:70vh;max-height:70vh;border-radius:var(--ffa-radius-panel);padding:0;z-index:0;visibility:visible;opacity:1;color:var(--ffa-text-primary);font-family:var(--ffa-font-stack);box-shadow:var(--ffa-shadow);transition:none;background:var(--ffa-bg-panel-deep);border:1px solid var(--ffa-border);backdrop-filter:var(--ffa-backdrop-panel);display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}`,

        // ── Tab 内容区 ──
        `.ffa-panel__tab-content{display:none}`,
        `@keyframes ffa-tab-fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`,
        `.ffa-panel__tab-content--active{display:block;animation:ffa-tab-fadein 0.2s var(--ffa-easing) both}`,
        `.ffa-panel__title{text-align:center;font-weight:900;letter-spacing:4px;padding:26px 28px 20px;color:var(--ffa-accent);font-size:var(--ffa-font-size-lg);text-shadow:var(--ffa-glow-accent-lg) !important;border-bottom:1px solid var(--ffa-border);flex-shrink:0}`,
    ].join('');

    // ─── TOOLBAR_CSS ──────────────────────────────────────────────────────────────
    // 搜索条样式，同样注入到统一 shadow root。
    // 类名规范：ffa-toolbar（block）+ __element + --modifier
    //
    //   .ffa-toolbar-host          — 定位容器（fixed 居中）
    //   .ffa-toolbar-wrapper       — 动画包装层（mini-mode 控制入口）
    //   .ffa-toolbar               — 搜索条主体
    //   .ffa-toolbar__engine-btn   — 引擎切换按钮
    //   .ffa-toolbar__input        — 可展开的搜索输入区域
    //   .ffa-toolbar__search-btn   — 搜索触发按钮
    //   .ffa-toolbar__search-input — 文本输入框
    //   .ffa-toolbar__settings-btn — 设置按钮
    //   .ffa-suggest               — 自动补全下拉框
    //   .ffa-suggest__item         — 补全建议条目
    //   .ffa-suggest__history-item — 历史搜索条目
    //   .ffa-suggest__divider      — 分隔线
    const TOOLBAR_CSS = [
        `.ffa-toolbar-host{position:fixed;left:50%;transform:translateX(-50%);bottom:var(--ffa-offset-bottom);z-index:2147483642;font-family:var(--ffa-font-stack)}`,
        `.ffa-toolbar-wrapper{transition:0.8s var(--ffa-easing)}`,
        `.ffa-toolbar-wrapper--mini .ffa-toolbar{opacity:0;transform:translateY(50px) scale(0.92);pointer-events:none;transition:opacity 0.5s var(--ffa-easing),transform 0.6s var(--ffa-easing)}`,
        `.ffa-toolbar-wrapper--mini.ffa-toolbar-wrapper--revealed .ffa-toolbar{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;transition-delay:0.1s}`,
        `.ffa-toolbar-wrapper--mini .ffa-toolbar{will-change:opacity,transform}`,
        `.ffa-toolbar{display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--ffa-bg-toolbar);backdrop-filter:var(--ffa-backdrop-toolbar);border:1px solid var(--ffa-border);border-radius:var(--ffa-radius-panel);box-shadow:var(--ffa-shadow);transition:border-color 0.3s var(--ffa-easing),box-shadow 0.3s var(--ffa-easing),background 0.4s var(--ffa-easing)}`,
        `.ffa-toolbar--focused{background:var(--ffa-bg-panel);border-color:var(--ffa-accent);box-shadow:var(--ffa-shadow),0 0 0 1px var(--ffa-accent),0 0 18px var(--ffa-accent-glow)}`,

        // ── 引擎按钮 ──
        `.ffa-toolbar__engine-btn{display:inline-flex;align-items:center;justify-content:center;gap:0;padding:6px;font-size:var(--ffa-font-size-base);line-height:1.2;color:var(--ffa-text-primary);cursor:pointer;background:var(--ffa-bg-inner);border-radius:var(--ffa-radius-widget);transition:opacity 0.5s cubic-bezier(0.4,0,0.2,1),box-shadow 0.4s cubic-bezier(0.4,0,0.2,1),border-color 0.35s cubic-bezier(0.4,0,0.2,1),background 0.35s cubic-bezier(0.4,0,0.2,1),transform 0.5s cubic-bezier(0.34,1.56,0.64,1),max-width 0.5s cubic-bezier(0.4,0,0.2,1),padding 0.5s cubic-bezier(0.4,0,0.2,1);white-space:nowrap;font-weight:700;border:1px solid var(--ffa-border);box-sizing:border-box;font-family:var(--ffa-font-stack);-webkit-font-smoothing:antialiased;opacity:0.5;max-width:38px;overflow:hidden;will-change:max-width,transform}`,
        `.ffa-toolbar__engine-btn-icon{flex-shrink:0;display:flex;align-items:center;justify-content:center;width:16px;height:16px;overflow:visible;transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1)}`,
        `.ffa-toolbar__engine-btn-label{display:inline;opacity:0;white-space:nowrap;max-width:0;padding-left:0;transition:opacity 0.3s cubic-bezier(0.4,0,0.2,1),max-width 0.5s cubic-bezier(0.4,0,0.2,1),transform 0.5s cubic-bezier(0.4,0,0.2,1);transform:translateX(-4px);overflow:hidden}`,
        `.ffa-toolbar:hover .ffa-toolbar__engine-btn:not(.ffa-toolbar__engine-btn--active),.ffa-toolbar--pinned .ffa-toolbar__engine-btn:not(.ffa-toolbar__engine-btn--active){opacity:1}`,
        `.ffa-toolbar__engine-btn:hover{border-color:var(--ffa-accent);background:var(--ffa-accent-glow);transform:translateY(-2px) scale(1.02);box-shadow:0 6px 18px var(--ffa-accent-glow),0 0 10px var(--ffa-accent-glow);text-shadow:var(--ffa-glow-accent-sm) !important;max-width:160px;padding-right:10px;transition:opacity 0.3s cubic-bezier(0.4,0,0.2,1),box-shadow 0.3s cubic-bezier(0.4,0,0.2,1),border-color 0.25s cubic-bezier(0.4,0,0.2,1),background 0.25s cubic-bezier(0.4,0,0.2,1),transform 0.4s cubic-bezier(0.34,1.56,0.64,1),max-width 0.45s cubic-bezier(0.23,1,0.32,1),padding 0.4s cubic-bezier(0.23,1,0.32,1)}`,
        `.ffa-toolbar__engine-btn:hover .ffa-toolbar__engine-btn-icon{transform:scale(1.1)}`,
        `.ffa-toolbar__engine-btn:hover .ffa-toolbar__engine-btn-label{opacity:1;max-width:120px;padding-left:5px;transform:translateX(0);transition-delay:0.06s;transition:opacity 0.25s cubic-bezier(0.4,0,0.2,1) 0.06s,max-width 0.45s cubic-bezier(0.23,1,0.32,1),transform 0.4s cubic-bezier(0.23,1,0.32,1) 0.04s}`,
        `.ffa-toolbar__engine-btn--active{border-color:var(--ffa-accent);box-shadow:0 0 8px var(--ffa-accent-glow),0 0 16px var(--ffa-accent-glow);opacity:1 !important;max-width:160px;padding-right:10px}`,
        `.ffa-toolbar__engine-btn--active .ffa-toolbar__engine-btn-label{opacity:1;max-width:120px;padding-left:5px;transform:translateX(0)}`,
        `.ffa-toolbar__engine-btn--active:hover{background:var(--ffa-accent-glow);transform:translateY(-2px) scale(1.02)}`,

        // ── 搜索输入区 ──
        `.ffa-toolbar__input{position:relative;display:flex;align-items:center;transition:width 0.45s var(--ffa-easing),background 0.3s var(--ffa-easing),box-shadow 0.3s var(--ffa-easing),border-color 0.3s var(--ffa-easing);width:34px;border-radius:var(--ffa-radius-widget);border:1px solid transparent;box-sizing:border-box}`,
        `.ffa-toolbar__input--expanded{width:236px;background:var(--ffa-bg-inner);border-color:transparent;box-shadow:none;border-radius:var(--ffa-radius-widget)}`,
        `.ffa-toolbar__input--expanded .ffa-toolbar__search-btn{background:var(--ffa-bg-inner-strong);border-color:transparent;box-shadow:none;color:var(--ffa-accent);opacity:1}`,
        `.ffa-toolbar__input--expanded .ffa-toolbar__search-btn:hover{background:var(--ffa-accent-glow);border-color:transparent;border-right-color:var(--ffa-border)}`,

        // ── 搜索按钮 ──
        `.ffa-toolbar__search-btn{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;padding:6px 8px;cursor:pointer;color:var(--ffa-text-primary);background:var(--ffa-bg-inner);border:1px solid var(--ffa-border);border-radius:var(--ffa-radius-widget);transition:0.3s var(--ffa-easing);opacity:0.5;box-sizing:border-box}`,
        `.ffa-toolbar__search-btn:hover{opacity:1;border-color:var(--ffa-accent);background:var(--ffa-accent-glow);color:var(--ffa-accent);box-shadow:0 0 8px var(--ffa-accent-glow)}`,

        // ── 搜索输入框 ──
        `.ffa-toolbar__search-input{-webkit-appearance:none;appearance:none;border:none;background:transparent;padding:0;outline:none;width:0;min-width:0;font-size:var(--ffa-font-size-base);line-height:1.2;color:var(--ffa-text-primary);border-radius:0;transition:width 0.45s var(--ffa-easing),padding 0.45s var(--ffa-easing),opacity 0.3s var(--ffa-easing);box-sizing:border-box;font-family:var(--ffa-font-stack);opacity:0}`,
        `.ffa-toolbar__input--expanded .ffa-toolbar__search-input{width:200px;padding:6px 10px 6px 6px;opacity:1}`,
        `.ffa-toolbar__search-input::placeholder{color:var(--ffa-text-secondary);opacity:0.55}`,

        // ── 建议下拉框 ──
        `.ffa-suggest{position:absolute;bottom:110%;left:50%;transform:translateX(-50%);width:95vw;max-width:720px;display:none;flex-wrap:wrap;gap:12px;justify-content:center;padding-bottom:35px}`,
        `.ffa-suggest--visible{display:flex;animation:ffa-suggest-in 0.5s var(--ffa-easing)}`,
        `@keyframes ffa-suggest-in{from{opacity:0;transform:translateX(-50%) translateY(30px) scale(0.9)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}`,
        `@keyframes ffa-suggest-item-in{from{opacity:0;transform:translateY(16px) scale(0.92)}to{opacity:1;transform:translateY(0) scale(1)}}`,
        `.ffa-suggest__item:nth-child(1){animation-delay:0ms}.ffa-suggest__item:nth-child(2){animation-delay:40ms}.ffa-suggest__item:nth-child(3){animation-delay:80ms}.ffa-suggest__item:nth-child(4){animation-delay:120ms}.ffa-suggest__item:nth-child(5){animation-delay:160ms}.ffa-suggest__item:nth-child(6){animation-delay:200ms}.ffa-suggest__item:nth-child(7){animation-delay:240ms}.ffa-suggest__item:nth-child(8){animation-delay:280ms}.ffa-suggest__item:nth-child(9){animation-delay:320ms}.ffa-suggest__item:nth-child(10){animation-delay:360ms}`,
        `.ffa-suggest__item{padding:10px 24px;font-size:var(--ffa-font-size-md);font-weight:600;cursor:pointer;border-radius:999px;background:linear-gradient(135deg,var(--ffa-bg-inner),var(--ffa-bg-toolbar));color:var(--ffa-text-primary);border:1px solid var(--ffa-border);backdrop-filter:var(--ffa-backdrop-toolbar);transition:0.25s var(--ffa-easing);font-family:var(--ffa-font-stack);transform:translateZ(0);opacity:0;animation:ffa-suggest-item-in 0.4s var(--ffa-easing) forwards;box-shadow:0 2px 8px rgba(0,0,0,0.08);letter-spacing:0.3px}`,
        `.ffa-suggest__item:hover,.ffa-suggest__item--focused{background:linear-gradient(135deg,var(--ffa-accent),var(--ffa-accent));color:var(--ffa-text-on-accent);border-color:var(--ffa-accent);box-shadow:0 8px 25px var(--ffa-accent-glow),0 0 15px var(--ffa-accent-glow);transform:translateY(-4px) scale(1.02);text-shadow:var(--ffa-glow-on-accent) !important}`,

        // ── 建议分隔线 ──
        `.ffa-suggest__divider{width:100%;display:flex;align-items:center;gap:8px;padding:0 4px;opacity:0;animation:ffa-suggest-item-in 0.3s var(--ffa-easing) forwards}`,
        `.ffa-suggest__divider-line{flex:1;height:1px;background:rgba(255,255,255,0.25)}`,
        `.ffa-suggest__divider-label{font-size:var(--ffa-font-size-xs);font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,0.55);text-transform:uppercase;white-space:nowrap}`,

        // ── 历史条目 ──
        `.ffa-suggest__history-item{padding:10px 20px 10px 16px;font-size:var(--ffa-font-size-md);font-weight:600;cursor:pointer;border-radius:999px;background:linear-gradient(135deg,var(--ffa-bg-inner),var(--ffa-bg-toolbar));color:var(--ffa-text-secondary);border:1px solid var(--ffa-border);backdrop-filter:var(--ffa-backdrop-toolbar);transition:0.25s var(--ffa-easing);font-family:var(--ffa-font-stack);transform:translateZ(0);opacity:0;animation:ffa-suggest-item-in 0.4s var(--ffa-easing) forwards;box-shadow:0 2px 8px rgba(0,0,0,0.06);letter-spacing:0.3px;display:flex;align-items:center;gap:8px;position:relative}`,
        `.ffa-suggest__history-item:hover,.ffa-suggest__history-item--focused{background:linear-gradient(135deg,var(--ffa-accent),var(--ffa-accent));color:var(--ffa-text-on-accent);border-color:var(--ffa-accent);box-shadow:0 8px 25px var(--ffa-accent-glow),0 0 15px var(--ffa-accent-glow);transform:translateY(-4px) scale(1.02);text-shadow:var(--ffa-glow-on-accent) !important}`,
        `.ffa-suggest__history-icon{font-size:var(--ffa-font-size-sm);opacity:0.5;flex-shrink:0;transition:0.25s}`,
        `.ffa-suggest__history-item:hover .ffa-suggest__history-icon{opacity:1}`,
        `.ffa-suggest__history-del{margin-left:4px;width:16px;height:16px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:var(--ffa-font-size-xs);opacity:0;transition:0.2s var(--ffa-easing);flex-shrink:0;color:inherit}`,
        `.ffa-suggest__history-item:hover .ffa-suggest__history-del{opacity:0.6}`,
        `.ffa-suggest__history-del:hover{opacity:1 !important;background:rgba(255,71,87,0.25);color:#ff4757}`,

        // ── 设置按钮 ──
        `.ffa-toolbar__settings-btn{width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ffa-text-primary);transition:0.5s var(--ffa-easing);border-radius:50%;opacity:0.5}`,
        `.ffa-toolbar__settings-btn:hover{opacity:1;background:var(--ffa-accent-glow);color:var(--ffa-accent);transform:rotate(90deg);box-shadow:0 0 15px var(--ffa-accent-glow),0 0 30px var(--ffa-accent-glow)}`,
    ].join('');

    const HistoryModule = {
        get() {
            try { return GM_getValue(HISTORY_KEY, []); } catch (e) { return []; }
        },
        push(term) {
            const t = term?.trim();
            if (!t) return;
            let hist = this.get().filter(h => h !== t);
            hist.unshift(t);
            if (hist.length > HISTORY_MAX) hist = hist.slice(0, HISTORY_MAX);
            GM_setValue(HISTORY_KEY, hist);
        },
        remove(term) {
            GM_setValue(HISTORY_KEY, this.get().filter(h => h !== term));
        },
    };

    const SuggestModule = {
        _cache: new Map(),
        _CACHE_MAX: 100,
        _CACHE_TTL: 5 * 60 * 1000,
        _sources: { google: true, baidu: false, duckduckgo: true },
        _initialized: false,
        _requestToken: 0,
        _focusedIndex: -1,
        _navItems: [],

        _cacheGet(key) {
            const item = this._cache.get(key);
            if (!item) return null;
            if (Date.now() - item.ts > this._CACHE_TTL) {
                this._cache.delete(key);
                return null;
            }
            return item.value;
        },

        _cacheSet(key, value) {
            if (this._cache.size >= this._CACHE_MAX)
                this._cache.delete(this._cache.keys().next().value);
            this._cache.set(key, { value, ts: Date.now() });
        },

        _cleanupCache() {
            const now = Date.now();
            for (const [key, item] of this._cache) {
                if (now - item.ts > this._CACHE_TTL) this._cache.delete(key);
            }
        },

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

            const google = await trySource('google', this._fetchGoogle.bind(this));
            if (google.length > 0) return google;
            const baidu = await trySource('baidu', this._fetchBaidu.bind(this));
            if (baidu.length > 0) return baidu;
            return trySource('duckduckgo', this._fetchDuckDuckGo.bind(this));
        },

        async fetch(query, box, mask, engineUrl) {
            this._cleanupCache();

            const token = ++this._requestToken;
            const q = query.trim();
            const showHistory = SettingsManager.current?.searchBehavior?.history !== false;

            if (!q) {
                this._render(box, mask, engineUrl, showHistory ? HistoryModule.get() : [], []);
                return;
            }

            const matchedHistory = showHistory
                ? HistoryModule.get().filter(h => h.toLowerCase().startsWith(q.toLowerCase())).slice(0, 5)
                : [];

            this._render(box, mask, engineUrl, matchedHistory, [], true);

            try {
                const suggests = await this._fetchFromSources(q);
                if (token !== this._requestToken) return;
                const deduped = suggests.filter(s => !matchedHistory.includes(s));
                this._render(box, mask, engineUrl, matchedHistory, deduped);
            } catch (e) {
                if (token !== this._requestToken) return;
                this._render(box, mask, engineUrl, matchedHistory, []);
            }
        },

        _render(box, mask, engineUrl, history, suggests, keepOpen = false) {
            if (history.length === 0 && suggests.length === 0) {
                if (!keepOpen) { box.classList.remove('ffa-suggest--visible'); mask.classList.remove('ffa-overlay--visible'); }
                return;
            }

            box.innerHTML = '';
            this._navItems = [];
            this._focusedIndex = -1;
            let delay = 0;
            const STEP = 40;

            const makeDivider = (label) => {
                const wrap = document.createElement('div');
                wrap.className = 'ffa-suggest__divider';
                wrap.style.animationDelay = delay + 'ms';
                const line = () => { const l = document.createElement('div'); l.className = 'ffa-suggest__divider-line'; return l; };
                const lbl = document.createElement('span');
                lbl.className = 'ffa-suggest__divider-label';
                lbl.textContent = label;
                wrap.append(line(), lbl, line());
                return wrap;
            };

            if (history.length > 0) {
                if (suggests.length > 0) { box.appendChild(makeDivider(t('labelRecent'))); delay += STEP; }
                history.forEach(term => {
                    const item = document.createElement('div');
                    item.className = 'ffa-suggest__history-item';
                    item.style.animationDelay = delay + 'ms';

                    const icon = document.createElement('span'); icon.className = 'ffa-suggest__history-icon'; icon.textContent = '🕐';
                    const text = document.createElement('span'); text.className = 'ffa-suggest__history-text'; text.textContent = term;
                    const del  = document.createElement('span'); del.className  = 'ffa-suggest__history-del';  del.textContent = '✕'; del.title = t('btnRemoveHistory');

                    text.onclick = e => { e.stopPropagation(); performSearch(engineUrl, term); };
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
                    item.className = 'ffa-suggest__item';
                    item.style.animationDelay = delay + 'ms';
                    item.textContent = term;
                    item.onclick = e => { e.stopPropagation(); performSearch(engineUrl, term); };
                    box.appendChild(item);
                    this._navItems.push({ el: item, term });
                    delay += STEP;
                });
            }

            mask.classList.add('ffa-overlay--visible');
            box.classList.add('ffa-suggest--visible');
        },

        handleKeyNav(e, box, mask, engineUrl) {
            const items = this._navItems;
            if (!box.classList.contains('ffa-suggest--visible') || items.length === 0) return false;

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
                performSearch(engineUrl, term);
                return true;
            }
            if (e.key === 'Escape') {
                box.classList.remove('ffa-suggest--visible');
                mask.classList.remove('ffa-overlay--visible');
                box.innerHTML = '';
                this._navItems = [];
                this._focusedIndex = -1;
                return true;
            }
            return false;
        },

        _moveFocus(dir, items) {
            if (this._focusedIndex >= 0) items[this._focusedIndex].el.classList.remove('ffa-suggest__item--focused', 'ffa-suggest__history-item--focused');
            const next = this._focusedIndex + dir;
            this._focusedIndex = Math.max(-1, Math.min(items.length - 1, next));
            if (this._focusedIndex >= 0) {
                const el = items[this._focusedIndex].el;
                el.classList.add(el.classList.contains('ffa-suggest__history-item') ? 'ffa-suggest__history-item--focused' : 'ffa-suggest__item--focused');
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        },

        clearNav() {
            this._navItems = [];
            this._focusedIndex = -1;
        },
    };

    const fetchSuggestions = debounce(
        (query, box, mask, engineUrl) => {
            if (!SettingsManager.current?.searchBehavior?.suggestions) return;
            SuggestModule.fetch(query, box, mask, engineUrl);
        },
        300
    );

    function isBlacklisted(list) {
        if (!list?.length) return false;
        const host = window.location.hostname.toLowerCase();
        return list.some(e => String(e).trim().toLowerCase() === host);
    }

    function init() {
        if (_isInitialized) return;
        _isInitialized = true;
        AppRoot.init();
        if (AppRoot.isMounted()) {
            console.warn('[FFA Omnibar] 检测到残留的工具栏元素，跳过初始化');
            return;
        }

        SettingsManager.load();

        if (isBlacklisted(SettingsManager.current.bl)) {
            AppRoot.destroy();
            _isInitialized = false;
            return;
        }

        StyleEngine.init();
        SuggestModule.initAccessibility();

        const appRoot = AppRoot.mount;
        AppRoot.resetMount();
        const lifecycle = new AbortController();
        const { signal } = lifecycle;

        const mask  = document.createElement('div');
        mask.className = 'ffa-overlay';

        const shell = document.createElement('div');
        shell.className = 'ffa-panel-shell';

        const tabNav = document.createElement('div');
        tabNav.className = 'ffa-panel__tab-nav';

        const TAB_DEFS = [
            { key: 'general',    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M11 18.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75m-8-12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 6.25m13 6a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75M8.75 16a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75"/><path fill="currentColor" d="M3 18.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75m0-6a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75M16.75 10a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75M14 6.25a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75M11.25 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75"/></svg>' },
            { key: 'appearance', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M14.4 3.419a.639.639 0 0 1 1.2 0l.61 1.668a9.59 9.59 0 0 0 5.703 5.703l1.668.61a.639.639 0 0 1 0 1.2l-1.668.61a9.59 9.59 0 0 0-5.703 5.703l-.61 1.668a.639.639 0 0 1-1.2 0l-.61-1.668a9.59 9.59 0 0 0-5.703-5.703l-1.668-.61a.639.639 0 0 1 0-1.2l1.668-.61a9.59 9.59 0 0 0 5.703-5.703zM8 16.675a.266.266 0 0 1 .5 0l.254.694a4 4 0 0 0 2.376 2.377l.695.254a.266.266 0 0 1 0 .5l-.695.254a4 4 0 0 0-2.376 2.377l-.254.694a.266.266 0 0 1-.5 0l-.254-.694a4 4 0 0 0-2.376-2.377l-.695-.254a.266.266 0 0 1 0-.5l.695-.254a4 4 0 0 0 2.376-2.377zM4.2.21a.32.32 0 0 1 .6 0l.305.833a4.8 4.8 0 0 0 2.852 2.852l.833.305a.32.32 0 0 1 0 .6l-.833.305a4.8 4.8 0 0 0-2.852 2.852L4.8 8.79a.32.32 0 0 1-.6 0l-.305-.833a4.8 4.8 0 0 0-2.852-2.852L.21 4.8a.32.32 0 0 1 0-.6l.833-.305a4.8 4.8 0 0 0 2.852-2.852z"/></svg>' },
            { key: 'engines',    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M20.322.75h1.176a1.75 1.75 0 0 1 1.75 1.749v1.177a10.75 10.75 0 0 1-2.925 7.374l-1.228 1.304a24 24 0 0 1-1.596 1.542v5.038c0 .615-.323 1.184-.85 1.5l-4.514 2.709a.75.75 0 0 1-1.12-.488l-.963-4.572a1.3 1.3 0 0 1-.14-.129L8.04 15.96l-1.994-1.873a1.3 1.3 0 0 1-.129-.14l-4.571-.963a.75.75 0 0 1-.49-1.12l2.71-4.514c.316-.527.885-.85 1.5-.85h5.037a24 24 0 0 1 1.542-1.594l1.304-1.23A10.75 10.75 0 0 1 20.321.75Zm-6.344 4.018v-.001l-1.304 1.23a22.3 22.3 0 0 0-3.255 3.851l-2.193 3.29l1.859 1.744l.034.034l1.743 1.858l3.288-2.192a22.3 22.3 0 0 0 3.854-3.257l1.228-1.303a9.25 9.25 0 0 0 2.517-6.346V2.5a.25.25 0 0 0-.25-.25h-1.177a9.25 9.25 0 0 0-6.344 2.518M6.5 21c-1.209 1.209-3.901 1.445-4.743 1.49a.24.24 0 0 1-.18-.067a.24.24 0 0 1-.067-.18c.045-.842.281-3.534 1.49-4.743c.9-.9 2.6-.9 3.5 0s.9 2.6 0 3.5m-.592-8.588L8.17 9.017q.346-.519.717-1.017H5.066a.25.25 0 0 0-.214.121l-2.167 3.612ZM16 15.112q-.5.372-1.018.718l-3.393 2.262l.678 3.223l3.612-2.167a.25.25 0 0 0 .121-.214ZM17.5 8a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 17.5 8"/></svg>' },
            { key: 'blocklist',  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M9.28 7.72a.75.75 0 0 0-1.06 1.06l2.72 2.72l-2.72 2.72a.75.75 0 1 0 1.06 1.06L12 12.56l2.72 2.72a.75.75 0 1 0 1.06-1.06l-2.72-2.72l2.72-2.72a.75.75 0 0 0-1.06-1.06L12 10.44z"/><path fill="currentColor" d="m12.54.637l8.25 2.675A1.75 1.75 0 0 1 22 4.976V10c0 6.19-3.771 10.704-9.401 12.83a1.7 1.7 0 0 1-1.198 0C5.77 20.705 2 16.19 2 10V4.976c0-.758.489-1.43 1.21-1.664L11.46.637a1.75 1.75 0 0 1 1.08 0m-.617 1.426l-8.25 2.676a.25.25 0 0 0-.173.237V10c0 5.46 3.28 9.483 8.43 11.426a.2.2 0 0 0 .14 0C17.22 19.483 20.5 15.461 20.5 10V4.976a.25.25 0 0 0-.173-.237l-8.25-2.676a.25.25 0 0 0-.154 0"/></svg>' },
        ];

        TAB_DEFS.forEach(def => {
            const btn = document.createElement('div');
            btn.className = 'ffa-panel__tab-btn' + (_activeTab === def.key ? ' ffa-panel__tab-btn--active' : '');
            btn.dataset.tab = def.key;
            const _lbl = t('tab' + def.key.charAt(0).toUpperCase() + def.key.slice(1));
            btn.innerHTML = def.svg + `<span class="ffa-panel__tab-label">${_lbl}</span>`;
            btn.title = _lbl;
            btn.onclick = () => {
                _activeTab = def.key;
                tabNav.querySelectorAll('.ffa-panel__tab-btn').forEach(b => b.classList.toggle('ffa-panel__tab-btn--active', b.dataset.tab === def.key));
                panel.querySelectorAll('.ffa-panel__tab-content').forEach(c => {
                    const isActive = c.dataset.tab === def.key;
                    if (isActive) {
                        c.classList.remove('ffa-panel__tab-content--active');
                        void c.offsetWidth; // force reflow
                        c.classList.add('ffa-panel__tab-content--active');
                    } else {
                        c.classList.remove('ffa-panel__tab-content--active');
                    }
                });
            };
            tabNav.append(btn);
        });

        const panel = document.createElement('div');
        panel.className = 'ffa-panel';

        shell.append(tabNav, panel);

        const toolbarHost = document.createElement('div');
        toolbarHost.className = 'ffa-toolbar-host';
        const wrapper     = document.createElement('div');
        const toolbar     = document.createElement('div');
        const suggestBox  = document.createElement('div');
        const miniIcon    = document.createElement('div');
        const miniHitArea = document.createElement('div');

        wrapper.className     = 'ffa-toolbar-wrapper';
        toolbar.className     = 'ffa-toolbar';
        suggestBox.className  = 'ffa-suggest';
        miniIcon.className    = 'ffa-mini-icon';
        miniHitArea.className = 'ffa-mini-hitarea';

        miniIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1.253c1.044 0 1.956.569 2.44 1.412l4.589 7.932l4.45 7.691c.047.074.21.359.27.494a2.808 2.808 0 0 1-3.406 3.836l-7.901-2.606a1.4 1.4 0 0 0-.442-.07a1.4 1.4 0 0 0-.442.07l-7.9 2.606l-.162.046a2.8 2.8 0 0 1-.684.083a2.81 2.81 0 0 1-2.644-3.763c.03-.091.074-.176.111-.264c.072-.15.161-.288.242-.432l4.449-7.691l4.588-7.932A2.81 2.81 0 0 1 12 1.253"/></svg>`;

        toolbarHost.append(suggestBox, wrapper);
        wrapper.append(toolbar);
        appRoot.append(mask, shell, miniIcon, miniHitArea, toolbarHost);
        AppRoot.markMounted(true);

        const qPanel = sel => panel.querySelector(sel);
        const qToolbar = sel => toolbar.querySelector(sel);

        const UIState = {
            openMask()    { mask.classList.add('ffa-overlay--visible'); },
            closeMask()   { mask.classList.remove('ffa-overlay--visible'); },
            openShell()   { shell.classList.add('ffa-panel-shell--visible'); },
            closeShell()  { shell.classList.remove('ffa-panel-shell--visible'); },
            openSuggest() { suggestBox.classList.add('ffa-suggest--visible'); },
            closeSuggest(){ suggestBox.classList.remove('ffa-suggest--visible'); },
            clearSuggest() {
                this.closeSuggest();
                suggestBox.innerHTML = '';
                SuggestModule.clearNav();
            },
            isOverlayVisible() {
                return shell.classList.contains('ffa-panel-shell--visible') || suggestBox.classList.contains('ffa-suggest--visible');
            },
            closePanelOverlay() {
                this.closeMask();
                this.closeShell();
                this.clearSuggest();
                qPanel('#n-sub')?.classList.remove('ffa-subpanel--visible');
                wrapper.classList.remove('ffa-toolbar-wrapper--pinned');
                toolbar.classList.remove('ffa-toolbar--focused', 'ffa-toolbar--pinned');
                const ic = qToolbar('.ffa-toolbar__input');
                const inp = qToolbar('.ffa-toolbar__search-input');
                if (ic && !inp?.value?.trim()) ic.classList.remove('ffa-toolbar__input--expanded');
                updateMiniMode();
            },
        };

        suggestBox.addEventListener('mousedown', (e) => {
            const isItem = e.target.closest('.ffa-suggest__item, .ffa-suggest__history-item, .ffa-suggest__divider');
            if (!isItem) {
                e.preventDefault();
                UIState.closePanelOverlay();
            }
        });

        miniHitArea.addEventListener('mouseenter', () => {
            wrapper.classList.add('ffa-toolbar-wrapper--revealed');
            miniIcon.classList.add('ffa-mini-icon--hidden');
            miniIcon.classList.remove('ffa-mini-icon--visible', 'ffa-mini-icon--hovered');
        });

        const inRect = (el, x, y) => {
            const r = el.getBoundingClientRect();
            return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        };
        let _miniMoveTimer = null;
        document.addEventListener('mousemove', (e) => {
            if (!wrapper.classList.contains('ffa-toolbar-wrapper--revealed') || UIState.isOverlayVisible()) return;
            if (inRect(miniHitArea, e.clientX, e.clientY) || inRect(toolbarHost, e.clientX, e.clientY)) {
                clearTimeout(_miniMoveTimer);
            } else {
                clearTimeout(_miniMoveTimer);
                _miniMoveTimer = setTimeout(() => {
                    if (!wrapper.classList.contains('ffa-toolbar-wrapper--revealed') || UIState.isOverlayVisible()) return;
                    wrapper.classList.remove('ffa-toolbar-wrapper--revealed');
                    miniIcon.classList.remove('ffa-mini-icon--hidden', 'ffa-mini-icon--hovered');
                    miniIcon.classList.add('ffa-mini-icon--visible');
                }, 80);
            }
        }, { signal });

        const cleanupTasks = [];

        cleanupTasks.push(EventBus.on('settings:changed', () => {
            StyleEngine.update();
        }));
        cleanupTasks.push(EventBus.on('settings:engines:changed', () => {
            ToolbarController.render();
        }));

        const Refresh = {
            panel()  { renderPanel(); },
            styles() { applyStyles(); },
            toolbar(){ ToolbarController.render(); },
            miniMode(){ updateMiniMode(); },
            save()   { SettingsManager.save(); },
            saveAndPanel()         { this.save(); this.panel(); },
            saveAndStyles()        { this.save(); this.styles(); },
            saveStylesAndToolbar() { this.save(); this.styles(); this.toolbar(); },
            saveStylesAndPanel()   { this.save(); this.styles(); this.panel(); },
            saveStylesMiniAndPanel(){ this.save(); this.styles(); this.miniMode(); this.panel(); },
        };

        const EngineEditor = {
            openForEdit(engine) {
                editingEngine = engine;
                const subPanel = qPanel('#n-sub');
                qPanel('#sub-title').textContent = t('subPanelTitle');
                qPanel('#e-n').value = engine.name;
                qPanel('#e-u').value = engine.url;
                qPanel('#e-h').value = engine.host;
                const iconVal = engine.icon && !BUILTIN_HOSTS.has(engine.host) ? engine.icon : '';
                qPanel('#e-icon').value = iconVal;
                updateIconPreview(iconVal, qPanel('#e-icon-preview'));
                subPanel.classList.add('ffa-subpanel--visible');
            },

            openForCreate() {
                editingEngine = null;
                const subPanel = qPanel('#n-sub');
                qPanel('#sub-title').textContent = t('subPanelTitleAdd');
                ['#e-n', '#e-u', '#e-h', '#e-icon'].forEach(sel => {
                    const node = qPanel(sel);
                    if (node) node.value = '';
                });
                updateIconPreview('', qPanel('#e-icon-preview'));
                subPanel.classList.add('ffa-subpanel--visible');
            },

            close() {
                qPanel('#n-sub')?.classList.remove('ffa-subpanel--visible');
                editingEngine = null;
            },

            confirm() {
                const name = qPanel('#e-n').value.trim();
                const url = qPanel('#e-u').value.trim();
                const host = qPanel('#e-h').value.trim();
                const iconRaw = qPanel('#e-icon').value.trim();
                const errorEl = qPanel('#e-icon-error');
                if (!name || !url) return false;

                const iconResult = SecurityUtils.validateIcon(iconRaw);
                if (iconRaw && !iconResult.valid) {
                    errorEl.classList.add('ffa-icon-editor__error--visible');
                    return false;
                }
                errorEl.classList.remove('ffa-icon-editor__error--visible');
                const icon = (iconResult.valid && iconResult.type !== 'default') ? iconResult.value : undefined;

                if (!editingEngine) {
                    SettingsManager.addEngine({ name, url, host, enabled: true, ...(icon ? { icon } : {}) });
                } else {
                    const patch = { name, url, host };
                    if (icon) patch.icon = icon; else delete editingEngine.icon;
                    SettingsManager.updateEngine(editingEngine, patch);
                }

                this.close();
                Refresh.styles();
                Refresh.panel();
                return true;
            },
        };

        const PanelActions = {
            syncSwitch(el, on) {
                el?.classList?.toggle('ffa-switch--on', !!on);
            },

            handleVisual(action, el, settings) {
                if (action === 'swatch') {
                    const { color, target } = el.dataset;
                    settings[target] = color;
                    panel.querySelectorAll(`.ffa-swatch[data-target="${target}"]`).forEach(sw => sw.classList.remove('ffa-swatch--selected'));
                    el.classList.add('ffa-swatch--selected');
                    const picker = qPanel(target === 'b' ? '#s-bc' : '#s-ac');
                    if (picker) picker.value = color;
                    Refresh.saveAndStyles();
                    return true;
                }

                if (action === 'theme') {
                    const theme = THEMES[el.dataset.key];
                    if (theme) {
                        SettingsManager.update({ ...theme });
                        Refresh.styles();
                        Refresh.panel();
                    }
                    return true;
                }

                if (action === 'lang') {
                    SettingsManager.update({ lang: el.dataset.lang });
                    Refresh.panel();
                    tabNav.querySelectorAll('.ffa-panel__tab-btn').forEach(btn => {
                        const key = btn.dataset.tab;
                        const label = t('tab' + key.charAt(0).toUpperCase() + key.slice(1));
                        btn.title = label;
                        const labelSpan = btn.querySelector('.ffa-panel__tab-label');
                        if (labelSpan) labelSpan.textContent = label;
                    });
                    return true;
                }

                return false;
            },

            handleEngine(action, el, settings) {
                if (action === 'toggle-engine') {
                    const idx = parseInt(el.dataset.i);
                    if (idx >= 0 && idx < settings.en.length) {
                        settings.en[idx].enabled = !settings.en[idx].enabled;
                        this.syncSwitch(el, settings.en[idx].enabled);
                        Refresh.saveStylesAndToolbar();
                    }
                    return true;
                }

                if (action === 'delete-engine') {
                    const idx = parseInt(el.dataset.i);
                    if (idx >= 0 && idx < settings.en.length && confirm(t('confirmDeleteEngine'))) {
                        SettingsManager.removeEngine(settings.en[idx]);
                        Refresh.styles();
                        Refresh.panel();
                    }
                    return true;
                }

                if (action === 'edit-engine') {
                    const idx = parseInt(el.dataset.i);
                    if (idx >= 0 && idx < settings.en.length) EngineEditor.openForEdit(settings.en[idx]);
                    return true;
                }

                if (action === 'add-engine') { EngineEditor.openForCreate(); return true; }
                if (action === 'confirm-engine') { EngineEditor.confirm(); return true; }
                if (action === 'cancel-engine') { EngineEditor.close(); return true; }

                return false;
            },

            handleData(action, el, settings) {
                if (action === 'toggle-mm') {
                    settings.mm = !settings.mm;
                    this.syncSwitch(el, settings.mm);
                    Refresh.save(); Refresh.styles(); Refresh.miniMode();
                    return true;
                }

                if (action === 'toggle-newtab') {
                    settings.searchBehavior.openInNewTab = !settings.searchBehavior.openInNewTab;
                    this.syncSwitch(el, settings.searchBehavior.openInNewTab);
                    Refresh.save();
                    return true;
                }

                if (action === 'toggle-suggestions') {
                    settings.searchBehavior.suggestions = !settings.searchBehavior.suggestions;
                    this.syncSwitch(el, settings.searchBehavior.suggestions);
                    if (!settings.searchBehavior.suggestions) UIState.clearSuggest();
                    Refresh.save();
                    return true;
                }

                if (action === 'toggle-history') {
                    settings.searchBehavior.history = !settings.searchBehavior.history;
                    this.syncSwitch(el, settings.searchBehavior.history);
                    Refresh.save();
                    return true;
                }

                if (action === 'remove-blacklist') {
                    SettingsManager.removeFromBlacklist(el.dataset.domain);
                    Refresh.panel();
                    return true;
                }

                if (action === 'add-blacklist') {
                    const blInput = qPanel('#bl-input');
                    const blFeedback = qPanel('#bl-feedback');
                    const val = blInput?.value?.trim();
                    if (!val) return true;
                    const result = SettingsManager.addToBlacklist(val);
                    if (result === 'duplicate') {
                        if (blFeedback) { blFeedback.textContent = t('blacklistDuplicate'); blFeedback.style.display = 'block'; }
                        setTimeout(() => { if (blFeedback) blFeedback.style.display = 'none'; }, 2000);
                    } else {
                        if (blInput) blInput.value = '';
                        if (blFeedback) blFeedback.style.display = 'none';
                        Refresh.panel();
                    }
                    return true;
                }

                if (action === 'add-current-site') {
                    const result = SettingsManager.addToBlacklist(window.location.hostname);
                    if (result !== 'duplicate') Refresh.panel();
                    return true;
                }

                if (action === 'export') {
                    const blob = new Blob([SettingsManager.exportJSON()], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'ffa-omnibar-settings.json';
                    a.click();
                    URL.revokeObjectURL(a.href);
                    return true;
                }

                if (action === 'apply') { SettingsManager.save(); location.reload(); return true; }

                if (action === 'reset') {
                    if (confirm(t('confirmReset'))) { SettingsManager.reset(); location.reload(); }
                    return true;
                }

                return false;
            },

            dispatch(action, el, settings) {
                if (this.handleVisual(action, el, settings)) return true;
                if (this.handleEngine(action, el, settings)) return true;
                return this.handleData(action, el, settings);
            },
        };

        function bindToolbarSearch(input, inputContainer, enabled, activeEngineUrl) {
            const getEngineUrl = () => {
                const btn = qToolbar('.ffa-toolbar__engine-btn--active');
                return btn ? btn.dataset.engineUrl : enabled[0]?.url;
            };

            const collapseInput = () => {
                if (input.value.trim()) return;
                inputContainer.classList.remove('ffa-toolbar__input--expanded');
                toolbar.classList.remove('ffa-toolbar--focused');
                wrapper.classList.remove('ffa-toolbar-wrapper--pinned');
                toolbar.classList.remove('ffa-toolbar--pinned');
            };

            const expand = () => {
                inputContainer.classList.add('ffa-toolbar__input--expanded');
                wrapper.classList.add('ffa-toolbar-wrapper--pinned');
                toolbar.classList.add('ffa-toolbar--focused', 'ffa-toolbar--pinned');
                UIState.openMask();
                UIState.openSuggest();
            };

            if (extractPageQuery()) inputContainer.classList.add('ffa-toolbar__input--expanded');

            return {
                getEngineUrl,
                bind(searchBtn) {
                    searchBtn.onclick = () => {
                        if (!inputContainer.classList.contains('ffa-toolbar__input--expanded')) {
                            expand();
                            setTimeout(() => input.focus(), 50);
                        } else if (input.value.trim()) {
                            performSearch(getEngineUrl(), input.value);
                        } else {
                            input.focus();
                        }
                    };

                    input.onfocus = () => {
                        if (input.value) input.select();
                        expand();
                        const url = getEngineUrl();
                        if (url) fetchSuggestions(input.value, suggestBox, mask, url);
                    };
                    input.onblur = () => {
                        setTimeout(() => {
                            if (!suggestBox.classList.contains('ffa-suggest--visible') && !shell.classList.contains('ffa-panel-shell--visible')) {
                                collapseInput();
                            }
                        }, 150);
                    };
                    input.oninput = () => {
                        UIState.openMask();
                        UIState.openSuggest();
                        const url = getEngineUrl();
                        if (url) fetchSuggestions(input.value, suggestBox, mask, url);
                    };
                    input.onkeydown = (e) => {
                        const url = getEngineUrl();
                        if (url && SuggestModule.handleKeyNav(e, suggestBox, mask, url)) return;
                        if (e.key === 'Enter' && input.value.trim()) performSearch(url, input.value);
                        if (e.key === 'Escape') { input.blur(); }
                    };

                    if (!activeEngineUrl) qToolbar('.ffa-toolbar__engine-btn')?.classList.add('ffa-toolbar__engine-btn--active');
                },
            };
        }

        const PanelTemplates = {
            renderGeneralTab(s) {
                return `
                    <div class="ffa-panel__tab-content${_activeTab==='general'?' ffa-panel__tab-content--active':''}" data-tab="general">

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardLanguage')}</span>
                            <div style="display:flex;gap:8px">
                                <button class="ffa-theme-btn ${s.lang==='en'?'ffa-theme-btn--active':''}" data-action="lang" data-lang="en">English</button>
                                <button class="ffa-theme-btn ${s.lang==='zh'?'ffa-theme-btn--active':''}" data-action="lang" data-lang="zh">中文</button>
                            </div>
                        </div>

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardInteraction')}</span>
                            <div class="ffa-field__label">
                                <span>${t('labelMiniMode')}</span>
                                <div class="ffa-switch ${s.mm?'ffa-switch--on':''}" data-action="toggle-mm"></div>
                            </div>
                            <div class="ffa-field__hint">${t('hintMiniMode')}</div>
                            <div class="ffa-field__label" style="margin-top:16px">
                                ${t('labelOffset')} <b>${s.bt}px</b>
                            </div>
                            <input type="range" id="s-bt" min="0" max="300" value="${s.bt}">
                        </div>

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardSearch')}</span>
                            <div class="ffa-field__label">
                                <span>${t('labelNewTab')}</span>
                                <div class="ffa-switch ${s.searchBehavior.openInNewTab?'ffa-switch--on':''}" data-action="toggle-newtab"></div>
                            </div>
                            <div class="ffa-field__hint">${t('hintNewTab')}</div>
                            <div class="ffa-field__label" style="margin-top:16px">
                                <span>${t('labelSuggestionsToggle')}</span>
                                <div class="ffa-switch ${s.searchBehavior.suggestions?'ffa-switch--on':''}" data-action="toggle-suggestions"></div>
                            </div>
                            <div class="ffa-field__hint">${t('hintSuggestionsToggle')}</div>
                            <div class="ffa-field__label" style="margin-top:16px">
                                <span>${t('labelHistoryToggle')}</span>
                                <div class="ffa-switch ${s.searchBehavior.history?'ffa-switch--on':''}" data-action="toggle-history"></div>
                            </div>
                            <div class="ffa-field__hint">${t('hintHistoryToggle')}</div>
                        </div>

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardData')}</span>
                            <div style="display:flex;gap:10px">
                                <button data-action="export" class="ffa-btn--ghost" style="flex:1">
                                    ${t('btnExport')}
                                </button>
                                <label style="flex:1;display:block">
                                    <span class="ffa-btn--ghost" style="display:block;text-align:center">
                                        ${t('btnImport')}
                                    </span>
                                    <input type="file" id="s-import" accept=".json" style="display:none">
                                </label>
                            </div>
                        </div>
                    </div>`;
            },

            renderAppearanceTab(s, themeButtons, mkSwatches, bgColors, acColors) {
                return `
                    <div class="ffa-panel__tab-content${_activeTab==='appearance'?' ffa-panel__tab-content--active':''}" data-tab="appearance">

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardTheme')}</span>
                            <div style="display:flex;gap:8px">${themeButtons}</div>
                        </div>

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardColors')}</span>
                            <div class="ffa-field__label">${t('labelBgColor')}</div>
                            <div class="ffa-swatch-row">
                                ${mkSwatches(bgColors, 'b', s.b)}
                                <div class="ffa-swatch-custom" title="${t('btnCustomColor')}"><input type="color" id="s-bc" value="${escAttr(s.b)}"></div>
                            </div>
                            <div class="ffa-field__label" style="margin-top:16px">${t('labelAccentColor')}</div>
                            <div class="ffa-swatch-row">
                                ${mkSwatches(acColors, 'a', s.a)}
                                <div class="ffa-swatch-custom" title="${t('btnCustomColor')}"><input type="color" id="s-ac" value="${escAttr(s.a)}"></div>
                            </div>
                            <div style="margin-top:20px">
                                <div class="ffa-field__label">${t('labelFont')}</div>
                                <input type="text" id="s-font" class="ffa-input"
                                    value="${escAttr(s.font)}"
                                    placeholder="${escAttr(t('labelFontHint'))}"
                                    style="margin-bottom:0">
                            </div>
                        </div>

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardLayout')}</span>
                            <div style="display:flex;gap:20px">
                                <div style="flex:1">
                                    <div class="ffa-field__label">${t('labelFontSize')} <b>${s.fs}px</b></div>
                                    <input type="range" id="s-fs" min="10" max="24" value="${s.fs}">
                                </div>
                                <div style="flex:1">
                                    <div class="ffa-field__label">${t('labelPanelRadius')} <b>${s.r}px</b></div>
                                    <input type="range" id="s-r" min="0" max="60" value="${s.r}">
                                </div>
                            </div>
                            <div style="display:flex;gap:20px;margin-top:16px">
                                <div style="flex:1">
                                    <div class="ffa-field__label">${t('labelWidgetRadius')} <b>${s.ir}px</b></div>
                                    <input type="range" id="s-ir" min="0" max="40" value="${s.ir}">
                                </div>
                                <div style="flex:1"></div>
                            </div>
                        </div>

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardOpacity')}</span>
                            <div style="display:flex;gap:20px">
                                <div style="flex:1">
                                    <div class="ffa-field__label">${t('labelToolbarAlpha')} <b>${s.ta}%</b></div>
                                    <input type="range" id="s-ta" min="5" max="100" value="${s.ta}">
                                </div>
                                <div style="flex:1">
                                    <div class="ffa-field__label">${t('labelPanelAlpha')} <b>${s.pa}%</b></div>
                                    <input type="range" id="s-pa" min="5" max="100" value="${s.pa}">
                                </div>
                            </div>
                            <div style="display:flex;gap:20px;margin-top:16px">
                                <div style="flex:1">
                                    <div class="ffa-field__label">${t('labelToolbarBlur')} <b>${s.tb}px</b></div>
                                    <input type="range" id="s-tb" min="0" max="80" value="${s.tb}">
                                </div>
                                <div style="flex:1">
                                    <div class="ffa-field__label">${t('labelPanelBlur')} <b>${s.pb}px</b></div>
                                    <input type="range" id="s-pb" min="0" max="80" value="${s.pb}">
                                </div>
                            </div>
                        </div>
                    </div>`;
            },

            renderEnginesTab(engineRows) {
                return `
                    <div class="ffa-panel__tab-content${_activeTab==='engines'?' ffa-panel__tab-content--active':''}" data-tab="engines">

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardEngines')}</span>
                            <div class="ffa-engine-list">${engineRows}</div>
                            <button data-action="add-engine" class="ffa-btn--ghost"
                                style="width:100%;margin-top:15px">
                                ${t('btnAddEngine')}
                            </button>
                        </div>
                    </div>`;
            },

            renderBlocklistTab(s) {
                return `
                    <div class="ffa-panel__tab-content${_activeTab==='blocklist'?' ffa-panel__tab-content--active':''}" data-tab="blocklist">

                        <div class="ffa-card">
                            <span class="ffa-card__title">${t('cardBlacklist')}</span>
                            <div class="ffa-field__hint" style="margin-top:0;margin-bottom:14px">${t('labelBlacklistHint')}</div>
                            <div id="bl-list">
                                ${(!s.bl || s.bl.length === 0)
                                    ? `<div style="opacity:0.4;font-size:var(--ffa-font-size-sm);padding:6px 4px;font-style:italic">${t('blacklistEmpty')}</div>`
                                    : s.bl.map(d => `
                                        <div class="ffa-engine-row" style="padding:9px 12px;margin-bottom:8px;cursor:default">
                                            <div style="flex:1;font-size:var(--ffa-font-size-sm);font-family:monospace;letter-spacing:0.3px;color:var(--ffa-text-primary)">${SecurityUtils.escapeHtml(d)}</div>
                                            <div data-action="remove-blacklist" data-domain="${escAttr(d)}" title="Remove" style="color:#ff6b6b;cursor:pointer;font-size:var(--ffa-font-size-md);padding:2px 4px;border-radius:4px;transition:0.2s;line-height:1">✕</div>
                                        </div>`).join('')
                                }
                            </div>
                            <div style="display:flex;gap:8px;margin-top:12px;align-items:stretch">
                                <input type="text" id="bl-input" class="ffa-input"
                                    placeholder="${escAttr(t('labelBlacklistInput'))}"
                                    style="flex:1;margin-bottom:0">
                                <button data-action="add-blacklist" class="ffa-btn--ghost"
                                    style="flex-shrink:0;padding:10px 16px;white-space:nowrap">${t('btnAddDomain')}</button>
                            </div>
                            <div id="bl-feedback" style="font-size:var(--ffa-font-size-xs);color:#ff6b6b;min-height:16px;margin-top:4px;padding-left:2px;display:none"></div>
                            <button data-action="add-current-site" class="ffa-btn--ghost"
                                style="width:100%;margin-top:10px;opacity:0.7;font-size:var(--ffa-font-size-xs)">
                                ${t('btnAddCurrent')} — ${SecurityUtils.escapeHtml(window.location.hostname)}
                            </button>
                        </div>
                    </div>`;
            },

            renderEngineSubPanel() {
                return `
                <div class="ffa-subpanel" id="n-sub">
                    <div class="ffa-subpanel__scroll">
                        <h3 id="sub-title" style="color:var(--ffa-accent);margin:0 0 20px;font-size:var(--ffa-font-size-md);font-weight:900;letter-spacing:2px"></h3>
                        <div class="ffa-field__label">${t('labelName')}</div>
                        <input type="text" id="e-n" class="ffa-input">
                        <div class="ffa-field__hint">
                            ${t('hintNameDesc')}<br>
                            <span class="ffa-field__example" data-field-copy="${escAttr(t('hintNameEx'))}">
                                <span class="ffa-field__example-icon">⎘</span>${t('hintNameEx')}
                            </span>
                        </div>
                        <div class="ffa-field__label">${t('labelIcon')}</div>
                        <div class="ffa-icon-editor">
                            <textarea id="e-icon" class="ffa-icon-editor__textarea" placeholder="${escAttr(t('hintIconEx1'))}"></textarea>
                            <div class="ffa-icon-editor__preview" id="e-icon-preview" title="${escAttr(t('labelIconPreview'))}">—</div>
                        </div>
                        <div class="ffa-field__hint" style="margin-top:6px">
                            ${t('hintIconDesc')}<br><br>
                            <span style="font-size:var(--ffa-font-size-xs);font-weight:700;color:var(--ffa-text-secondary)">${t('hintIconFmt1')}</span><br>
                            <span class="ffa-field__example" data-field-copy="${escAttr(t('hintIconEx1'))}"><span class="ffa-field__example-icon">⎘</span>${t('hintIconEx1')}</span>
                        </div>
                        <div class="ffa-icon-editor__error" id="e-icon-error">${t('hintIconErr')}</div>
                        <div class="ffa-field__label">${t('labelUrl')}</div>
                        <input type="text" id="e-u" class="ffa-input">
                        <div class="ffa-field__hint">
                            ${t('hintUrlDesc')}<br>
                            <span class="ffa-field__example" data-field-copy="${escAttr(t('hintUrlEx'))}"><span class="ffa-field__example-icon">⎘</span>${t('hintUrlEx')}</span>
                        </div>
                        <div class="ffa-field__label">${t('labelHost')}</div>
                        <input type="text" id="e-h" class="ffa-input">
                        <div class="ffa-field__hint">
                            ${t('hintHostDesc')}<br>
                            <span class="ffa-field__example" data-field-copy="${escAttr(t('hintHostEx'))}"><span class="ffa-field__example-icon">⎘</span>${t('hintHostEx')}</span>
                            <div class="ffa-field__tip">${t('hintHostTip')}</div>
                        </div>
                    </div>
                    <div style="padding:16px 30px;border-top:1px solid var(--ffa-border);display:flex;gap:15px;flex-shrink:0">
                        <button data-action="confirm-engine" class="ffa-btn--primary" style="flex:1">${t('btnConfirm')}</button>
                        <button data-action="cancel-engine"  class="ffa-btn--ghost"   style="flex:1">${t('btnCancel')}</button>
                    </div>
                </div>`;
            },
        };

        const ToolbarController = {
            openSettings() {
                const fresh = GM_getValue(STORAGE_KEY, null);
                if (fresh) Object.assign(SettingsManager.current, fresh);
                UIState.openMask();
                UIState.openShell();
                wrapper.classList.add('ffa-toolbar-wrapper--pinned');
                toolbar.classList.add('ffa-toolbar--pinned');
                renderPanel();
            },

            render() {
                const settings = SettingsManager.current;
                toolbar.innerHTML = '';

                const settingsBtn = document.createElement('div');
                settingsBtn.className = 'ffa-toolbar__settings-btn';
                settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.3 7.3 0 0 0-1.62-.94l-.36-2.54A.484.484 0 0 0 14 3h-4c-.24 0-.43.17-.47.41l-.36 2.54a7.4 7.4 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.65 9.47a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54a7.4 7.4 0 0 0 1.62-.94l2.39.96a.48.48 0 0 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`;
                settingsBtn.onclick = () => this.openSettings();
                toolbar.append(settingsBtn);

                const currentQuery = extractPageQuery();
                const enabled = settings.en.filter(e => e.enabled);
                const activeEngineUrl = matchCurrentPageToEngine()?.url ?? null;

                enabled.forEach(eng => {
                    const btn = document.createElement('div');
                    btn.className = 'ffa-toolbar__engine-btn';
                    btn.dataset.engineUrl = eng.url;
                    if (activeEngineUrl === eng.url) btn.classList.add('ffa-toolbar__engine-btn--active');

                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'ffa-toolbar__engine-btn-icon';
                    iconSpan.appendChild(renderIconElement(eng.icon, 16));

                    const labelSpan = document.createElement('span');
                    labelSpan.className = 'ffa-toolbar__engine-btn-label';
                    labelSpan.textContent = eng.name;
                    btn.append(iconSpan, labelSpan);

                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const query = input.value.trim();
                        const engineUrl = btn.dataset.engineUrl;
                        if (query && engineUrl) {
                            performSearch(engineUrl, query);
                            return;
                        }
                        toolbar.querySelectorAll('.ffa-toolbar__engine-btn').forEach(b => b.classList.remove('ffa-toolbar__engine-btn--active'));
                        btn.classList.add('ffa-toolbar__engine-btn--active');
                        UIState.clearSuggest();
                        input.focus();
                        if (engineUrl) fetchSuggestions('', suggestBox, mask, engineUrl);
                    };

                    toolbar.append(btn);
                });

                const inputContainer = document.createElement('div');
                inputContainer.className = 'ffa-toolbar__input';

                const searchBtn = document.createElement('div');
                searchBtn.className = 'ffa-toolbar__search-btn';
                searchBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14"/></svg>`;

                const input = document.createElement('input');
                input.className = 'ffa-toolbar__search-input';
                input.value = currentQuery;
                input.setAttribute('aria-label', 'Search');

                const searchBinding = bindToolbarSearch(input, inputContainer, enabled, activeEngineUrl);
                searchBinding.bind(searchBtn);

                inputContainer.append(searchBtn, input);
                toolbar.append(inputContainer);

                updateMiniMode();
            },
        };

        let editingEngine = null;

        function renderPanel() {
            const s = SettingsManager.current;

            const themeButtons = Object.keys(THEMES).map(key => {
                const active = s.b.toUpperCase() === THEMES[key].b.toUpperCase();
                return `<button class="ffa-theme-btn${active ? ' ffa-theme-btn--active' : ''}" data-action="theme" data-key="${key}">${SecurityUtils.escapeHtml(THEMES[key].n[s.lang] ?? THEMES[key].n.en)}</button>`;
            }).join('');

            const engineRows = s.en.map((eng, i) => {
                const _iconEl = renderIconElement(eng.icon, 18);
                const iconHtml = _iconEl.outerHTML;
                return `
                    <div class="ffa-engine-row" draggable="true" data-i="${i}">
                        <div style="cursor:grab;opacity:0.3">☰</div>
                        <div style="width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--ffa-text-primary);opacity:0.8">${iconHtml}</div>
                        <div class="ffa-switch ${eng.enabled ? 'ffa-switch--on' : ''}" data-action="toggle-engine" data-i="${i}"></div>
                        <div style="flex:1">
                            <div style="font-size:var(--ffa-font-size-md);font-weight:700">${SecurityUtils.escapeHtml(eng.name)}</div>
                            <div class="ffa-engine-row__host">${SecurityUtils.escapeHtml(eng.host)}</div>
                        </div>
                        <div data-action="edit-engine" data-i="${i}" style="cursor:pointer">✎</div>
                        <div data-action="delete-engine" data-i="${i}" style="color:#ff6b6b;cursor:pointer">✕</div>
                    </div>`;
            }).join('');

            const bgColors = ['#FFFFFF','#F5F5F7','#F9F3E9','#F0EEF8','#E8F0FE','#E8F5E9','#FFF8E1','#1A1A2E','#0D0D1A','#0F1A12','#1A0A0A','#12121F'];
            const acColors = ['#1D1D1F','#2C2C3E','#6B4C3B','#8E6D5A','#007AFF','#5856D6','#FF2D55','#FF9500','#34C759','#00D4FF','#89D4A0','#FFD60A'];
            const mkSwatches = (colors, target, currentVal) =>
                colors.map(c => `<div class="ffa-swatch${currentVal===c?' ffa-swatch--selected':''}" data-action="swatch" data-color="${c}" data-target="${target}" style="background:${c}" title="${c}"></div>`).join('');

            panel.innerHTML = `
                <div class="ffa-panel__title">${t('panelTitle')}</div>
                <div class="ffa-panel__scroll" style="padding-top:20px">
                    ${PanelTemplates.renderGeneralTab(s)}
                    ${PanelTemplates.renderAppearanceTab(s, themeButtons, mkSwatches, bgColors, acColors)}
                    ${PanelTemplates.renderEnginesTab(engineRows)}
                    ${PanelTemplates.renderBlocklistTab(s)}
                </div>
                <div class="ffa-panel__footer">
                    <button data-action="apply" class="ffa-btn--primary" style="flex:2">${t('btnApply')}</button>
                    <button data-action="reset"  class="ffa-btn--danger"  style="flex:1">${t('btnReset')}</button>
                </div>
                ${PanelTemplates.renderEngineSubPanel()}`;

            tabNav.querySelectorAll('.ffa-panel__tab-btn').forEach(btn => {
                btn.classList.toggle('ffa-panel__tab-btn--active', btn.dataset.tab === _activeTab);
            });

            bindPanelInputs();
        }

        panel.addEventListener('click', function onPanelClick(e) {
            const s = SettingsManager.current;
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;
            PanelActions.dispatch(action, el, s);
        });

        const PanelBindings = {
            bindRanges(settings) {
                const bindRange = (id, key, suffix = 'px') => {
                    const el = qPanel(`#${id}`);
                    if (!el) return;
                    const labelEl = el.previousElementSibling?.querySelector('b');
                    el.oninput = e => {
                        settings[key] = +e.target.value;
                        if (labelEl) labelEl.textContent = settings[key] + suffix;
                        Refresh.saveAndStyles();
                    };
                };
                bindRange('s-bt', 'bt');
                bindRange('s-fs', 'fs');
                bindRange('s-ta', 'ta', '%');
                bindRange('s-pa', 'pa', '%');
                bindRange('s-tb', 'tb', 'px');
                bindRange('s-pb', 'pb', 'px');
                bindRange('s-r', 'r');
                bindRange('s-ir', 'ir');
            },

            bindAppearance(settings) {
                qPanel('#s-bc').oninput = e => {
                    settings.b = e.target.value;
                    panel.querySelectorAll('.ffa-swatch[data-target="b"]').forEach(sw => sw.classList.remove('ffa-swatch--selected'));
                    Refresh.saveAndStyles();
                };
                qPanel('#s-ac').oninput = e => {
                    settings.a = e.target.value;
                    panel.querySelectorAll('.ffa-swatch[data-target="a"]').forEach(sw => sw.classList.remove('ffa-swatch--selected'));
                    Refresh.saveAndStyles();
                };
                qPanel('#s-font').oninput = e => {
                    settings.font = e.target.value;
                    Refresh.saveAndStyles();
                };
            },

            bindEngineEditor() {
                const iconInput = qPanel('#e-icon');
                if (iconInput) {
                    iconInput.oninput = () => {
                        qPanel('#e-icon-error')?.classList.remove('ffa-icon-editor__error--visible');
                        updateIconPreview(iconInput.value.trim(), qPanel('#e-icon-preview'));
                    };
                }

                panel.querySelectorAll('[data-field-copy]').forEach(chip => {
                    chip.onclick = e => {
                        e.stopPropagation();
                        const hint = chip.closest('.ffa-field__hint');
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
            },

            bindImport() {
                const importInput = qPanel('#s-import');
                if (!importInput) return;
                importInput.onchange = e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                        if (SettingsManager.importJSON(ev.target.result)) {
                            Refresh.styles();
                            Refresh.panel();
                        } else {
                            alert(t('importFail'));
                        }
                    };
                    reader.readAsText(file);
                    importInput.value = '';
                };
            },

            bindBlocklist() {
                const blInput = qPanel('#bl-input');
                if (!blInput) return;
                blInput.onkeydown = e => {
                    if (e.key !== 'Enter') return;
                    const val = blInput.value.trim();
                    if (!val) return;
                    const blFeedback = qPanel('#bl-feedback');
                    const result = SettingsManager.addToBlacklist(val);
                    if (result === 'duplicate') {
                        if (blFeedback) { blFeedback.textContent = t('blacklistDuplicate'); blFeedback.style.display = 'block'; }
                        setTimeout(() => { if (blFeedback) blFeedback.style.display = 'none'; }, 2000);
                    } else {
                        blInput.value = '';
                        if (blFeedback) blFeedback.style.display = 'none';
                        Refresh.panel();
                    }
                };
            },

            bindEngineSort(settings) {
                const list = qPanel('.ffa-engine-list');
                if (!list) return;
                let draggingEngine = null;

                list.ondragstart = e => {
                    const row = e.target.closest('.ffa-engine-row');
                    if (!row) return;
                    const idx = parseInt(row.dataset.i);
                    if (isNaN(idx) || idx < 0 || idx >= settings.en.length) return;
                    draggingEngine = settings.en[idx];
                    row.classList.add('ffa-engine-row--dragging');
                    e.dataTransfer.effectAllowed = 'move';
                };

                list.ondragenter = e => {
                    if (!draggingEngine) return;
                    e.preventDefault();
                    list.classList.add('ffa-engine-list--drag-active');
                };

                list.ondragover = e => {
                    if (!draggingEngine) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    const dragging = list.querySelector('.ffa-engine-row--dragging');
                    if (!dragging) return;
                    const sibling = [...list.querySelectorAll('.ffa-engine-row:not(.ffa-engine-row--dragging)')]
                        .reduce((best, row) => {
                            const rect = row.getBoundingClientRect();
                            const offset = e.clientY - rect.top - rect.height / 2;
                            return (offset < 0 && offset > best.offset) ? { offset, element: row } : best;
                        }, { offset: -Infinity }).element;
                    sibling ? list.insertBefore(dragging, sibling) : list.appendChild(dragging);
                };

                list.ondragleave = e => {
                    if (e.target === list || !list.contains(e.relatedTarget)) list.classList.remove('ffa-engine-list--drag-active');
                };

                list.ondrop = e => { e.preventDefault(); e.stopPropagation(); };

                list.ondragend = e => {
                    e.target.closest('.ffa-engine-row')?.classList.remove('ffa-engine-row--dragging');
                    list.classList.remove('ffa-engine-list--drag-active');
                    if (!draggingEngine) return;

                    const reordered = [...list.querySelectorAll('.ffa-engine-row')].reduce((acc, row) => {
                        const idx = parseInt(row.dataset.i);
                        if (!isNaN(idx) && idx >= 0 && idx < settings.en.length) {
                            const eng = settings.en[idx];
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
            },

            bindAll(settings) {
                this.bindRanges(settings);
                this.bindAppearance(settings);
                this.bindEngineEditor();
                this.bindImport();
                this.bindBlocklist();
                this.bindEngineSort(settings);
            },
        };

        function bindPanelInputs() {
            PanelBindings.bindAll(SettingsManager.current);
        }

        const applyStyles = debounce(() => {
            StyleEngine.update();
            ToolbarController.render();
        }, 16);

        function updateMiniMode() {
            const s = SettingsManager.current;
            if (!miniIcon && s.mm) { requestAnimationFrame(updateMiniMode); return; }

            const anyVisible = UIState.isOverlayVisible();
            if (!s.mm) {
                wrapper.classList.remove('ffa-toolbar-wrapper--mini', 'ffa-toolbar-wrapper--revealed');
                miniIcon?.classList.remove('ffa-mini-icon--visible', 'ffa-mini-icon--hidden', 'ffa-mini-icon--hovered');
                miniHitArea?.classList.remove('ffa-mini-hitarea--active');
            } else if (anyVisible) {
                wrapper.classList.add('ffa-toolbar-wrapper--mini', 'ffa-toolbar-wrapper--revealed');
                miniIcon?.classList.remove('ffa-mini-icon--visible', 'ffa-mini-icon--hidden', 'ffa-mini-icon--hovered');
                miniHitArea?.classList.remove('ffa-mini-hitarea--active');
            } else {
                wrapper.classList.add('ffa-toolbar-wrapper--mini');
                wrapper.classList.remove('ffa-toolbar-wrapper--revealed');
                miniIcon?.classList.add('ffa-mini-icon--visible');
                miniIcon?.classList.remove('ffa-mini-icon--hidden', 'ffa-mini-icon--hovered');
                miniHitArea?.classList.add('ffa-mini-hitarea--active');
            }
        }

        cleanupTasks.push(EventBus.on('settings:changed', updateMiniMode));

        function observePanelChanges() {
            const obs = new MutationObserver(updateMiniMode);
            obs.observe(shell, { attributes: true, attributeFilter: ['class'] });
            obs.observe(suggestBox, { attributes: true, attributeFilter: ['class'] });
            mask.onclick = () => UIState.closePanelOverlay();
            return () => obs.disconnect();
        }

        applyStyles();
        updateMiniMode();
        cleanupTasks.push(observePanelChanges());
        renderPanel();

        const cleanup = () => {
            lifecycle.abort();
            cleanupTasks.forEach(fn => {
                try { fn?.(); } catch (err) { console.warn('[FFA] cleanup', err); }
            });
            cleanupTasks.length = 0;
            AppRoot.markMounted(false);
            _isInitialized = false;
        };
        window.addEventListener('pagehide', cleanup, { once: true, signal });
    }

    init();

})();