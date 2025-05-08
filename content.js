(() => {
    const CUSTOM_ATTR   = 'data-custom-style';
    const STYLE_ALL     = chrome.runtime.getURL('styles/all.css');
    const STYLE_LISTE   = chrome.runtime.getURL('styles/liste.css');
    const PATH_LISTE_RX = /^https?:\/\/[^/]+\/liste-danimes\/.*$/;

    function replaceStyles(theme) {
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

            // Si sur /liste-danimes/, insère liste.css
            if (PATH_LISTE_RX.test(location.href)
                && !document.querySelector(`link[rel="stylesheet"][href="${STYLE_LISTE}"]`)
            ) {
                const linkListe = document.createElement('link');
                linkListe.rel = 'stylesheet';
                linkListe.href = STYLE_LISTE;
                linkListe.setAttribute(CUSTOM_ATTR, 'true');
                document.head.appendChild(linkListe);
            }

            // Appliquer le thème : ajouter ou retirer .theme-light
            document.documentElement.classList.toggle('theme-light', theme === 'light');

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
                    // Re-appliquer les styles en cas d'ajout
                    chrome.storage.sync.get({ theme: 'dark' }, data => {
                        replaceStyles(data.theme);
                    });
                    return;
                }
            }
        }
    });

    function initIfEnabled() {
        chrome.storage.sync.get({ enabled: true, theme: 'dark' }, data => {
            if (!data.enabled) {
                console.log('DarkMod désactivé.');
                return;
            }

            console.log('DarkMod activé avec thème :', data.theme);

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => replaceStyles(data.theme));
            } else {
                replaceStyles(data.theme);
            }

            observer.observe(document.head || document.documentElement, {
                childList: true,
                subtree: true
            });
        });
    }

    // Écoute des changements pour recharger
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && (changes.enabled || changes.theme)) {
            console.log('Changement détecté, rechargement de la page.');
            window.location.reload();
        }
    });

    initIfEnabled();
})();
