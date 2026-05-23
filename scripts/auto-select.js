(() => {
    let config = {};

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

    const waitForValiderButton = () => {
        if (!config.autoValiderEnabled) {
            console.log("[VoirAnime Auto] Auto-clic sur 'Valider' désactivé ⏸️");
            return;
        }

        console.log("[VoirAnime Auto] Observation continue du bouton 'Valider' activée 👀");

        let currentButton = null;
        let attrObserver = null;

        const handleButton = (button) => {
            if (button === currentButton) return;

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

            attrObserver = new MutationObserver(() => {
                if (!button.disabled) {
                    console.log("[VoirAnime Auto] Bouton 'Valider' activé, on clique dessus ✅");
                    button.click();
                }
            });
            attrObserver.observe(button, { attributes: true, attributeFilter: ["disabled"] });
        };

        const initialButton = document.querySelector('button.btn[type="submit"]');
        if (initialButton) {
            handleButton(initialButton);
        }

        const domObserver = new MutationObserver(() => {
            const btn = document.querySelector('button.btn[type="submit"]');
            if (btn && btn !== currentButton) {
                handleButton(btn);
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });
    };

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

    window.onDarkmodConfig((cfg) => {
        config = cfg;
        if (!config.enabled) return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runAutoSelect);
        } else {
            runAutoSelect();
        }
    });
})();
