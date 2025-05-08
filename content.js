(() => {
    const CUSTOM_ATTR    = 'data-custom-style';
    const STYLE_ALL      = chrome.runtime.getURL('versions/v200/main.css');
    const STYLE_LISTE    = chrome.runtime.getURL('versions/v200/liste.css');
    const STYLE_V120     = chrome.runtime.getURL('versions/v120/main.css');
    const PATH_LISTE_RX  = /^https?:\/\/[^/]+\/liste-danimes\/.*$/;

    function applyV2(theme) {
        document
            .querySelectorAll(`link[rel="stylesheet"]:not([${CUSTOM_ATTR}]), style:not([${CUSTOM_ATTR}])`)
            .forEach(el => el.tagName.toLowerCase() === 'link'
                ? el.disabled = true
                : el.remove()
            );

        if (!document.querySelector(`link[rel="stylesheet"][href="${STYLE_ALL}"]`)) {
            const linkAll = document.createElement('link');
            linkAll.rel = 'stylesheet';
            linkAll.href = STYLE_ALL;
            linkAll.setAttribute(CUSTOM_ATTR, 'true');
            document.head.appendChild(linkAll);
        }

        if (PATH_LISTE_RX.test(location.href)
            && !document.querySelector(`link[rel="stylesheet"][href="${STYLE_LISTE}"]`)
        ) {
            const linkListe = document.createElement('link');
            linkListe.rel = 'stylesheet';
            linkListe.href = STYLE_LISTE;
            linkListe.setAttribute(CUSTOM_ATTR, 'true');
            document.head.appendChild(linkListe);
        }

        document.documentElement.classList.toggle('theme-light', theme === 'light');
    }

    function applyV1(theme) {
        if (!document.querySelector(`link[rel="stylesheet"][href="${STYLE_V120}"]`)) {
            const linkOld = document.createElement('link');
            linkOld.rel = 'stylesheet';
            linkOld.href = STYLE_V120;
            linkOld.setAttribute(CUSTOM_ATTR, 'true');
            document.head.appendChild(linkOld);
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
                    chrome.storage.sync.get({ version: '2', theme: 'dark' }, data => {
                        if (data.version === '2') {
                            applyV2(data.theme);
                        } else {
                            applyV1(data.theme);
                        }
                    });
                    return;
                }
            }
        }
    });

    function init() {
        chrome.storage.sync.get(
            { enabled: true, theme: 'dark', version: '2' },
            data => {
                if (!data.enabled) {
                    console.log('DarkMod désactivé.');
                    return;
                }

                console.log(`DarkMod v${data.version} activé (thème: ${data.theme})`);

                const run = () => {
                    if (data.version === '2') {
                        applyV2(data.theme);
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
                    observer.observe(document.head || document.documentElement, {
                        childList: true,
                        subtree: true
                    });
                }
            }
        );
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' &&
            (changes.enabled || changes.theme || changes.version)
        ) {
            console.log('Configuration modifiée, rechargement de la page.');
            window.location.reload();
        }
    });

    init();
})();
