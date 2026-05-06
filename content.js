(() => {
    const CUSTOM_ATTR = 'data-custom-style';
    const HEAD = document.head || document.documentElement;

    const URLS = {
        v2: {
            main: [
                'variables', 'general', 'main', 'header', 'footer',
                'content', 'home', 'anime', 'episode', 'pagination',
                'error404', 'recherche-av', 'characters'
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

    // ===== AFFICHAGE DES PERSONNAGES (JIKAN API) =====

    const ANIME_PAGE_PATTERN = /^https?:\/\/[^/]+\/anime\/([^/?#]+)\/?$/;
    const CHARACTERS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
    const JIKAN_BASE = 'https://api.jikan.moe/v4';

    const getAnimeFieldByLabel = (label) => {
        const items = document.querySelectorAll('.profile-manga .post-content_item');
        for (const item of items) {
            const heading = item.querySelector('.summary-heading h5');
            if (heading && heading.textContent.trim().toLowerCase() === label.toLowerCase()) {
                const content = item.querySelector('.summary-content');
                if (content) return content.textContent.trim();
            }
        }
        return null;
    };

    const getAnimeQueries = () => {
        const native = getAnimeFieldByLabel('Native');
        const romaji = getAnimeFieldByLabel('Romaji');
        const title = document.querySelector('.profile-manga .post-title h1');
        const fallback = title ? title.textContent.trim().replace(/\s*\(VF\)\s*$/i, '') : null;
        return [native, romaji, fallback].filter(Boolean);
    };

    const cleanQuery = (query) => {
        return query.replace(/\s*\(VF\)\s*$/i, '').replace(/\s*\(VOSTFR\)\s*$/i, '').trim();
    };

    const renderCharactersSection = () => {
        const target = document.querySelector('.wp-manga-template-default .main-col-inner .description-summary');
        if (!target || document.querySelector('.characters-section')) return null;

        const section = document.createElement('div');
        section.className = 'characters-section';
        section.innerHTML = `
            <div class="characters-heading"><h2>Personnages</h2></div>
            <div class="characters-loading">Chargement des personnages...</div>
        `;
        target.insertAdjacentElement('afterend', section);
        return section;
    };

    const escapeHtml = (str) => {
        return String(str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    };

    const renderCharacters = (section, characters) => {
        if (!characters || characters.length === 0) {
            section.querySelector('.characters-loading').replaceWith(
                Object.assign(document.createElement('div'), {
                    className: 'characters-empty',
                    textContent: 'Aucun personnage trouvé.'
                })
            );
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'characters-grid';

        characters.forEach(c => {
            const card = document.createElement('a');
            card.className = 'character-card';
            if (c.voiceActor) card.classList.add('has-va');
            card.href = c.url || '#';
            card.target = '_blank';
            card.rel = 'noopener noreferrer';

            const vaFaceHtml = c.voiceActor ? `
                <div class="card-face card-face-va">
                    <img class="character-image" src="${escapeHtml(c.voiceActor.image)}" alt="${escapeHtml(c.voiceActor.name)}" loading="lazy">
                    <div class="character-info">
                        <span class="character-name">${escapeHtml(c.voiceActor.name)}</span>
                        <span class="character-role">${escapeHtml(c.voiceActor.language)}</span>
                    </div>
                </div>
            ` : '';

            card.innerHTML = `
                <div class="card-face card-face-character">
                    <img class="character-image" src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name)}" loading="lazy">
                    <div class="character-info">
                        <span class="character-name">${escapeHtml(c.name)}</span>
                        <span class="character-role">${escapeHtml(c.role)}</span>
                    </div>
                </div>
                ${vaFaceHtml}
            `;
            grid.appendChild(card);
        });

        section.querySelector('.characters-loading').replaceWith(grid);
    };

    const extractFullImage = (img) => {
        if (!img) return '';
        const raw = img.getAttribute('data-srcset')
            || img.getAttribute('srcset')
            || img.getAttribute('data-src')
            || img.getAttribute('src')
            || '';
        const firstUrl = raw.split(',')[0].trim().split(' ')[0];
        return firstUrl
            .replace(/\/r\/\d+x\d+\//, '/')
            .split('?')[0];
    };

    const parseCharactersFromMalHtml = (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const wrap = doc.querySelector('.detail-characters-list');
        if (!wrap) return [];

        const tables = wrap.querySelectorAll('table');
        const characters = [];

        tables.forEach(table => {
            const cells = table.querySelectorAll(':scope > tbody > tr > td');
            if (cells.length < 2) return;

            const charImgEl = cells[0].querySelector('img');
            const charLinkEl = cells[1].querySelector('h3.h3_characters_voice_actors a');
            const charRoleEl = cells[1].querySelector('.spaceit_pad small');

            if (!charLinkEl) return;

            const character = {
                name: charLinkEl.textContent.trim(),
                url: charLinkEl.href,
                image: extractFullImage(charImgEl),
                role: charRoleEl ? charRoleEl.textContent.trim() : '',
                voiceActor: null
            };

            if (cells[2]) {
                const vaLinkEl = cells[2].querySelector('a');
                const vaImgEl = cells[2].querySelector('img');
                const vaLangEl = cells[2].querySelector('small');
                if (vaLinkEl) {
                    character.voiceActor = {
                        name: vaLinkEl.textContent.trim(),
                        url: vaLinkEl.href,
                        image: extractFullImage(vaImgEl),
                        language: vaLangEl ? vaLangEl.textContent.trim() : ''
                    };
                }
            }

            characters.push(character);
        });

        return characters;
    };

    const fetchMalAnimePageViaBackground = (malId) => new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'fetchMalAnimePage', malId }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (!response || !response.ok) {
                reject(new Error(response?.error || 'unknown background error'));
                return;
            }
            resolve(response.html);
        });
    });

    const searchMalIdViaJikan = async (queries) => {
        for (const query of queries) {
            const res = await fetch(`${JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&limit=1`);
            if (!res.ok) continue;
            const data = await res.json();
            const malId = data.data?.[0]?.mal_id;
            if (malId) {
                console.log(`[VoirAnime Characters] mal_id ${malId} trouvé via "${query}"`);
                return malId;
            }
        }
        throw new Error('No MAL ID found for any query');
    };

    const fetchCharactersFromMal = async (queries) => {
        const malId = await searchMalIdViaJikan(queries);
        const html = await fetchMalAnimePageViaBackground(malId);
        return { malId, characters: parseCharactersFromMalHtml(html) };
    };

    const runAnimeCharacters = () => {
        if (!ANIME_PAGE_PATTERN.test(location.href)) return;

        const slug = location.href.match(ANIME_PAGE_PATTERN)[1];
        const cacheKey = `characters_${slug}`;

        const section = renderCharactersSection();
        if (!section) return;

        chrome.storage.local.get(cacheKey, (data) => {
            const cached = data[cacheKey];
            if (cached && Date.now() - cached.timestamp < CHARACTERS_CACHE_TTL) {
                console.log(`[VoirAnime Characters] Résultat en cache pour ${slug}`);
                renderCharacters(section, cached.characters);
                return;
            }

            const queries = getAnimeQueries().map(cleanQuery).filter(Boolean);
            if (queries.length === 0) {
                console.log("[VoirAnime Characters] Aucun titre exploitable, abandon");
                section.remove();
                return;
            }

            console.log(`[VoirAnime Characters] Recherche Jikan, queries (priorité):`, queries);

            fetchCharactersFromMal(queries)
                .then(({ malId, characters }) => {
                    console.log(`[VoirAnime Characters] ${characters.length} personnage(s) récupéré(s) (MAL ID: ${malId})`);
                    chrome.storage.local.set({
                        [cacheKey]: { characters, malId, timestamp: Date.now() }
                    });
                    renderCharacters(section, characters);
                })
                .catch(err => {
                    console.log("[VoirAnime Characters] Erreur:", err.message);
                    section.remove();
                });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAnimeCharacters);
    } else {
        runAnimeCharacters();
    }
})();
