(() => {
    const CUSTOM_ATTR = 'data-custom-style';
    const HEAD = document.head || document.documentElement;

    const URLS = {
        v2: {
            main: [
                'variables', 'general', 'main', 'header', 'footer',
                'content', 'home', 'anime', 'episode', 'pagination',
                'error404', 'recherche-av', 'characters', 'scroll-to-watched'
            ].map(f => chrome.runtime.getURL(`versions/v200/${f}.css`)),
            list: chrome.runtime.getURL('versions/v200/liste.css'),
            hide: chrome.runtime.getURL('versions/v200/hide-search.css'),
            genre: chrome.runtime.getURL('versions/v200/header-genre.css')
        },
        v1: chrome.runtime.getURL('versions/v120/main.css'),
        listPattern: /^https?:\/\/[^/]+\/liste-danimes\/.*$/
    };

    // Defaults centralisés. Toutes les clés de config sont ici pour qu'un seul
    // appel `chrome.storage.sync.get(DEFAULTS, ...)` récupère tout, et que le
    // résultat soit broadcasté aux autres scripts (cf. dispatch plus bas).
    const DEFAULTS = {
        enabled: true,
        version: '2',
        theme: 'dark',
        search: 'fixe',
        genre: 'hide',
        autoLecteurEnabled: false,
        lecteurPreferred: 'LECTEUR myTV',
        autoValiderEnabled: false
    };

    let config = { ...DEFAULTS };

    const createLink = href => {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        l.setAttribute(CUSTOM_ATTR, 'true');
        return l;
    };

    const removeInjected = () => {
        document.querySelectorAll(`link[rel="stylesheet"][${CUSTOM_ATTR}], style[${CUSTOM_ATTR}]`).forEach(el => el.remove());
    };

    const injectV2Main = () => {
        URLS.v2.main.forEach(href => {
            if (!HEAD.querySelector(`link[href="${href}"]`)) {
                HEAD.appendChild(createLink(href));
            }
        });
    };

    injectV2Main();
    HEAD.querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
        if (!el.hasAttribute(CUSTOM_ATTR)) {
            if (el.tagName === 'LINK') el.disabled = true;
            else el.remove();
        }
    });

    const applyV2 = () => {
        HEAD.querySelectorAll(`link[rel=\"stylesheet\"]:not([${CUSTOM_ATTR}]), style:not([${CUSTOM_ATTR}])`)
            .forEach(el => el.tagName === 'LINK' ? el.disabled = true : el.remove());

        if (URLS.listPattern.test(location.href) && !HEAD.querySelector(`link[href="${URLS.v2.list}"]`)) {
            HEAD.appendChild(createLink(URLS.v2.list));
        }

        const eh = HEAD.querySelector(`link[href="${URLS.v2.hide}"]`);
        if (eh) eh.remove();
        if (config.search === 'cacher') HEAD.appendChild(createLink(URLS.v2.hide));

        if (config.genre === 'show' && !HEAD.querySelector(`link[href="${URLS.v2.genre}"]`)) {
            HEAD.appendChild(createLink(URLS.v2.genre));
        }

        document.documentElement.classList.toggle('theme-light', config.theme === 'light');
    };

    const applyV1 = () => {
        if (!HEAD.querySelector(`link[href="${URLS.v1}"]`)) {
            HEAD.appendChild(createLink(URLS.v1));
        }
        document.documentElement.classList.toggle('theme-light', config.theme === 'light');
    };

    const observerV2 = new MutationObserver(records => {
        records.forEach(rec => rec.addedNodes.forEach(n => {
            if (n.nodeType === 1) {
                if (n.matches(`link[rel=\"stylesheet\"]:not([${CUSTOM_ATTR}])`)) n.disabled = true;
                else if (n.matches('style:not([data-custom-style])')) n.remove();
            }
        }));
    });

    // Broadcast la config aux autres content scripts. Ils peuvent soit lire
    // le dataset directement (synchronously si la config est déjà broadcastée),
    // soit attendre l'event `darkmod:ready` s'ils s'initialisent avant nous.
    const broadcastConfig = () => {
        document.documentElement.dataset.darkmodConfig = JSON.stringify(config);
        document.documentElement.dispatchEvent(new Event('darkmod:ready'));
    };

    function init() {
        chrome.storage.sync.get(DEFAULTS, data => {
            config = data;
            broadcastConfig();
            if (!config.enabled) {
                removeInjected();
                return;
            }

            if (config.version === '2') {
                applyV2();
                observerV2.observe(HEAD, { childList: true, subtree: true });
            } else {
                removeInjected();
                applyV1();
            }
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && Object.keys(DEFAULTS).some(k => k in changes)) {
                window.location.reload();
            }
        });
    }

    init();
})();
