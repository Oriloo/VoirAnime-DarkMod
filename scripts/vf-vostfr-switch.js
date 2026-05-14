(() => {
    const ANIME_PAGE_PATTERN = /^https?:\/\/[^/]+\/anime\/([^/?#]+)\/?$/;
    const EPISODE_PAGE_PATTERN = /^https?:\/\/[^/]+\/anime\/([^/?#]+)\/([^/?#]+)\/?$/;
    const VFVOSTFR_CACHE_TTL = 24 * 60 * 60 * 1000;

    const computeAlternate = (url) => {
        const epMatch = url.match(EPISODE_PAGE_PATTERN);
        if (epMatch) {
            const [, animeSlug, episodeSlug] = epMatch;
            const isVf = animeSlug.endsWith('-vf');
            let altAnimeSlug, altEpisodeSlug;
            if (isVf) {
                altAnimeSlug = animeSlug.slice(0, -3);
                altEpisodeSlug = episodeSlug.replace(/-vf$/, '-vostfr');
            } else {
                altAnimeSlug = `${animeSlug}-vf`;
                altEpisodeSlug = episodeSlug.replace(/-vostfr$/, '-vf');
            }
            return {
                url: `${location.origin}/anime/${altAnimeSlug}/${altEpisodeSlug}/`,
                switchTo: isVf ? 'VOSTFR' : 'VF',
                type: 'episode'
            };
        }

        const animeMatch = url.match(ANIME_PAGE_PATTERN);
        if (animeMatch) {
            const slug = animeMatch[1];
            const isVf = slug.endsWith('-vf');
            const altSlug = isVf ? slug.slice(0, -3) : `${slug}-vf`;
            return {
                url: `${location.origin}/anime/${altSlug}/`,
                switchTo: isVf ? 'VOSTFR' : 'VF',
                type: 'anime'
            };
        }

        return null;
    };

    const injectVfVostfrButton = (target, url, switchTo, type) => {
        const container = document.querySelector(target);
        if (!container || container.querySelector('.vfvostfr-switch')) return;

        const btn = document.createElement('a');
        btn.href = url;
        btn.textContent = `Voir la ${switchTo}`;
        if (type === 'episode') {
            btn.className = 'btn vfvostfr-switch';
        } else {
            btn.className = 'c-btn c-btn_style-1 vfvostfr-switch';
        }
        container.appendChild(btn);

        console.log(`[VoirAnime VF/VOSTFR] Bouton "Voir la ${switchTo}" injecté ✅`);
    };

    const waitForElement = (selector, callback) => {
        const el = document.querySelector(selector);
        if (el) {
            callback();
            return;
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                callback();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => observer.disconnect(), 10000);
    };

    const runVfVostfrSwitch = () => {
        const alt = computeAlternate(location.href);
        if (!alt) return;

        const target = alt.type === 'episode' ? '.select-pagination .nav-links' : '.nav-links';

        console.log(`[VoirAnime VF/VOSTFR] Page ${alt.type} - vérification de l'alternative: ${alt.url}`);

        const cacheKey = `vfvostfr_${alt.url}`;

        chrome.storage.local.get(cacheKey, (data) => {
            const cached = data[cacheKey];

            if (cached && Date.now() - cached.timestamp < VFVOSTFR_CACHE_TTL) {
                console.log(`[VoirAnime VF/VOSTFR] Résultat en cache: ${cached.exists ? 'existe' : 'introuvable'}`);
                if (cached.exists) waitForElement(target, () => injectVfVostfrButton(target, alt.url, alt.switchTo, alt.type));
                return;
            }

            fetch(alt.url, { method: 'HEAD' })
                .then(res => {
                    const exists = res.ok;
                    chrome.storage.local.set({ [cacheKey]: { exists, timestamp: Date.now() } });
                    console.log(`[VoirAnime VF/VOSTFR] HEAD ${res.status} → ${exists ? 'existe' : 'introuvable'}`);
                    if (exists) waitForElement(target, () => injectVfVostfrButton(target, alt.url, alt.switchTo, alt.type));
                })
                .catch(err => {
                    console.log("[VoirAnime VF/VOSTFR] Erreur lors du HEAD:", err);
                });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runVfVostfrSwitch);
    } else {
        runVfVostfrSwitch();
    }
})();
