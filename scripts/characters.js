(() => {
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
        const target = document.querySelector('.wp-manga-template-default .main-col-inner .listing-chapters_wrap');
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

    const fetchNijihubMappingViaBackground = (slug) => new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'fetchNijihubMapping', slug }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (!response || !response.ok) {
                reject(new Error(response?.error || 'unknown background error'));
                return;
            }
            resolve(response.data);
        });
    });

    const searchMalIdViaNijihub = async (slug) => {
        try {
            const data = await fetchNijihubMappingViaBackground(slug);
            const malId = data?.data?.[0]?.mal_id;
            if (malId) {
                const verified = data.data[0].verified;
                console.log(`[VoirAnime Characters] mal_id ${malId} trouvé via nijihub (verified=${verified})`);
                return malId;
            }
        } catch (err) {
            console.log(`[VoirAnime Characters] nijihub indisponible: ${err.message}`);
        }
        return null;
    };

    const searchMalIdViaJikan = async (queries) => {
        for (const query of queries) {
            const res = await fetch(`${JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&limit=1`);
            if (!res.ok) continue;
            const data = await res.json();
            const malId = data.data?.[0]?.mal_id;
            if (malId) {
                console.log(`[VoirAnime Characters] mal_id ${malId} trouvé via Jikan "${query}"`);
                return malId;
            }
        }
        throw new Error('No MAL ID found for any query');
    };

    const resolveMalId = async (slug, queries) => {
        const fromNijihub = await searchMalIdViaNijihub(slug);
        if (fromNijihub) return fromNijihub;
        console.log(`[VoirAnime Characters] fallback Jikan...`);
        return searchMalIdViaJikan(queries);
    };

    const fetchCharactersFromMal = async (slug, queries) => {
        const malId = await resolveMalId(slug, queries);
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
            console.log(`[VoirAnime Characters] Résolution du mal_id pour slug="${slug}", fallback queries:`, queries);

            fetchCharactersFromMal(slug, queries)
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
