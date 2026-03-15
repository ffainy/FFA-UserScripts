// ==UserScript==
// @name         FFA Omnibar
// @namespace    http://tampermonkey.net/
// @description    A floating search toolbar — unify Google, Bing, Baidu, Bilibili, Wikipedia, Steam and more. Switch engines instantly, get real-time suggestions, customize themes, fonts, and layout.
// @description:zh-CN  悬浮搜索栏，整合 Google、Bing、百度、Bilibili、维基百科、Steam 等引擎，即时切换，智能补全，支持主题、字体与布局自定义。
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjZjk1Y2UzIiBkPSJNMCAxMmMwIDkuNjggMi4zMiAxMiAxMiAxMnMxMi0yLjMyIDEyLTEyUzIxLjY4IDAgMTIgMFMwIDIuMzIgMCAxMm00Ljg0IDIuNDkybDMuNzYyLTguNTU1QzkuMjM4IDQuNDk4IDEwLjQ2IDMuNzE2IDEyIDMuNzE2czIuNzYyLjc4MSAzLjM5OCAyLjIyM2wzLjc2MiA4LjU1NGMuMTcyLjQxOC4zMi45NTMuMzIgMS40MThjMCAyLjEyNS0xLjQ5MiAzLjYxNy0zLjYxNyAzLjYxN2MtLjcyNiAwLTEuMy0uMTgzLTEuODgzLS4zN2MtLjU5Ny0uMTkyLTEuMjAzLS4zODctMS45OC0uMzg3Yy0uNzcgMC0xLjM5LjE5NS0xLjk5Ni4zODZjLS41OS4xODgtMS4xNjguMzcxLTEuODY3LjM3MWMtMi4xMjUgMC0zLjYxNy0xLjQ5Mi0zLjYxNy0zLjYxN2MwLS40NjUuMTQ4LTEgLjMyLTEuNDE4Wk0xMiA3LjQzbC0zLjcxNSA4LjQwNmMxLjEwMi0uNTEyIDIuMzcxLS43NTggMy43MTUtLjc1OGMxLjI5NyAwIDIuNjEzLjI0NiAzLjY2NC43NThaIi8+PC9zdmc+
// @version      3.0.1
// @author       Farfaraway
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

    const STORAGE_KEY = 'ffa_omnibar_settings';
    const HISTORY_KEY = 'ffa_omnibar_history';
    const HISTORY_MAX = 20;

    /** 内置搜索引擎列表（内置图标使用内联 SVG 以支持 currentColor 主题色） */
    const DEFAULT_ENGINES = [
        { name: 'Google',    url: 'https://www.google.com/search?q=%s',                host: 'www.google.com',         enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133c-1.147 1.147-2.933 2.4-6.053 2.4c-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0C5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36c2.16-2.16 2.84-5.213 2.84-7.667c0-.76-.053-1.467-.173-2.053z"/></svg>' },
        { name: 'DuckDuckGo',url: 'https://duckduckgo.com/?q=%s',                      host: 'duckduckgo.com',         enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12s12-5.37 12-12S18.63 0 12 0m0 .984C18.083.984 23.016 5.916 23.016 12S18.084 23.016 12 23.016S.984 18.084.984 12S5.916.984 12 .984m0 .938C6.434 1.922 1.922 6.434 1.922 12c0 4.437 2.867 8.205 6.85 9.55c-.237-.82-.776-2.753-1.6-6.052c-1.184-4.741-2.064-8.606 2.379-9.813c.047-.011.064-.064.03-.093c-.514-.467-1.382-.548-2.233-.38a.06.06 0 0 1-.07-.058c0-.011 0-.023.011-.035c.205-.286.572-.507.822-.64a1.8 1.8 0 0 0-.607-.335c-.059-.022-.059-.12-.006-.144q.008-.01.024-.012c1.749-.233 3.586.292 4.49 1.448a.1.1 0 0 0 .035.023c2.968.635 3.509 4.837 3.328 5.998a9.6 9.6 0 0 0 2.346-.576c.746-.286 1.008-.222 1.101-.053c.1.193-.018.513-.28.81c-.496.567-1.393 1.01-2.974 1.137c-.546.044-1.029.024-1.445.006c-.789-.035-1.339-.059-1.633.39c-.192.298-.041.998 1.487 1.22c1.09.157 2.078.047 2.798-.034c.643-.07 1.073-.118 1.172.069c.21.402-.996 1.207-3.066 1.224q-.238-.002-.467-.011c-1.283-.065-2.227-.414-2.816-.735a.1.1 0 0 1-.035-.017c-.105-.059-.31.045-.188.267c.07.134.444.478 1.004.776c-.058.466.087 1.184.338 2l.088-.016q.063-.015.134-.025c.507-.082.775.012.926.175c.717-.536 1.913-1.294 2.03-1.154c.583.694.66 2.332.53 2.99q-.006.018-.04.035c-.274.117-1.783-.296-1.783-.511c-.059-1.075-.26-1.173-.493-1.225h-.156a.1.1 0 0 1 .018.03l.052.12c.093.257.24 1.063.13 1.26c-.112.199-.835.297-1.284.303c-.443.006-.543-.158-.637-.408c-.07-.204-.103-.675-.103-.95a1 1 0 0 1 .012-.216c-.134.058-.333.193-.397.281c-.017.262-.017.682.123 1.149c.07.221-1.518 1.164-1.74.99c-.227-.181-.634-1.952-.459-2.67c-.187.017-.338.075-.42.191c-.367.508.093 2.933.582 3.248c.257.169 1.54-.553 2.176-1.095c.105.145.305.158.553.158c.326-.012.782-.06 1.103-.158c.192.45.423.972.613 1.388c4.47-1.032 7.803-5.037 7.803-9.82c0-5.566-4.512-10.078-10.078-10.078m1.791 5.646c-.42 0-.678.146-.795.332c-.023.047.047.094.094.07c.14-.075.357-.161.701-.156c.328.006.516.09.67.159l.023.01c.041.017.088-.03.059-.065c-.134-.18-.332-.35-.752-.35m-5.078.198a1.2 1.2 0 0 0-.522.082c-.454.169-.67.526-.67.76c0 .051.112.057.141.011c.081-.123.21-.31.617-.478c.408-.17.73-.146.951-.094c.047.012.083-.041.041-.07a1 1 0 0 0-.558-.211m5.434 1.423a.65.65 0 0 0-.655.647a.652.652 0 0 0 1.307 0a.646.646 0 0 0-.652-.647m.283.262h.008a.17.17 0 0 1 .17.17c0 .093-.077.17-.17.17a.17.17 0 0 1-.17-.17c0-.09.072-.165.162-.17m-5.358.076a.75.75 0 0 0-.758.758c0 .42.338.758.758.758s.758-.337.758-.758a.756.756 0 0 0-.758-.758m.328.303h.01a.199.199 0 1 1 0 .397a.195.195 0 0 1-.197-.198c0-.107.082-.194.187-.199"/></svg>' },
        { name: 'Bing',      url: 'https://www.bing.com/search?q=%s',                  host: 'bing.com',               enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 3v16l3.72 2L18 15.82v-4.09L9.77 8.95l1.61 3.89L13.94 14L8.7 16.92V4.27z"/></svg>' },
        { name: 'Baidu',     url: 'https://www.baidu.com/s?wd=%s',                     host: 'www.baidu.com',          enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.154 0C7.71 0 6.54 1.658 6.54 3.707c0 2.051 1.171 3.71 2.615 3.71c1.446 0 2.614-1.659 2.614-3.71C11.768 1.658 10.6 0 9.154 0m7.025.594C14.86.58 13.347 2.589 13.2 3.927c-.187 1.745.25 3.487 2.179 3.735c1.933.25 3.175-1.806 3.422-3.364c.252-1.555-.995-3.364-2.362-3.674a1.2 1.2 0 0 0-.261-.03zM3.582 5.535a3 3 0 0 0-.156.008c-2.118.19-2.428 3.24-2.428 3.24c-.287 1.41.686 4.425 3.297 3.864c2.617-.561 2.262-3.68 2.183-4.362c-.125-1.018-1.292-2.773-2.896-2.75m16.534 1.753c-2.308 0-2.617 2.119-2.617 3.616c0 1.43.121 3.425 2.988 3.362s2.553-3.238 2.553-3.988c0-.745-.62-2.99-2.924-2.99m-8.264 2.478c-1.424.014-2.708.925-3.323 1.947c-1.118 1.868-2.863 3.05-3.112 3.363c-.25.309-3.61 2.116-2.864 5.42c.746 3.301 3.365 3.237 3.365 3.237s1.93.19 4.171-.31c2.24-.495 4.17.123 4.17.123s5.233 1.748 6.665-1.616c1.43-3.364-.808-5.109-.808-5.109s-2.99-2.306-4.736-4.798c-1.072-1.665-2.348-2.268-3.528-2.257m-2.234 3.84l1.542.024v8.197H7.758c-1.47-.291-2.055-1.292-2.13-1.462c-.072-.173-.488-.976-.268-2.343c.635-2.049 2.447-2.196 2.447-2.196h1.81zm3.964 2.39v3.881c.096.413.612.488.612.488h1.614v-4.343h1.689v5.782h-3.915c-1.517-.39-1.59-1.465-1.59-1.465v-4.317zm-5.458 1.147c-.66.197-.978.708-1.05.928c-.076.22-.247.78-.1 1.269c.294 1.095 1.248 1.144 1.248 1.144h1.37v-3.34z"/></svg>' },
        { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s',    host: 'en.wikipedia.org',       enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728c-.616 1.074-1.127.931-1.532.029c-1.406-3.321-4.293-9.144-5.651-12.409c-.251-.601-.441-.987-.619-1.139q-.27-.225-1.122-.271q-.314-.034-.313-.159v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434q0 .177-.225.176l-.564.031c-.485.029-.727.164-.727.436c0 .135.053.33.166.601c1.082 2.646 4.818 10.521 4.818 10.521l.136.046l2.411-4.81l-.482-1.067l-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617c-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252l1.758-3.504c.293-.64.233-.801.111-.947c-.07-.084-.305-.22-.812-.24l-.201-.021a.23.23 0 0 1-.145-.051a.15.15 0 0 1-.067-.129v-.427l.061-.045c1.247-.008 4.043 0 4.043 0l.059.045v.436c0 .121-.059.178-.193.178c-.646.03-.782.095-1.023.439c-.12.186-.375.589-.646 1.039l-2.301 4.273l-.065.135l2.792 5.712l.17.048l4.396-10.438c.154-.422.129-.722-.064-.895c-.197-.172-.346-.273-.857-.295l-.42-.016a.26.26 0 0 1-.152-.045c-.043-.029-.072-.075-.072-.119v-.436l.059-.045h4.961l.041.045v.437c0 .119-.074.18-.209.18c-.648.03-1.127.18-1.443.421c-.314.255-.557.616-.736 1.067c0 0-4.043 9.258-5.426 12.339c-.525 1.007-1.053.917-1.503-.031c-.571-1.171-1.773-3.786-2.646-5.71z"/></svg>' },
        { name: 'GitHub',    url: 'https://github.com/search?q=%s',                    host: 'github.com',             enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>' },
        { name: 'Twitter',   url: 'https://twitter.com/search?q=%s',                   host: 'twitter.com',            enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14.234 10.162L22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299l-.929-1.329L3.076 1.56h3.182l5.965 8.532l.929 1.329l7.754 11.09h-3.182z"/></svg>' },
        { name: 'YouTube',   url: 'https://www.youtube.com/results?search_query=%s',   host: 'www.youtube.com',        enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M23.498 6.186a3.02 3.02 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.02 3.02 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.02 3.02 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.02 3.02 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.545 15.568V8.432L15.818 12z"/></svg>' },
        { name: 'Bilibili',  url: 'https://search.bilibili.com/all?keyword=%s',        host: 'search.bilibili.com',    enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.813 4.653h.854q2.266.08 3.773 1.574Q23.946 7.72 24 9.987v7.36q-.054 2.266-1.56 3.773c-1.506 1.507-2.262 1.524-3.773 1.56H5.333q-2.266-.054-3.773-1.56C.053 19.614.036 18.858 0 17.347v-7.36q.054-2.267 1.56-3.76t3.773-1.574h.774l-1.174-1.12a1.23 1.23 0 0 1-.373-.906q0-.534.373-.907l.027-.027q.4-.373.92-.373t.92.373L9.653 4.44q.107.106.187.213h4.267a.8.8 0 0 1 .16-.213l2.853-2.747q.4-.373.92-.373c.347 0 .662.151.929.4s.391.551.391.907q0 .532-.373.906zM5.333 7.24q-1.12.027-1.88.773q-.76.748-.786 1.894v7.52q.026 1.146.786 1.893t1.88.773h13.334q1.12-.026 1.88-.773t.786-1.893v-7.52q-.026-1.147-.786-1.894t-1.88-.773zM8 11.107q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q0-.56.386-.947q.387-.386.947-.386m8 0q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q.025-.586.4-.96q.373-.373.933-.373"/></svg>' },
        { name: 'Steam',     url: 'https://store.steampowered.com/search/?term=%s',    host: 'store.steampowered.com', enabled: true,  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658a3.4 3.4 0 0 1 1.912-.59q.094.001.188.006l2.861-4.142V8.91a4.53 4.53 0 0 1 4.524-4.524c2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911l.004.159a3.39 3.39 0 0 1-3.39 3.396a3.41 3.41 0 0 1-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0M7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25a2.551 2.551 0 0 0 3.337-3.324a2.547 2.547 0 0 0-3.255-1.413l1.523.63a1.878 1.878 0 0 1-1.445 3.467zm11.415-9.303a3.02 3.02 0 0 0-3.015-3.015a3.015 3.015 0 1 0 3.015 3.015m-5.273-.005a2.264 2.264 0 1 1 4.531 0a2.267 2.267 0 0 1-2.266 2.265a2.264 2.264 0 0 1-2.265-2.265"/></svg>' },
    ];

    /** 内置主题 */
    const THEMES = {
        // 墨水屏清晰感：近白背景，深墨强调色，几乎无圆角，极低透明度，克制的发光
        minimal: { n: { en: 'Clean Steel',  zh: '极简工业' }, b: '#F4F4F5', a: '#1A1A2E', r: 8,  ir: 6,  ta: 70, pa: 80, glow: 0.6 },
        // 午后书屋：暖米色背景，深焦糖咖啡强调色，适中圆角，温润的发光
        warm:    { n: { en: 'Warm Reading', zh: '午后书屋' }, b: '#F5ECD8', a: '#8B5E3C', r: 20, ir: 10, ta: 65, pa: 75, glow: 0.9 },
        // 暗夜霓虹：深黑背景，电光蓝强调色，大圆角，高透明度，强烈的霓虹光晕
        cyber:   { n: { en: 'Neon Noir',    zh: '暗夜霓虹' }, b: '#080810', a: '#00FFEA', r: 28, ir: 14, ta: 35, pa: 45, glow: 1.6 },
        // 宁静森林：深绿背景，苔藓灰绿强调色，圆润圆角，柔和的自然光晕
        forest:  { n: { en: 'Deep Forest',  zh: '宁静森林' }, b: '#0A1A0F', a: '#5C7A5A', r: 16, ir: 10, ta: 40, pa: 50, glow: 1.2 },
    };

    /** 国际化文本表 */
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
    };

    /** 全局默认设置 */
    const DEFAULT_SETTINGS = {
        bt: 30,           // 工具栏距底部距离 (px)
        fs: 14,           // 字体大小 (px)
        ta: 50,           // 工具栏背景透明度 (%)
        pa: 60,           // 面板背景透明度 (%)
        tb: 40,           // 工具栏模糊系数 (px)
        pb: 45,           // 面板模糊系数 (px)
        mm: true,         // 迷你模式
        lang: 'en',       // 语言
        font: '',         // 自定义字体
        searchBehavior: {
            openInNewTab: true,  // 搜索时是否在新标签页打开
        },
        en: DEFAULT_ENGINES,
        ...THEMES.cyber,
    };

    const EventBus = {
        _h: new Map(),
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

    const SecurityUtils = {
        escapeHtml(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
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
     * 用户未设置图标时的默认图标（base64 data URI）
     * 用于新增自定义引擎未填写图标的场景
     */
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

    /**
     * 根据当前页面host匹配对应的搜索引擎
     * @returns {object|null} 匹配的引擎对象，未匹配返回null
     */
    function matchCurrentPageToEngine() {
        const currentHost = window.location.host;
        const enabled = SettingsManager.current?.en?.filter(e => e.enabled) ?? [];
        return enabled.find(e => e.host === currentHost)
            || enabled.find(e => currentHost.endsWith('.' + e.host))
            || null;
    }

    function performSearch(engineUrl, query) {
        if (!engineUrl || !query?.trim()) return;
        const term = query.trim();
        const url = engineUrl.replace('%s', encodeURIComponent(term));
        HistoryModule.push(term);
        if (SettingsManager.current?.searchBehavior?.openInNewTab) {
            window.open(url, '_blank');
        } else {
            location.href = url;
        }
    }

    
    /** 内置引擎的 host 集合，编辑时图标输入框不回填内置图标 */
    const BUILTIN_HOSTS = new Set(DEFAULT_ENGINES.map(e => e.host));

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
        el.appendChild(decodeBase64Icon(result.value, 24));
    }

    function buildCSSVariables(s) {
        const textColor  = contrastColor(s.b);
        const isDark     = textColor === '#fff';
        const glow       = s.glow ?? 1.0;
        const shadowColor = hexToRgba(s.a, isDark ? 0.4 * glow : 0.3 * glow);
        const shadowSpec  = `0 ${isDark ? 20 : 15}px ${Math.round((isDark ? 80 : 60) * glow)}px ${shadowColor}`;
        const saturation  = isDark ? `${Math.round(180 + 30 * glow)}%` : `${Math.round(160 + 20 * glow)}%`;
        const dimText     = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.78)';
        const borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
        const innerBg     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const nagAlpha    = isDark ? 0.35 * glow : 0.18 * glow;
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
            `--nag:${hexToRgba(s.a, nagAlpha)};` +
            `--nib:${innerBg};` +
            `--nf:${fontStack}system-ui,sans-serif;` +
            `--sp:cubic-bezier(0.23,1,0.32,1);` +
            `--sd:${shadowSpec};` +
            `--ng:blur(${s.tb}px) saturate(${saturation});` +
            `--ngp:blur(${s.pb}px) saturate(${saturation});` +
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

        exportJSON() { return JSON.stringify(this._s, null, 2); },

        importJSON(jsonStr) {
            try {
                const saved = JSON.parse(jsonStr);
                if (typeof saved !== 'object' || !saved) throw new Error();
                this._s = { ...DEFAULT_SETTINGS, ...saved };
                this._s.en = this._mergeEngines(saved);
                this.save();
                EventBus.emit('settings:reset');
                return true;
            } catch { return false; }
        },
    };

    const StyleEngine = {
        _el: null,
        init() {
            this._el = document.getElementById('ffa-global-style');
            if (!this._el) {
                this._el = document.createElement('style');
                this._el.id = 'ffa-global-style';
                document.head.appendChild(this._el);
            }
            this.update();
        },
        update() {
            if (this._el) this._el.textContent = buildCSSVariables(SettingsManager.current) + PANEL_CSS;
        },
    };

    const PANEL_CSS = [
        /* 遮罩 */
        `.neo-mask{position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);z-index:2147483640;visibility:hidden;opacity:0;transition:0.5s}`,
        `.neo-mask.show{visibility:visible;opacity:1}`,
        /* 面板主体 */
        `.neo-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-48%) scale(0.94);width:520px;min-height:40vh;max-height:70vh;border-radius:var(--nr);padding:30px 0;z-index:2147483645;visibility:hidden;opacity:0;color:var(--ntm);font-family:var(--nf);box-shadow:var(--sd);transition:0.5s var(--sp);background:var(--nbs);border:1px solid var(--nbd);backdrop-filter:var(--ngp);display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}`,
        `.neo-panel.show{visibility:visible;opacity:1;transform:translate(-50%,-50%) scale(1)}`,
        `.neo-panel *{font-family:var(--nf) !important;color:inherit;box-sizing:border-box}`,
        `.neo-panel a,.neo-panel a:visited,.neo-panel a:hover{color:inherit;text-decoration:none}`,
        /* 滚动区 */
        `.neo-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:0 28px}`,
        `.neo-scroll::-webkit-scrollbar{width:4px}`,
        `.neo-scroll::-webkit-scrollbar-track{background:transparent}`,
        `.neo-scroll::-webkit-scrollbar-thumb{background:var(--nag);border-radius:10px;transition:background 0.2s}`,
        `.neo-scroll::-webkit-scrollbar-thumb:hover{background:var(--na)}`,
        `.neo-scroll{scrollbar-width:thin;scrollbar-color:var(--nag) transparent}`,
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
        `input[type=range]{width:100%;cursor:pointer;margin:12px 0;height:18px;background:transparent;outline:none;border:none;padding:0;-webkit-appearance:none;appearance:none;font-family:var(--nf)}`,
        `input[type=range]::-webkit-slider-runnable-track{height:4px;background:var(--nbd);border-radius:2px}`,
        `input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--na);margin-top:-5px;box-shadow:0 0 6px var(--nag);transition:box-shadow 0.2s,transform 0.2s;border:none}`,
        `input[type=range]:hover::-webkit-slider-thumb{box-shadow:0 0 10px var(--na),0 0 20px var(--nag);transform:scale(1.15)}`,
        `input[type=range]::-moz-range-track{height:4px;background:var(--nbd);border-radius:2px;border:none}`,
        `input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--na);box-shadow:0 0 6px var(--nag);transition:box-shadow 0.2s,transform 0.2s;border:none;cursor:pointer}`,
        `input[type=range]:hover::-moz-range-thumb{box-shadow:0 0 10px var(--na),0 0 20px var(--nag);transform:scale(1.15)}`,
        /* 底部按钮区 */
        `.neo-footer{padding:20px 28px;display:flex;gap:15px;border-top:1px solid var(--nbd)}`,
        `.neo-btn-main{padding:14px;background:var(--na);color:var(--noa);border:none;border-radius:var(--ni);font-weight:800;cursor:pointer;transition:0.25s var(--sp);box-sizing:border-box;box-shadow:0 4px 15px var(--nag);font-family:var(--nf);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;transform:translateZ(0)}`,
        `.neo-btn-main:hover{transform:translateY(-3px);box-shadow:0 8px 25px var(--nag),0 0 15px var(--nag);text-shadow:0 0 10px var(--noa),0 0 25px var(--noa)}`,
        `.neo-btn-ghost{padding:14px;background:var(--nib);color:var(--ntm);border:1px solid var(--nbd);border-radius:var(--ni);font-size:11px;font-weight:600;cursor:pointer;transition:0.25s var(--sp);box-sizing:border-box;font-family:var(--nf);-webkit-font-smoothing:antialiased;transform:translateZ(0)}`,
        `.neo-btn-ghost:hover{background:var(--nag);border-color:var(--na);transform:translateY(-3px);box-shadow:0 4px 15px var(--nag),0 0 10px var(--nag);color:var(--ntm);text-shadow:0 0 8px var(--na)}`,
        `.neo-btn-danger{padding:14px;background:var(--nib);color:#ff4757;border:1px solid rgba(255,71,87,0.3);border-radius:var(--ni);font-weight:800;cursor:pointer;transition:0.25s var(--sp);box-sizing:border-box;font-family:var(--nf);-webkit-font-smoothing:antialiased;transform:translateZ(0)}`,
        `.neo-btn-danger:hover{background:rgba(255,71,87,0.12);border-color:#ff4757;transform:translateY(-3px);box-shadow:0 4px 15px rgba(255,71,87,0.3),0 0 10px rgba(255,71,87,0.2);text-shadow:0 0 8px rgba(255,71,87,0.8)}`,
        /* 编辑引擎子面板 */
        `.neo-sub-panel{position:absolute;inset:0;background:var(--nbs);backdrop-filter:var(--ngp);z-index:100;padding:0;transform:translateY(100%);transition:0.5s var(--sp);display:flex;flex-direction:column;box-sizing:border-box;border-top:1px solid var(--nbd)}`,
        `.neo-sub-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:30px;box-sizing:border-box}`,
        `.neo-sub-scroll::-webkit-scrollbar{width:4px}`,
        `.neo-sub-scroll::-webkit-scrollbar-track{background:transparent}`,
        `.neo-sub-scroll::-webkit-scrollbar-thumb{background:var(--nag);border-radius:10px}`,
        `.neo-sub-scroll::-webkit-scrollbar-thumb:hover{background:var(--na)}`,
        `.neo-sub-scroll{scrollbar-width:thin;scrollbar-color:var(--nag) transparent}`,
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
        /* 迷你模式图标（挂在 document.body，不受 Shadow DOM transform 影响）*/
        `.ffa-mini-icon{position:fixed;bottom:calc(44px * -1 / 3);left:50%;transform:translateX(-50%);width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity 0.7s,transform 0.7s;opacity:0;pointer-events:none;z-index:2147483641;overflow:visible}`,
        `.ffa-mini-icon svg{width:28px;height:28px;transition:all 0.6s;filter:drop-shadow(0 0 4px var(--na));color:var(--na)}`,
        `.ffa-mini-icon.hovered svg{transform:scale(1.15) rotate(8deg);filter:drop-shadow(0 0 8px var(--na)) drop-shadow(0 0 16px var(--na))}`,
        `.ffa-mini-icon.visible{opacity:1;pointer-events:auto}`,
        `.ffa-mini-icon.hidden{opacity:0;transform:translateX(-50%) translateY(25px) scale(0.7);pointer-events:none}`,
        `.ffa-mini-hitarea{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:64px;height:36px;z-index:2147483642;cursor:pointer;pointer-events:none}`,
        `.ffa-mini-hitarea.active{pointer-events:auto}`,
    ].join('');

    const TOOLBAR_CSS = [
        `:host{position:fixed;left:50%;transform:translateX(-50%);bottom:var(--nb);z-index:2147483642;font-family:var(--nf)}`,
        `.wrapper{transition:0.8s var(--sp)}`,
        `.wrapper.mini-mode .toolbar{opacity:0;transform:translateY(50px) scale(0.92);pointer-events:none;transition:opacity 0.5s var(--sp),transform 0.6s var(--sp)}`,
        `.wrapper.mini-mode.toolbar-visible .toolbar{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;transition-delay:0.1s}`,
        `.wrapper.mini-mode .toolbar{will-change:opacity,transform}`,
        `.toolbar{display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--nbt);backdrop-filter:var(--ng);border:1px solid var(--nbd);border-radius:var(--nr);box-shadow:var(--sd);transition:border-color 0.3s var(--sp),box-shadow 0.3s var(--sp),background 0.4s var(--sp)}`,
        `.toolbar.focused{background:var(--nbp);border-color:var(--na);box-shadow:var(--sd),0 0 0 1px var(--na),0 0 18px var(--nag)}`,
        `.engine-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 8px;font-size:var(--nfs);line-height:1.2;color:var(--ntm);cursor:pointer;background:var(--nib);border-radius:var(--ni);transition:opacity 0.4s var(--sp),box-shadow 0.3s var(--sp),border-color 0.3s var(--sp),background 0.3s var(--sp),transform 0.3s var(--sp),max-width 0.35s var(--sp),padding 0.3s var(--sp);white-space:nowrap;font-weight:700;border:1px solid var(--nbd);box-sizing:border-box;font-family:var(--nf);-webkit-font-smoothing:antialiased;opacity:0.5;max-width:36px;overflow:hidden}`,
        `.engine-btn .btn-icon{flex-shrink:0;display:flex;align-items:center;width:16px;height:16px}`,
        `.engine-btn .btn-label{display:inline;opacity:0;white-space:nowrap;transition:opacity 0.25s var(--sp)}`,
        `.toolbar:hover .engine-btn:not(.active),.toolbar.pinned .engine-btn:not(.active){opacity:1}`,
        `.engine-btn:hover{border-color:var(--na);background:var(--nag);transform:translateY(-3px);box-shadow:0 8px 20px var(--nag),0 0 12px var(--nag);text-shadow:0 0 12px var(--na),0 0 25px var(--na);max-width:160px;padding-right:8px}`,
        `.engine-btn:hover .btn-label{opacity:1;transition-delay:0.1s}`,
        `.engine-btn.active{border-color:var(--na);box-shadow:0 0 8px var(--nag),0 0 16px var(--nag);opacity:1 !important;max-width:160px;padding-right:8px}`,
        `.engine-btn.active .btn-label{opacity:1}`,
        `.engine-btn.active:hover{background:var(--nag);transform:translateY(-3px)}`,
        `.input-container{position:relative;display:flex;align-items:center;transition:width 0.45s var(--sp),background 0.3s var(--sp),box-shadow 0.3s var(--sp),border-color 0.3s var(--sp);width:34px;border-radius:var(--ni);border:1px solid transparent;box-sizing:border-box}`,
        `.input-container.expanded{width:236px;background:var(--nib);border-color:transparent;box-shadow:none;border-radius:var(--ni)}`,
        `.input-container.expanded .search-btn{background:var(--nbd);border-color:transparent;box-shadow:none;color:var(--na);opacity:1}`,
        `.input-container.expanded .search-btn:hover{background:var(--nag);border-color:transparent;border-right-color:var(--nbd)}`,
        `.search-btn{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;padding:6px 8px;cursor:pointer;color:var(--ntm);background:var(--nib);border:1px solid var(--nbd);border-radius:var(--ni);transition:0.3s var(--sp);opacity:0.5;box-sizing:border-box}`,
        `.search-btn:hover{opacity:1;border-color:var(--na);background:var(--nag);color:var(--na);box-shadow:0 0 8px var(--nag)}`,
        `.search-input{-webkit-appearance:none;appearance:none;border:none;background:transparent;padding:0;outline:none;width:0;min-width:0;font-size:var(--nfs);line-height:1.2;color:var(--ntm);border-radius:0;transition:width 0.45s var(--sp),padding 0.45s var(--sp),opacity 0.3s var(--sp);box-sizing:border-box;font-family:var(--nf);opacity:0}`,
        `.input-container.expanded .search-input{width:200px;padding:6px 10px 6px 6px;opacity:1}`,
        `.search-input::placeholder{color:var(--ntd);opacity:0.55}`,
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
        `.settings-btn{width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ntm);transition:0.5s var(--sp);border-radius:50%;opacity:0.5}`,
        `.settings-btn:hover{opacity:1;background:var(--nag);color:var(--na);transform:rotate(90deg);box-shadow:0 0 15px var(--nag),0 0 30px var(--nag)}`,
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
        _requestToken: 0,      // 取消过期请求
        _focusedIndex: -1,
        _navItems: [],         // 当前可导航的词条列表

        // ── 缓存 ──────────────────────────────────────────────────────────────

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

        /**
         * 清理过期缓存项（每 30 秒调用一次）
         * 防止大量过期项堆积导致的内存泄漏
         */
        _cleanupCache() {
            const now = Date.now();
            for (const [key, item] of this._cache) {
                if (now - item.ts > this._CACHE_TTL) this._cache.delete(key);
            }
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

            const google = await trySource('google', this._fetchGoogle.bind(this));
            if (google.length > 0) return google;
            const baidu = await trySource('baidu', this._fetchBaidu.bind(this));
            if (baidu.length > 0) return baidu;
            return trySource('duckduckgo', this._fetchDuckDuckGo.bind(this));
        },

        // ── 公开接口：获取建议并渲染 ─────────────────────────────────────────

        async fetch(query, box, mask, engineUrl) {
            this._cleanupCache();

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
                lbl.textContent = label;
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
                    item.className = 'suggest-item';
                    item.style.animationDelay = delay + 'ms';
                    item.textContent = term;
                    item.onclick = e => { e.stopPropagation(); performSearch(engineUrl, term); };
                    box.appendChild(item);
                    this._navItems.push({ el: item, term });
                    delay += STEP;
                });
            }

            mask.classList.add('show');
            box.classList.add('show');
        },

        // ── 键盘导航（↑↓ 选择，Enter 跳转，Escape 关闭）────────────────────

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
                performSearch(engineUrl, term);
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

    function init() {
        if (window.ffaOmnibarInitialized) return;
        window.ffaOmnibarInitialized = true;
        if (document.querySelector('.neo-mask') || document.querySelector('.neo-panel')) {
            console.warn('[FFA Omnibar] 检测到残留的工具栏元素，跳过初始化');
            return;
        }

        SettingsManager.load();
        StyleEngine.init();
        SuggestModule.initAccessibility();

        const mask  = document.createElement('div');
        const panel = document.createElement('div');
        mask.className  = 'neo-mask';
        panel.className = 'neo-panel';
        document.body.append(mask, panel);

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

        suggestBox.addEventListener('mousedown', (e) => {
            const isItem = e.target.closest('.suggest-item, .history-item, .suggest-divider');
            if (!isItem) {
                e.preventDefault(); // 阻止 input blur，由此处统一处理关闭逻辑
                mask.classList.remove('show');
                panel.classList.remove('show');
                suggestBox.classList.remove('show');
                suggestBox.innerHTML = '';
                SuggestModule.clearNav();
                wrapper.classList.remove('active', 'pinned');
                toolbar.classList.remove('focused', 'pinned');
                updateMiniMode();
            }
        });

        EventBus.on('settings:changed', () => {
            StyleEngine.update();
            shadowStyle.textContent = buildCSSVariables(SettingsManager.current) + TOOLBAR_CSS;
        });
        EventBus.on('settings:engines:changed', () => {
            renderToolbar();
        });

        function renderToolbar() {
            const s = SettingsManager.current;
            toolbar.innerHTML = '';

            let miniIcon = document.getElementById('ffa-mini-icon');
            let miniHitArea = document.getElementById('ffa-mini-hitarea');
            if (!miniIcon) {
                miniIcon = document.createElement('div');
                miniIcon.id = 'ffa-mini-icon';
                miniIcon.className = 'ffa-mini-icon';
                miniIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1.253c1.044 0 1.956.569 2.44 1.412l4.589 7.932l4.45 7.691c.047.074.21.359.27.494a2.808 2.808 0 0 1-3.406 3.836l-7.901-2.606a1.4 1.4 0 0 0-.442-.07a1.4 1.4 0 0 0-.442.07l-7.9 2.606l-.162.046a2.8 2.8 0 0 1-.684.083a2.81 2.81 0 0 1-2.644-3.763c.03-.091.074-.176.111-.264c.072-.15.161-.288.242-.432l4.449-7.691l4.588-7.932A2.81 2.81 0 0 1 12 1.253"/></svg>`;
                document.body.append(miniIcon);

                miniHitArea = document.createElement('div');
                miniHitArea.id = 'ffa-mini-hitarea';
                miniHitArea.className = 'ffa-mini-hitarea';
                document.body.append(miniHitArea);

                miniHitArea.addEventListener('mouseenter', () => {
                    wrapper.classList.add('toolbar-visible');
                    miniIcon.classList.add('hidden');
                    miniIcon.classList.remove('visible', 'hovered');
                });

                const inRect = (el, x, y) => { const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
                const anyVisible = () => panel.classList.contains('show') || suggestBox.classList.contains('show');
                let _miniMoveTimer = null;
                document.addEventListener('mousemove', (e) => {
                    if (!wrapper.classList.contains('toolbar-visible') || anyVisible()) return;
                    if (inRect(miniHitArea, e.clientX, e.clientY) || inRect(host, e.clientX, e.clientY)) {
                        clearTimeout(_miniMoveTimer);
                    } else {
                        clearTimeout(_miniMoveTimer);
                        _miniMoveTimer = setTimeout(() => {
                            if (!wrapper.classList.contains('toolbar-visible') || anyVisible()) return;
                            wrapper.classList.remove('toolbar-visible');
                            miniIcon.classList.remove('hidden', 'hovered');
                            miniIcon.classList.add('visible');
                        }, 80);
                    }
                });
            }

            const settingsBtn = document.createElement('div');
            settingsBtn.className = 'settings-btn';
            settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.3 7.3 0 0 0-1.62-.94l-.36-2.54A.484.484 0 0 0 14 3h-4c-.24 0-.43.17-.47.41l-.36 2.54a7.4 7.4 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.65 9.47a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54a7.4 7.4 0 0 0 1.62-.94l2.39.96a.48.48 0 0 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`;
            settingsBtn.onclick = () => {
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

            const activeEngineUrl = matchCurrentPageToEngine()?.url ?? null;

            enabled.forEach(eng => {
                const btn = document.createElement('div');
                btn.className = 'engine-btn';
                btn.dataset.engineUrl = eng.url;

                    if (activeEngineUrl === eng.url) {
                    btn.classList.add('active');
                }

                    const iconSpan = document.createElement('span');
                iconSpan.className = 'btn-icon';
                iconSpan.appendChild(renderIconElement(eng.icon, 16));

                const labelSpan = document.createElement('span');
                labelSpan.className = 'btn-label';
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
                    toolbar.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    suggestBox.classList.remove('show');
                    suggestBox.innerHTML = '';
                    SuggestModule.clearNav();
                    input.focus();
                    if (engineUrl) fetchSuggestions('', suggestBox, mask, engineUrl);
                };

                toolbar.append(btn);
            });

            const inputContainer = document.createElement('div');
            inputContainer.className = 'input-container';

            // 搜索图标按钮（currentColor 跟随主题强调色）
            const searchBtn = document.createElement('div');
            searchBtn.className = 'search-btn';
            searchBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14"/></svg>`;

            const input = document.createElement('input');
            input.className = 'search-input';
            input.value = currentQuery;
            input.setAttribute('aria-label', 'Search');

            const getEngineUrl = () => {
                const btn = toolbar.querySelector('.engine-btn.active');
                return btn ? btn.dataset.engineUrl : enabled[0]?.url;
            };

            // 统一的收起函数，供所有关闭路径调用
            const collapseInput = () => {
                if (input.value.trim()) return;
                inputContainer.classList.remove('expanded');
                toolbar.classList.remove('focused');
                wrapper.classList.remove('pinned');
                toolbar.classList.remove('pinned');
            };

            const expand = () => {
                inputContainer.classList.add('expanded');
                wrapper.classList.add('active', 'pinned');
                toolbar.classList.add('focused', 'pinned');
                mask.classList.add('show');
                suggestBox.classList.add('show');
            };

            // 页面有预填内容则默认展开
            if (currentQuery) inputContainer.classList.add('expanded');

            searchBtn.onclick = () => {
                if (!inputContainer.classList.contains('expanded')) {
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
            // onblur 用 setTimeout 让 mask.onclick 先执行完再判断状态
            input.onblur = () => {
                setTimeout(() => {
                    if (!suggestBox.classList.contains('show') && !panel.classList.contains('show')) {
                        collapseInput();
                    }
                }, 150);
            };
            input.oninput = () => {
                mask.classList.add('show');
                suggestBox.classList.add('show');
                const url = getEngineUrl();
                if (url) fetchSuggestions(input.value, suggestBox, mask, url);
            };
            input.onkeydown = (e) => {
                const url = getEngineUrl();
                if (url && SuggestModule.handleKeyNav(e, suggestBox, mask, url)) return;
                if (e.key === 'Enter' && input.value.trim()) performSearch(url, input.value);
                if (e.key === 'Escape') { input.blur(); }
            };

            inputContainer.append(searchBtn, input);
            toolbar.append(inputContainer);

            if (!activeEngineUrl)
                toolbar.querySelector('.engine-btn')?.classList.add('active');

            updateMiniMode();
        }

        let editingEngine = null;

        function renderPanel() {
            const s = SettingsManager.current;

            const themeButtons = Object.keys(THEMES).map(key => {
                const active = s.b.toUpperCase() === THEMES[key].b.toUpperCase();
                return `<button class="neo-theme-btn${active ? ' active' : ''}" data-action="theme" data-key="${key}">${SecurityUtils.escapeHtml(THEMES[key].n[s.lang] ?? THEMES[key].n.en)}</button>`;
            }).join('');

            const engineRows = s.en.map((eng, i) => {
                const _iconEl = renderIconElement(eng.icon, 18);
                const iconHtml = _iconEl.outerHTML;
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
                        <div style="display:flex;gap:20px">
                            <div style="flex:1">
                                <div class="neo-label">${t('labelOffset')} <b>${s.bt}px</b></div>
                                <input type="range" id="s-bt" min="0" max="300" value="${s.bt}">
                            </div>
                            <div style="flex:1">
                                <div class="neo-label">${t('labelFontSize')} <b>${s.fs}px</b></div>
                                <input type="range" id="s-fs" min="10" max="24" value="${s.fs}">
                            </div>
                        </div>
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
                        <div style="display:flex;gap:20px;margin-top:20px">
                            <div style="flex:1">
                                <div class="neo-label">${t('labelToolbarBlur')} <b>${s.tb}px</b></div>
                                <input type="range" id="s-tb" min="0" max="80" value="${s.tb}">
                            </div>
                            <div style="flex:1">
                                <div class="neo-label">${t('labelPanelBlur')} <b>${s.pb}px</b></div>
                                <input type="range" id="s-pb" min="0" max="80" value="${s.pb}">
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
                        <div class="neo-label">
                            <span>${t('labelMiniMode')}</span>
                            <div class="neo-switch ${s.mm?'on':''}" data-action="toggle-mm"></div>
                        </div>
                        <div class="neo-field-hint">${t('hintMiniMode')}</div>
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
                        <button data-action="add-engine" class="neo-btn-ghost"
                            style="width:100%;margin-top:15px">
                            ${t('btnAddEngine')}
                        </button>
                    </div>

                    <div class="neo-card">
                        <span class="neo-card-title">${t('cardData')}</span>
                        <div style="display:flex;gap:10px">
                            <button data-action="export" class="neo-btn-ghost" style="flex:1">
                                ${t('btnExport')}
                            </button>
                            <label style="flex:1;display:block">
                                <span class="neo-btn-ghost" style="display:block;text-align:center">
                                    ${t('btnImport')}
                                </span>
                                <input type="file" id="s-import" accept=".json" style="display:none">
                            </label>
                        </div>
                    </div>

                </div>
                <div class="neo-footer">
                    <button data-action="apply" class="neo-btn-main" style="flex:2">${t('btnApply')}</button>
                    <button data-action="reset"  class="neo-btn-danger" style="flex:1">${t('btnReset')}</button>
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
                            <span class="neo-field-ex" data-field-copy="${escAttr(t('hintIconEx1'))}"><span class="ex-icon">⎘</span>${t('hintIconEx1')}</span>
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
                        <button data-action="cancel-engine"  class="neo-btn-ghost" style="flex:1">${t('btnCancel')}</button>
                    </div>
                </div>`;

            bindPanelInputs();
        }

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

                case 'toggle-mm': {
                    s.mm = !s.mm;
                    SettingsManager.save();
                    applyStyles();
                    updateMiniMode();
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
            bindRange('s-tb', 'tb', 'px');
            bindRange('s-pb', 'pb', 'px');
            bindRange('s-r',  'r');
            bindRange('s-ir', 'ir');

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

            panel.querySelector('#s-font').oninput = e => {
                s.font = e.target.value;
                SettingsManager.save();
                applyStyles();
            };

            const iconInput = panel.querySelector('#e-icon');
            if (iconInput) {
                iconInput.oninput = () => {
                    panel.querySelector('#e-icon-error')?.classList.remove('show');
                    updateIconPreview(iconInput.value.trim(), panel.querySelector('#e-icon-preview'));
                };
            }

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
                    importInput.value = '';
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

        const applyStyles = debounce(() => {
            StyleEngine.update();
            shadowStyle.textContent = buildCSSVariables(SettingsManager.current) + TOOLBAR_CSS;
            renderToolbar();
        }, 16);

        function updateMiniMode() {
            const s = SettingsManager.current;
            const miniIcon = document.getElementById('ffa-mini-icon');
            const miniHitArea = document.getElementById('ffa-mini-hitarea');
            if (!miniIcon && s.mm) { requestAnimationFrame(updateMiniMode); return; }

            const anyVisible = panel.classList.contains('show') || suggestBox.classList.contains('show');
            if (!s.mm) {
                wrapper.classList.remove('mini-mode', 'toolbar-visible');
                miniIcon?.classList.remove('visible', 'hidden', 'hovered');
                miniHitArea?.classList.remove('active');
            } else if (anyVisible) {
                wrapper.classList.add('mini-mode', 'toolbar-visible');
                miniIcon?.classList.remove('visible', 'hidden', 'hovered');
                miniHitArea?.classList.remove('active');
            } else {
                wrapper.classList.add('mini-mode');
                wrapper.classList.remove('toolbar-visible');
                miniIcon?.classList.add('visible');
                miniIcon?.classList.remove('hidden', 'hovered');
                miniHitArea?.classList.add('active');
            }
        }

        // 监听设置变化，更新迷你模式
        EventBus.on('settings:changed', updateMiniMode);

        function observePanelChanges() {
            const obs = new MutationObserver(updateMiniMode);
            obs.observe(panel, { attributes: true, attributeFilter: ['class'] });
            obs.observe(suggestBox, { attributes: true, attributeFilter: ['class'] });
            mask.onclick = () => {
                mask.classList.remove('show');
                panel.classList.remove('show');
                suggestBox.classList.remove('show');
                suggestBox.innerHTML = '';
                SuggestModule.clearNav();
                panel.querySelector('#n-sub')?.classList.remove('show');
                wrapper.classList.remove('active', 'pinned');
                toolbar.classList.remove('focused', 'pinned');
                // 收起输入框（无内容时）
                const ic = toolbar.querySelector('.input-container');
                const inp = toolbar.querySelector('.search-input');
                if (ic && !inp?.value?.trim()) ic.classList.remove('expanded');
                updateMiniMode();
            };
        }

        applyStyles();
        updateMiniMode();
        observePanelChanges(); // 开始监听面板变化
        renderPanel();
    }

    init();

})();