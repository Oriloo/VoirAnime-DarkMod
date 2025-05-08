document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggleSwitch');
    const themeSelector = document.getElementById('themeSelector');

    // Charger l'état actuel
    chrome.storage.sync.get({ enabled: true, theme: 'dark' }, data => {
        toggle.checked = data.enabled;
        updateLabel(data.enabled);
        themeSelector.value = data.theme || 'dark';
    });

    // Changement de l'état de l'extension
    toggle.addEventListener('change', () => {
        const on = toggle.checked;
        chrome.storage.sync.set({ enabled: on });
        updateLabel(on);
    });

    // Changement de thème
    themeSelector.addEventListener('change', () => {
        const theme = themeSelector.value;
        chrome.storage.sync.set({ theme: theme });
    });
});

function updateLabel(on) {
    document.getElementById('labelText').textContent =
        on ? 'Extension activée' : 'Extension désactivée';
}
