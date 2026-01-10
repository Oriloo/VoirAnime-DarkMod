document.addEventListener('DOMContentLoaded', () => {
    const toggle              = document.getElementById('toggleSwitch');
    const themeSelector       = document.getElementById('themeSelector');
    const versionSelect       = document.getElementById('versionSelector');
    const searchSelectEl      = document.getElementById('searchSelect');
    const searchSelector      = document.getElementById('searchSelector');
    const autoLecteurToggle   = document.getElementById('autoLecteurToggle');
    const lecteurSelector     = document.getElementById('lecteurSelector');
    const lecteurSelectCont   = document.getElementById('lecteurSelectContainer');
    const autoValiderToggle   = document.getElementById('autoValiderToggle');

    chrome.storage.sync.get(
        {
            enabled: true,
            theme: 'dark',
            version: '2',
            search: 'fixe',
            autoLecteurEnabled: false,
            lecteurPreferred: 'LECTEUR myTV',
            autoValiderEnabled: false
        },
        data => {
            toggle.checked            = data.enabled;
            themeSelector.value       = data.theme;
            versionSelect.value       = data.version;
            searchSelector.value      = data.search;
            autoLecteurToggle.checked = data.autoLecteurEnabled;
            lecteurSelector.value     = data.lecteurPreferred;
            autoValiderToggle.checked = data.autoValiderEnabled;
            updateLabel(data.enabled);
            toggleSearchSelect(data.version);
            toggleLecteurSelect(data.autoLecteurEnabled);
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

    autoLecteurToggle.addEventListener('change', () => {
        const isEnabled = autoLecteurToggle.checked;
        chrome.storage.sync.set({ autoLecteurEnabled: isEnabled });
        toggleLecteurSelect(isEnabled);
    });

    lecteurSelector.addEventListener('change', () => {
        chrome.storage.sync.set({ lecteurPreferred: lecteurSelector.value });
    });

    autoValiderToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ autoValiderEnabled: autoValiderToggle.checked });
    });

    function updateLabel(on) {
        document.getElementById('labelText').textContent =
            on ? 'Extension activée' : 'Extension désactivée';
    }

    function toggleSearchSelect(version) {
        searchSelectEl.style.display = version === '2' ? 'block' : 'none';
    }

    function toggleLecteurSelect(enabled) {
        lecteurSelectCont.style.display = enabled ? 'flex' : 'none';
    }
});
