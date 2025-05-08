(() => {
    const CUSTOM_ATTR = 'data-custom-style';
    const HEAD = document.head || document.documentElement;

    const URLS = {
        v2: {
            main: chrome.runtime.getURL('versions/v200/_build.css'),
            list: chrome.runtime.getURL('versions/v200/liste.css'),
            hide: chrome.runtime.getURL('versions/v200/hide-search.css')
        },
        v1: chrome.runtime.getURL('versions/v120/_build.css'),
        listPattern: /^https?:\/\/[^/]+\/liste-danimes\/.*$/
    };

    let config = { enabled: true, version: '2', theme: 'dark', search: 'fixe' };
    let minimalStyle = null;

    const createLink = href => {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        l.setAttribute(CUSTOM_ATTR, 'true');
        return l;
    };

    const removeInjected = () => {
        if (minimalStyle) minimalStyle.remove();
        document.querySelectorAll(`link[rel="stylesheet"][${CUSTOM_ATTR}], style[${CUSTOM_ATTR}]`).forEach(el => el.remove());
    };

    const injectV2Main = () => {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', URLS.v2.main, false);
            xhr.send();
            if (xhr.status === 200) {
                const s = document.createElement('style');
                s.setAttribute(CUSTOM_ATTR, 'true');
                s.textContent = xhr.responseText;
                HEAD.appendChild(s);
            }
        } catch {};
    };

    const applyV2 = () => {
        HEAD.querySelectorAll(`link[rel="stylesheet"]:not([${CUSTOM_ATTR}]), style:not([${CUSTOM_ATTR}])`)
            .forEach(el => el.tagName === 'LINK' ? el.disabled = true : el.remove());

        if (!HEAD.querySelector(`style[${CUSTOM_ATTR}]`)) {
            injectV2Main();
        }

        if (!HEAD.querySelector(`link[href="${URLS.v2.main}"]`)) {
            const l = createLink(URLS.v2.main);
            HEAD.appendChild(l);
        }

        if (URLS.listPattern.test(location.href) && !HEAD.querySelector(`link[href="${URLS.v2.list}"]`)) {
            HEAD.appendChild(createLink(URLS.v2.list));
        }

        const eh = HEAD.querySelector(`link[href="${URLS.v2.hide}"]`);
        if (eh) eh.remove();
        if (config.search === 'cacher') HEAD.appendChild(createLink(URLS.v2.hide));

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

    function init() {
        chrome.storage.sync.get(config, data => {
            config = data;
            if (!config.enabled) {
                removeInjected();
                return;
            }

            // minimal style only if enabled
            minimalStyle = document.createElement('style');
            minimalStyle.id = 'darkmod-minimal';
            minimalStyle.textContent = 'html,body{background:#121212!important;color:#ccc!important;}';
            HEAD.appendChild(minimalStyle);

            if (config.version === '2') {
                injectV2Main();
                applyV2();
                observerV2.observe(HEAD, { childList: true, subtree: true });
            } else {
                applyV1();
            }
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && ['enabled','version','theme','search'].some(k => k in changes)) {
                window.location.reload();
            }
        });
    }

    init();
})();
