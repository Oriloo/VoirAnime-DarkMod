(() => {
    const CUSTOM_ATTR = 'data-custom-style';
    // Récupère document.head dynamiquement car il peut être null au document_start.
    // Fallback sur documentElement uniquement le temps que <head> soit parsé.
    const getHead = () => document.head || document.documentElement;

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
            if (!getHead().querySelector(`link[href="${href}"]`)) {
                getHead().appendChild(createLink(href));
            }
        });
    };

    const ORIGINAL_MEDIA_ATTR = 'data-original-media';

    const disableSheetEl = (el) => {
        if (!el.hasAttribute(ORIGINAL_MEDIA_ATTR)) {
            el.setAttribute(ORIGINAL_MEDIA_ATTR, el.getAttribute('media') || 'all');
        }
        if (el.tagName === 'LINK') el.disabled = true;
        el.media = 'not all';
    };

    // Pour ré-activer un sheet (link ou style), on le clone et on le remplace.
    // Raison : Chrome a un bug où l'état "disabled" peut rester désynchronisé
    // entre l'élément DOM et la CSSStyleSheet interne. Cloner force un état
    // propre, garantissant la ré-application des styles.
    const enableSheetEl = (el) => {
        const originalMedia = el.getAttribute(ORIGINAL_MEDIA_ATTR) || 'all';
        const clone = el.cloneNode(true);
        if (clone.tagName === 'LINK') clone.disabled = false;
        clone.media = originalMedia;
        clone.removeAttribute(ORIGINAL_MEDIA_ATTR);
        el.replaceWith(clone);
    };

    const observerV2 = new MutationObserver(records => {
        records.forEach(rec => rec.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            if (n.matches(`link[rel=\"stylesheet\"]:not([${CUSTOM_ATTR}])`)) disableSheetEl(n);
            else if (n.matches(`style:not([${CUSTOM_ATTR}])`)) disableSheetEl(n);
        }));
    });

    const reenableDisabledOriginals = () => {
        document.querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
            if (!el.hasAttribute(CUSTOM_ATTR) && (el.disabled || el.media === 'not all' || el.hasAttribute(ORIGINAL_MEDIA_ATTR))) {
                enableSheetEl(el);
            }
        });
    };

    // Attache l'observer SYNCHRONOUSLY au document_start (avant tout async).
    // Comme ça les <link>/<style> natifs ajoutés par le parser HTML sont
    // désactivés à la volée et n'ont pas le temps de s'appliquer.
    // On part du principe que v2 est actif (défaut). Si la config dit v1 ou
    // disabled, on détache l'observer plus tard et on réactive les liens.
    injectV2Main();
    getHead().querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
        if (!el.hasAttribute(CUSTOM_ATTR)) disableSheetEl(el);
    });
    // Observer documentElement (root) avec subtree: true pour couvrir
    // <head> et tout son contenu, même créés après le doc_start.
    observerV2.observe(document.documentElement, { childList: true, subtree: true });

    const applyV2 = () => {
        getHead().querySelectorAll(`link[rel=\"stylesheet\"]:not([${CUSTOM_ATTR}]), style:not([${CUSTOM_ATTR}])`)
            .forEach(disableSheetEl);

        if (URLS.listPattern.test(location.href) && !getHead().querySelector(`link[href="${URLS.v2.list}"]`)) {
            getHead().appendChild(createLink(URLS.v2.list));
        }

        const eh = getHead().querySelector(`link[href="${URLS.v2.hide}"]`);
        if (eh) eh.remove();
        if (config.search === 'cacher') getHead().appendChild(createLink(URLS.v2.hide));

        if (config.genre === 'show' && !getHead().querySelector(`link[href="${URLS.v2.genre}"]`)) {
            getHead().appendChild(createLink(URLS.v2.genre));
        }

        document.documentElement.classList.toggle('theme-light', config.theme === 'light');
    };

    const applyV1 = () => {
        if (!getHead().querySelector(`link[href="${URLS.v1}"]`)) {
            getHead().appendChild(createLink(URLS.v1));
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
