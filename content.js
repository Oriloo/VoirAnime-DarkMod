(() => {
    const CUSTOM_ATTR = 'data-custom-style';
    const HEAD = document.head || document.documentElement;

    const URLS = {
        v2: {
            main: chrome.runtime.getURL('versions/v200/_build.css'),
            list: chrome.runtime.getURL('versions/v200/liste.css'),
            hide: chrome.runtime.getURL('versions/v200/hide-search.css'),
            genre: chrome.runtime.getURL('versions/v200/header-genre.css')
        },
        v1: chrome.runtime.getURL('versions/v120/_build.css'),
        listPattern: /^https?:\/\/[^/]+\/liste-danimes\/.*$/
    };

    let config = {
        enabled: true,
        version: '2',
        theme: 'dark',
        search: 'fixe',
        genre: 'hide',
        autoLecteurEnabled: false,
        lecteurPreferred: 'LECTEUR myTV',
        autoValiderEnabled: false
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
        } catch {}
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

    function init() {
        chrome.storage.sync.get(config, data => {
            config = data;
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

            // Attendre que le DOM soit chargé avant de lancer l'auto-sélection
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', runAutoSelect);
            } else {
                // DOM déjà chargé
                runAutoSelect();
            }
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && ['enabled', 'version', 'theme', 'search', 'genre', 'autoLecteurEnabled', 'lecteurPreferred', 'autoValiderEnabled'].some(k => k in changes)) {
                window.location.reload();
            }
        });
    }

    init();

    // Fonction pour supprimer les attributs sizes des images
    const removeImageSizes = () => {
        document.querySelectorAll('img[sizes]').forEach(img => img.removeAttribute('sizes'));
    };

    const imageSizesObserver = new MutationObserver(records => {
        records.forEach(rec => rec.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            if (n.matches('img[sizes]')) n.removeAttribute('sizes');
            n.querySelectorAll('img[sizes]').forEach(img => img.removeAttribute('sizes'));
        }));
    });

    const initImageSizes = () => {
        removeImageSizes();
        imageSizesObserver.observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initImageSizes);
    } else {
        initImageSizes();
    }

    // Fonction pour sélectionner le lecteur préféré
    const selectPreferredLecteur = (lecteurName) => {
        if (!config.autoLecteurEnabled) {
            console.log("[VoirAnime Auto] Auto-sélection du lecteur désactivée ⏸️");
            return;
        }

        console.log(`[VoirAnime Auto] Recherche du lecteur: ${lecteurName} 🔍`);

        const select = document.querySelector('select.selectpicker.host-select');
        if (!select) {
            console.log("[VoirAnime Auto] Sélecteur non trouvé ❌");
            return;
        }

        const option = Array.from(select.options).find(opt => opt.text.includes(lecteurName));

        if (option) {
            select.value = option.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            console.log(`[VoirAnime Auto] '${lecteurName}' sélectionné ✅`);
        } else {
            console.log(`[VoirAnime Auto] Option '${lecteurName}' non trouvée ❌`);
        }
    };

    // Fonction pour attendre et cliquer sur le bouton Valider (observation continue)
    const waitForValiderButton = () => {
        if (!config.autoValiderEnabled) {
            console.log("[VoirAnime Auto] Auto-clic sur 'Valider' désactivé ⏸️");
            return;
        }

        console.log("[VoirAnime Auto] Observation continue du bouton 'Valider' activée 👀");

        let currentButton = null;
        let attrObserver = null;

        // Fonction pour gérer le clic sur le bouton une fois trouvé
        const handleButton = (button) => {
            // Si c'est le même bouton déjà géré, ne rien faire
            if (button === currentButton) return;

            // Nettoyer l'ancien observer d'attribut si existant
            if (attrObserver) {
                attrObserver.disconnect();
                attrObserver = null;
            }

            currentButton = button;
            console.log("[VoirAnime Auto] Nouveau bouton 'Valider' détecté 🔍");

            if (!button.disabled) {
                console.log("[VoirAnime Auto] Bouton 'Valider' déjà actif, on clique dessus ✅");
                button.click();
                return;
            }

            // Observer les changements d'attribut disabled
            attrObserver = new MutationObserver(() => {
                if (!button.disabled) {
                    console.log("[VoirAnime Auto] Bouton 'Valider' activé, on clique dessus ✅");
                    button.click();
                }
            });
            attrObserver.observe(button, { attributes: true, attributeFilter: ["disabled"] });
        };

        // Vérifier si un bouton existe déjà
        const initialButton = document.querySelector('button.btn[type="submit"]');
        if (initialButton) {
            handleButton(initialButton);
        }

        // Observer le DOM en permanence pour détecter les nouveaux boutons
        const domObserver = new MutationObserver(() => {
            const btn = document.querySelector('button.btn[type="submit"]');
            if (btn && btn !== currentButton) {
                handleButton(btn);
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });
    };

    // Fonction principale pour l'auto-sélection
    const runAutoSelect = () => {
        console.log("[VoirAnime Auto] runAutoSelect() appelée");
        console.log("[VoirAnime Auto] URL actuelle:", window.location.href);
        console.log("[VoirAnime Auto] Config:", config);

        const selectElement = document.querySelector('select.selectpicker.host-select');
        console.log("[VoirAnime Auto] Élément select trouvé:", selectElement);

        const isEpisodePage = window.location.href.includes('voir-anime.to/') && selectElement;

        if (!isEpisodePage) {
            console.log("[VoirAnime Auto] Pas une page d'épisode, arrêt.");
            return;
        }

        console.log("[VoirAnime Auto] Page d'épisode détectée 🎬");

        setTimeout(() => {
            if (config.autoLecteurEnabled && config.lecteurPreferred) {
                selectPreferredLecteur(config.lecteurPreferred);
            }
            if (config.autoValiderEnabled) {
                waitForValiderButton();
            }
        }, 1000);
    };
})();
