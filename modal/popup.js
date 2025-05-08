document.addEventListener('DOMContentLoaded', () => {
    const toggle        = document.getElementById('toggleSwitch');
    const themeSelector = document.getElementById('themeSelector');
    const versionSelect = document.getElementById('versionSelector');

    // Charger l'état actuel (enabled, theme, version)
    chrome.storage.sync.get(
        { enabled: true, theme: 'dark', version: '2' },
        data => {
            toggle.checked        = data.enabled;
            themeSelector.value   = data.theme;
            versionSelect.value   = data.version;
            updateLabel(data.enabled);
        }
    );

    // Quand on change on/off
    toggle.addEventListener('change', () => {
        const on = toggle.checked;
        chrome.storage.sync.set({ enabled: on });
        updateLabel(on);
    });

    // Quand on change de thème
    themeSelector.addEventListener('change', () => {
        chrome.storage.sync.set({ theme: themeSelector.value });
    });

    // Quand on change de version
    versionSelect.addEventListener('change', () => {
        chrome.storage.sync.set({ version: versionSelect.value });
    });
});

function updateLabel(on) {
    document.getElementById('labelText').textContent =
        on ? 'Extension activée' : 'Extension désactivée';
}
