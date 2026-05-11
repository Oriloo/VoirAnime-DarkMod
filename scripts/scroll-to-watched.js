(() => {
    const ANIME_PAGE_PATTERN = /^https?:\/\/[^/]+\/anime\/([^/?#]+)\/?$/;
    const EPISODE_PAGE_PATTERN = /^https?:\/\/[^/]+\/anime\/([^/?#]+)\/([^/?#]+)\/?$/;
    const STATE_RESET_DELAY = 5000;
    const SHOW_TOP_BTN_AFTER = 400;

    const SVG_ARROW_UP = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
    const SVG_ARROW_DOWN = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

    const trackEpisode = () => {
        const match = location.href.match(EPISODE_PAGE_PATTERN);
        if (!match) return;
        const animeSlug = match[1];
        const key = `lastEp_${animeSlug}`;
        chrome.storage.local.set({ [key]: location.href }, () => {
            console.log(`[VoirAnime Scroll] Dernier épisode enregistré pour "${animeSlug}"`);
        });
    };

    const findLastWatchedChapterEl = (lastEpUrl) => {
        if (!lastEpUrl) return null;
        const chapters = document.querySelectorAll('.wp-manga-chapter');
        for (const ch of chapters) {
            const link = ch.querySelector('a');
            if (link && link.href === lastEpUrl) return ch;
        }
        return null;
    };

    const findFirstChapterEl = () => {
        const chapters = document.querySelectorAll('.wp-manga-chapter');
        return chapters.length ? chapters[chapters.length - 1] : null;
    };

    const smoothScrollTo = (el) => {
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('scroll-to-watched-flash');
        setTimeout(() => el.classList.remove('scroll-to-watched-flash'), 1500);
    };

    const createButton = (className, svg, ariaLabel) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `scroll-to-watched-btn ${className}`;
        btn.innerHTML = svg;
        btn.setAttribute('aria-label', ariaLabel);
        return btn;
    };

    const setupButtons = (lastEpUrl) => {
        if (document.querySelector('.scroll-to-watched-container')) return;

        const container = document.createElement('div');
        container.className = 'scroll-to-watched-container';

        const upBtn = createButton('scroll-to-watched-up', SVG_ARROW_UP, "Remonter en haut de la page");
        const downBtn = createButton('scroll-to-watched-down', SVG_ARROW_DOWN, "Scroller vers les épisodes");

        container.appendChild(upBtn);
        container.appendChild(downBtn);
        document.body.appendChild(container);

        upBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        let downState = 0;
        let resetTimer = null;
        const resetDownState = () => {
            downState = 0;
            if (resetTimer) {
                clearTimeout(resetTimer);
                resetTimer = null;
            }
        };

        downBtn.addEventListener('click', () => {
            const lastWatchedEl = findLastWatchedChapterEl(lastEpUrl);
            const firstChapterEl = findFirstChapterEl();

            if (!lastWatchedEl) {
                smoothScrollTo(firstChapterEl);
                resetDownState();
                return;
            }

            if (downState === 0) {
                smoothScrollTo(lastWatchedEl);
                downState = 1;
            } else {
                smoothScrollTo(firstChapterEl);
                downState = 0;
            }

            if (resetTimer) clearTimeout(resetTimer);
            resetTimer = setTimeout(resetDownState, STATE_RESET_DELAY);
        });

        const updateUpBtnVisibility = () => {
            if (window.scrollY > SHOW_TOP_BTN_AFTER) {
                container.classList.add('show-up');
            } else {
                container.classList.remove('show-up');
            }
        };
        window.addEventListener('scroll', updateUpBtnVisibility, { passive: true });
        updateUpBtnVisibility();
    };

    const runOnAnimePage = () => {
        if (!ANIME_PAGE_PATTERN.test(location.href)) return;

        const match = location.href.match(ANIME_PAGE_PATTERN);
        const animeSlug = match[1];
        const key = `lastEp_${animeSlug}`;

        chrome.storage.local.get(key, (data) => {
            const lastEpUrl = data[key] || null;
            console.log(`[VoirAnime Scroll] Dernier épisode pour "${animeSlug}":`, lastEpUrl || 'aucun');
            setupButtons(lastEpUrl);
        });
    };

    const init = () => {
        trackEpisode();
        runOnAnimePage();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
