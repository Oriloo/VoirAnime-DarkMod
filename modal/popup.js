document.addEventListener('DOMContentLoaded', () => {
    const toggle              = document.getElementById('toggleSwitch');
    const themeSelector       = document.getElementById('themeSelector');
    const versionSelect       = document.getElementById('versionSelector');
    const searchSelectEl      = document.getElementById('searchSelect');
    const searchSelector      = document.getElementById('searchSelector');
    const genreSelectEl       = document.getElementById('genreSelect');
    const genreSelector       = document.getElementById('genreSelector');
    const lecteurSelector     = document.getElementById('lecteurSelector');
    const autoValiderSelector = document.getElementById('autoValiderSelector');

    chrome.storage.sync.get(
        {
            enabled: true,
            theme: 'dark',
            version: '2',
            search: 'fixe',
            genre: 'hide',
            autoLecteurEnabled: false,
            lecteurPreferred: 'LECTEUR myTV',
            autoValiderEnabled: false
        },
        data => {
            toggle.checked          = data.enabled;
            themeSelector.value     = data.theme;
            versionSelect.value     = data.version;
            searchSelector.value    = data.search;
            genreSelector.value     = data.genre;

            // Lecteur : si désactivé → "default", sinon la valeur du lecteur préféré
            lecteurSelector.value = data.autoLecteurEnabled ? data.lecteurPreferred : 'default';

            // Auto-validé : si désactivé → "default", sinon "enabled"
            autoValiderSelector.value = data.autoValiderEnabled ? 'enabled' : 'default';

            updateLabel(data.enabled);
            toggleSearchSelect(data.version);
            toggleGenreSelect(data.version);
        }
    );

    toggle.addEventListener('change', () => {
        chrome.storage.sync.set({ enabled: toggle.checked });
        updateLabel(toggle.checked);
    });

    themeSelector.addEventListener('change', () => {
        chrome.storage.sync.set({ theme: themeSelector.value });
    });

    versionSelect.addEventListener('change', () => {
        const v = versionSelect.value;
        chrome.storage.sync.set({ version: v });
        toggleSearchSelect(v);
        toggleGenreSelect(data.version);
    });

    searchSelector.addEventListener('change', () => {
        chrome.storage.sync.set({ search: searchSelector.value });
    });

    genreSelector.addEventListener('change', () => {
        chrome.storage.sync.set({ genre: genreSelector.value });
    });

    lecteurSelector.addEventListener('change', () => {
        const value = lecteurSelector.value;
        if (value === 'default') {
            chrome.storage.sync.set({ autoLecteurEnabled: false });
        } else {
            chrome.storage.sync.set({
                autoLecteurEnabled: true,
                lecteurPreferred: value
            });
        }
    });

    autoValiderSelector.addEventListener('change', () => {
        const isEnabled = autoValiderSelector.value === 'enabled';
        chrome.storage.sync.set({ autoValiderEnabled: isEnabled });
    });

    function updateLabel(on) {
        document.getElementById('labelText').textContent =
            on ? 'Extension activée' : 'Extension désactivée';
    }

    function toggleSearchSelect(version) {
        searchSelectEl.style.display = version === '2' ? 'block' : 'none';
    }

    function toggleGenreSelect(version) {
        genreSelectEl.style.display = version === '2' ? 'block' : 'none';
    }
});
