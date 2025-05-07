(() => {
    const CUSTOM_ATTR   = 'data-custom-style';
    const STYLE_ALL     = chrome.runtime.getURL('styles/all.css');
    const STYLE_LISTE   = chrome.runtime.getURL('styles/liste.css');
    const PATH_LISTE_RX = /^https?:\/\/[^/]+\/liste-danimes\/.*$/;

    function replaceStyles() {
        try {
            // désactive tous les styles natifs/non-marqués
            document
                .querySelectorAll(`link[rel="stylesheet"]:not([${CUSTOM_ATTR}]), style:not([${CUSTOM_ATTR}])`)
                .forEach(el => el.tagName.toLowerCase() === 'link'
                    ? el.disabled = true
                    : el.remove()
                );

            // insère all.css si pas déjà présent
            if (!document.querySelector(`link[rel="stylesheet"][href="${STYLE_ALL}"]`)) {
                const linkAll = document.createElement('link');
                linkAll.rel = 'stylesheet';
                linkAll.href = STYLE_ALL;
                linkAll.setAttribute(CUSTOM_ATTR, 'true');
                document.head.appendChild(linkAll);
            }

            // Si on est sur /liste-danimes/, insère liste.css
            if (PATH_LISTE_RX.test(location.href)
                && !document.querySelector(`link[rel="stylesheet"][href="${STYLE_LISTE}"]`)
            ) {
                const linkListe = document.createElement('link');
                linkListe.rel = 'stylesheet';
                linkListe.href = STYLE_LISTE;
                linkListe.setAttribute(CUSTOM_ATTR, 'true');
                document.head.appendChild(linkListe);
            }
        } catch (err) {
            console.error('Erreur dans replaceStyles():', err);
        }
    }

    const observer = new MutationObserver(muts => {
        for (const m of muts) {
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
