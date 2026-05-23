(() => {
    const ANIME_PAGE_PATTERN = /^https?:\/\/[^/]+\/anime\/([^/?#]+)\/?$/;
    const EPISODE_PAGE_PATTERN = /^https?:\/\/[^/]+\/anime\/([^/?#]+)\/([^/?#]+)\/?$/;
    const STATE_RESET_DELAY = 5000;
    const SHOW_TOP_BTN_AFTER = 400;

    const SVG_ARROW_UP = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
    const SVG_ARROW_DOWN = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    const SVG_INFO = `<svg viewBox="0 0 1920 1920" width="20" height="20" fill="currentColor"><path d="M852.517 606.04C722.804 666.467 612.48 770.67 502.075 923.02c-15.746 21.725-16.38 34.927-.205 46.602 11.372 8.209 17.98 5.583 34.542-12.088 2.217-2.38 2.217-2.38 4.484-4.84 14.318-15.505 25.852-28.662 50.49-57.274 81.407-94.538 121.17-133.45 182.968-169.038 53.478-30.795 100.476 14.462 91.527 72.38-2.51 16.258-6.836 28.257-17.978 54.022-4.432 10.249-6.302 14.707-8.38 20.171-20.085 52.8-37.002 96.846-72.451 188.834l-1.696 4.4c-10.718 27.813-10.718 27.813-21.427 55.62-46.426 120.661-74.598 194.652-103.665 272.901l-1.705 4.587c-7.8 20.975-11.474 30.871-15.534 41.881-33.306 90.321-52.353 149.007-66.84 211.427-2.262 9.713-2.262 9.713-4.556 19.584-8.162 35.31-12.53 58.062-14.972 81.448-4.222 40.439-.827 73.553 11.881 101.382 14.38 31.493 45.278 54.021 80.532 59.138 58.727 8.525 115.393 7.92 163.927-3.123 27.314-6.21 54.338-14.34 80.853-24.306 76.773-28.866 150.735-73.905 222.371-133.442 62.681-52.236 121.988-115.875 184.165-194.965 5.42-6.849 5.42-6.849 10.823-13.686 18.78-23.947 27.981-39.501 31.416-55.93 3.736-17.836-11.342-35.912-23.394-29.864-5.956 2.989-12.187 9.176-21.68 21.15-6.791 8.714-10.483 13.37-14.178 17.555-14.745 16.695-30.315 33.783-47.184 51.837-27.812 29.752-56.07 58.865-97.055 100.308-20.874 21.107-47.126 39.56-75.351 53.435-45.176 22.197-85.929-5.782-81.034-55.857 3.229-33.058 11.238-67.234 23.212-100.275 26.157-72.22 47.544-130.604 94.86-259.27 20.52-55.803 29.38-79.91 40.446-110.086 32.81-89.425 59-161.415 83.919-230.875 30.784-85.803 48.175-149.762 56.227-215.81 6.08-49.817-7.78-97.46-39.389-130.216-35.047-36.312-84.896-53.039-146.979-52.305-68.692.817-148.82 23.261-222.548 57.608Zm470.186-592.224c-123.444-48.028-271.57 34.483-296.373 165.169-17.984 94.72 17.4 176.498 89.622 210.751 143.165 67.897 314.982-40.897 314.989-199.468.007-88.211-37.668-148.991-108.238-176.452Z"/></svg>`;

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

    const createInfoPopup = () => {
        const popup = document.createElement('div');
        popup.className = 'scroll-to-watched-info-popup';
        popup.innerHTML = `
            <ul>
                <li>${SVG_ARROW_UP}<span>Remonter en haut de la page</span></li>
                <li>${SVG_ARROW_DOWN}<span>Aller au dernier épisode regardé<br>(2<sup>e</sup> clic : aller au tout premier épisode)</span></li>
            </ul>
        `;
        return popup;
    };

    const setupButtons = (lastEpUrl) => {
        if (document.querySelector('.scroll-to-watched-container')) return;

        const container = document.createElement('div');
        container.className = 'scroll-to-watched-container';

        const upBtn = createButton('scroll-to-watched-up', SVG_ARROW_UP, "Remonter en haut de la page");
        const infoBtn = createButton('scroll-to-watched-info', SVG_INFO, "Afficher les informations sur les raccourcis");
        const downBtn = createButton('scroll-to-watched-down', SVG_ARROW_DOWN, "Scroller vers les épisodes");
        const infoPopup = createInfoPopup();

        container.appendChild(infoPopup);
        container.appendChild(upBtn);
        container.appendChild(infoBtn);
        container.appendChild(downBtn);
        document.body.appendChild(container);

        const togglePopup = (open) => {
            const isOpen = open !== undefined ? open : !container.classList.contains('show-info');
            container.classList.toggle('show-info', isOpen);
        };

        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePopup();
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) togglePopup(false);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') togglePopup(false);
        });

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

    window.onDarkmodConfig((config) => {
        if (!config.enabled || config.version !== '2') return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    });
})();
