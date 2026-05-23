(() => {
    // Fix d'un bug du site voir-anime.to : dans le footer, l'icône Discord
    // utilise <i class="fa-discord"> mais il manque la classe `.fab` (Font
    // Awesome Brands) nécessaire au rendu de l'icône. Ce script ajoute la
    // classe manquante à toutes les balises concernées, sur toutes les pages.
    // Compatible v1 et v2 puisque le bug est dans le HTML du site, pas le CSS.

    const fixIcons = (root = document) => {
        root.querySelectorAll('i.fa-discord:not(.fab)').forEach(el => el.classList.add('fab'));
    };

    const observer = new MutationObserver(records => {
        records.forEach(rec => rec.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches('i.fa-discord:not(.fab)')) n.classList.add('fab');
            if (n.querySelectorAll) fixIcons(n);
        }));
    });

    const init = () => {
        fixIcons();
        observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    chrome.storage.sync.get({ enabled: true }, (data) => {
        if (!data.enabled) return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    });
})();
