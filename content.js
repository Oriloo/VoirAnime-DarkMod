(() => {
    const CUSTOM_ATTR = 'data-custom-style';
    const CUSTOM_SELECTOR = `link[rel="stylesheet"][${CUSTOM_ATTR}]`;
    const STYLE_URL = chrome.runtime.getURL('styles/all.css');

    function replaceStyles() {
        try {
            document
                .querySelectorAll(`link[rel="stylesheet"]:not([${CUSTOM_ATTR}]), style:not([${CUSTOM_ATTR}])`)
                .forEach(el => {
                    if (el.tagName.toLowerCase() === 'link') {
                        el.disabled = true;
                    } else {
                        el.remove();
                    }
                });

            let custom = document.querySelector(CUSTOM_SELECTOR);
            if (!custom) {
                custom = document.createElement('link');
                custom.rel = 'stylesheet';
                custom.href = STYLE_URL;
                custom.setAttribute(CUSTOM_ATTR, 'true');
                document.head.appendChild(custom);
            }
        } catch (err) {
            console.error('Erreur dans replaceStyles():', err);
        }
    }

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType === 1 && (
                    node.matches('link[rel="stylesheet"]:not([data-custom-style])') ||
                    node.matches('style:not([data-custom-style])')
                )) {
                    replaceStyles();
                    return;
                }
            }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', replaceStyles);
    } else {
        replaceStyles();
    }

    observer.observe(document.head || document.documentElement, {
        childList: true,
        subtree: true
    });
})();
