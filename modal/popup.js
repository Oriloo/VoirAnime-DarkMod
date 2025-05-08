document.addEventListener('DOMContentLoaded', () => {
    const toggle        = document.getElementById('toggleSwitch');
    const themeSelector = document.getElementById('themeSelector');
    const versionSelect = document.getElementById('versionSelector');

    chrome.storage.sync.get(
        { enabled: true, theme: 'dark', version: '2' },
        data => {
            toggle.checked        = data.enabled;
            themeSelector.value   = data.theme;
            versionSelect.value   = data.version;
            updateLabel(data.enabled);
        }
    );

    toggle.addEventListener('change', () => {
        const on = toggle.checked;
        chrome.storage.sync.set({ enabled: on });
        updateLabel(on);
    });

    themeSelector.addEventListener('change', () => {
        chrome.storage.sync.set({ theme: themeSelector.value });
    });

    versionSelect.addEventListener('change', () => {
        chrome.storage.sync.set({ version: versionSelect.value });
    });
});

function updateLabel(on) {
    document.getElementById('labelText').textContent =
        on ? 'Extension activée' : 'Extension désactivée';
}
