(() => {
    const CUSTOM_ATTR = 'data-custom-style';
    const HEAD = document.head || document.documentElement;

    const URLS = {
        v2: {
            main: [
                'variables', 'general', 'main', 'header', 'footer',
                'content', 'home', 'anime', 'episode', 'pagination',
                'error404', 'recherche-av'
            ].map(f => chrome.runtime.getURL(`versions/v200/${f}.css`)),
            list: chrome.runtime.getURL('versions/v200/liste.css'),
            hide: chrome.runtime.getURL('versions/v200/hide-search.css'),
            genre: chrome.runtime.getURL('versions/v200/header-genre.css')
        },
        v1: chrome.runtime.getURL('versions/v120/main.css'),
        listPattern: /^https?:\/\/[^/]+\/liste-danimes\/.*$/
    };

    let config = {
        enabled: true,
        version: '2',
        theme: 'dark',
        search: 'fixe',
        genre: 'hide'
    };

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

    const disableLink = (el) => {
        el.disabled = true;
        el.media = 'not all';
    };

    const enableLink = (el) => {
        el.disabled = false;
        el.media = 'all';
    };

    const observerV2 = new MutationObserver(records => {
        records.forEach(rec => rec.addedNodes.forEach(n => {
            if (n.nodeType === 1) {
                if (n.matches(`link[rel=\"stylesheet\"]:not([${CUSTOM_ATTR}])`)) disableLink(n);
                else if (n.matches('style:not([data-custom-style])')) n.remove();
            }
        }));
    });

    const reenableDisabledOriginals = () => {
        HEAD.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
            if (!el.hasAttribute(CUSTOM_ATTR) && (el.disabled || el.media === 'not all')) {
                enableLink(el);
            }
        });
    };

    // Attache l'observer SYNCHRONOUSLY au document_start (avant tout async).
    // Comme ça les <link>/<style> natifs ajoutés par le parser HTML sont
    // désactivés à la volée et n'ont pas le temps de s'appliquer.
    // On part du principe que v2 est actif (défaut). Si la config dit v1 ou
    // disabled, on détache l'observer plus tard et on réactive les liens.
    injectV2Main();
    HEAD.querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
        if (!el.hasAttribute(CUSTOM_ATTR)) {
            if (el.tagName === 'LINK') disableLink(el);
            else el.remove();
        }
    });
    observerV2.observe(HEAD, { childList: true, subtree: true });

    const applyV2 = () => {
        HEAD.querySelectorAll(`link[rel=\"stylesheet\"]:not([${CUSTOM_ATTR}]), style:not([${CUSTOM_ATTR}])`)
            .forEach(el => el.tagName === 'LINK' ? disableLink(el) : el.remove());

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

    function init() {
        chrome.storage.sync.get(config, data => {
            config = data;
            if (!config.enabled) {
                observerV2.disconnect();
                removeInjected();
                reenableDisabledOriginals();
                return;
            }

            if (config.version === '2') {
                applyV2();
            } else {
                observerV2.disconnect();
                removeInjected();
                reenableDisabledOriginals();
                applyV1();
            }
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && ['enabled', 'version', 'theme', 'search', 'genre', 'autoLecteurEnabled', 'lecteurPreferred', 'autoValiderEnabled'].some(k => k in changes)) {
                window.location.reload();
            }
        });
    }

    init();
})();
