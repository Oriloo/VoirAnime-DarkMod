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

    // Stratégie hybride suggérée par @ze-pharaon237 (#34) + complétée :
    //  - <link>  : on bascule rel="stylesheet" → rel="alternate stylesheet"
    //              (le browser réévalue, le sheet est parsé mais non appliqué).
    //  - <style> : on bascule media → "not all" (le sheet n'est jamais appliqué).
    // À la restauration, on remet la valeur d'origine. Plus de clone+replace
    // nécessaire : changer rel/media force déjà la réévaluation côté browser.
    const ORIGINAL_REL_ATTR = 'data-original-rel';
    const ORIGINAL_MEDIA_ATTR = 'data-original-media';

    const disableSheetEl = (el) => {
        if (el.tagName === 'LINK') {
            if (!el.hasAttribute(ORIGINAL_REL_ATTR)) {
                el.setAttribute(ORIGINAL_REL_ATTR, el.getAttribute('rel') || 'stylesheet');
            }
            el.rel = 'alternate stylesheet';
        } else if (el.tagName === 'STYLE') {
            if (!el.hasAttribute(ORIGINAL_MEDIA_ATTR)) {
                el.setAttribute(ORIGINAL_MEDIA_ATTR, el.getAttribute('media') || 'all');
            }
            el.media = 'not all';
        }
    };

    const enableSheetEl = (el) => {
        if (el.tagName === 'LINK' && el.hasAttribute(ORIGINAL_REL_ATTR)) {
            el.rel = el.getAttribute(ORIGINAL_REL_ATTR);
            el.removeAttribute(ORIGINAL_REL_ATTR);
        } else if (el.tagName === 'STYLE' && el.hasAttribute(ORIGINAL_MEDIA_ATTR)) {
            el.media = el.getAttribute(ORIGINAL_MEDIA_ATTR);
            el.removeAttribute(ORIGINAL_MEDIA_ATTR);
        }
    };

    const observerV2 = new MutationObserver(records => {
        records.forEach(rec => rec.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            if (n.matches(`link[rel=\"stylesheet\"]:not([${CUSTOM_ATTR}])`)) disableSheetEl(n);
            else if (n.matches(`style:not([${CUSTOM_ATTR}])`)) disableSheetEl(n);
        }));
    });

    const reenableDisabledOriginals = () => {
        document.querySelectorAll(`[${ORIGINAL_REL_ATTR}], [${ORIGINAL_MEDIA_ATTR}]`).forEach(enableSheetEl);
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
