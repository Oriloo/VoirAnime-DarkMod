document.addEventListener('DOMContentLoaded', () => {
    const toggle         = document.getElementById('toggleSwitch');
    const themeSelector  = document.getElementById('themeSelector');
    const versionSelect  = document.getElementById('versionSelector');
    const searchSelectEl = document.getElementById('searchSelect');
    const searchSelector = document.getElementById('searchSelector');

    chrome.storage.sync.get(
        { enabled: true, theme: 'dark', version: '2', search: 'fixe' },
        data => {
            toggle.checked        = data.enabled;
            themeSelector.value   = data.theme;
            versionSelect.value   = data.version;
            searchSelector.value  = data.search;
            updateLabel(data.enabled);
            toggleSearchSelect(data.version);
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
    });

    searchSelector.addEventListener('change', () => {
        chrome.storage.sync.set({ search: searchSelector.value });
    });

    function updateLabel(on) {
        document.getElementById('labelText').textContent =
            on ? 'Extension activée' : 'Extension désactivée';
    }

    function toggleSearchSelect(version) {
        searchSelectEl.style.display = version === '2' ? 'block' : 'none';
    }
});
