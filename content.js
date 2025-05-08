(() => {
    const CUSTOM_ATTR    = 'data-custom-style';
    const STYLE_ALL      = chrome.runtime.getURL('versions/v200/main.css');
    const STYLE_LISTE    = chrome.runtime.getURL('versions/v200/liste.css');
    const STYLE_V120     = chrome.runtime.getURL('versions/v120/main.css');
    const STYLE_HIDE     = chrome.runtime.getURL('versions/v200/hide-search.css');
    const PATH_LISTE_RX  = /^https?:\/\/[^/]+\/liste-danimes\/.*$/;

    function applyV2(theme, search) {
        document
            .querySelectorAll(`link[rel="stylesheet"]:not([${CUSTOM_ATTR}]), style:not([${CUSTOM_ATTR}])`)
            .forEach(el => el.tagName.toLowerCase() === 'link'
                ? el.disabled = true
                : el.remove()
            );

        if (!document.querySelector(`link[href="${STYLE_ALL}"]`)) {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = STYLE_ALL;
            l.setAttribute(CUSTOM_ATTR, 'true');
            document.head.appendChild(l);
        }

        if (PATH_LISTE_RX.test(location.href)
            && !document.querySelector(`link[href="${STYLE_LISTE}"]`)
        ) {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = STYLE_LISTE;
            l.setAttribute(CUSTOM_ATTR, 'true');
            document.head.appendChild(l);
        }

        const existingHide = document.querySelector(`link[href="${STYLE_HIDE}"]`);
        if (existingHide) existingHide.remove();
        if (search === 'cacher') {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = STYLE_HIDE;
            l.setAttribute(CUSTOM_ATTR, 'true');
            document.head.appendChild(l);
        }

        document.documentElement.classList.toggle('theme-light', theme === 'light');
    }

    function applyV1(theme) {
        if (!document.querySelector(`link[href="${STYLE_V120}"]`)) {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = STYLE_V120;
            l.setAttribute(CUSTOM_ATTR, 'true');
            document.head.appendChild(l);
        }

        document.documentElement.classList.toggle('theme-light', theme === 'light');
    }

    const observer = new MutationObserver(muts => {
        for (const m of muts) {
            for (const node of m.addedNodes) {
                if (node.nodeType === 1 &&
                    (node.matches('link[rel="stylesheet"]:not([data-custom-style])') ||
                        node.matches('style:not([data-custom-style])'))
                ) {
                    chrome.storage.sync.get(
                        { version: '2', theme: 'dark', search: 'fixe' },
                        data => {
                            if (data.version === '2') {
                                applyV2(data.theme, data.search);
                            } else {
                                applyV1(data.theme);
                            }
                        }
                    );
                    return;
                }
            }
        }
    });

    function init() {
        chrome.storage.sync.get(
            { enabled: true, version: '2', theme: 'dark', search: 'fixe' },
            data => {
                if (!data.enabled) return console.log('DarkMod désactivé.');

                console.log(`DarkMod v${data.version} (th:${data.theme}, sc:${data.search})`);

                const run = () => {
                    if (data.version === '2') {
                        applyV2(data.theme, data.search);
                    } else {
                        applyV1(data.theme);
                    }
                };

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', run);
                } else {
                    run();
                }

                if (data.version === '2') {
                    observer.observe(
                        document.head || document.documentElement,
                        { childList: true, subtree: true }
                    );
                }
            }
        );
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' &&
            (changes.enabled || changes.theme || changes.version || changes.search)
        ) {
            console.log('Configuration modifiée, rechargement de la page.');
            window.location.reload();
        }
    });

    init();
})();
