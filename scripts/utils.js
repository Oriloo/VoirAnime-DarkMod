(() => {
    // Helper partagé : récupère la config broadcastée par content.js,
    // soit en lisant le dataset (sync), soit en attendant l'event darkmod:ready.
    window.onDarkmodConfig = (callback) => {
        const root = document.documentElement;
        const read = () => {
            const raw = root.dataset.darkmodConfig;
            if (!raw) return;
            try { callback(JSON.parse(raw)); } catch {}
        };
        if (root.dataset.darkmodConfig) read();
        else root.addEventListener('darkmod:ready', read, { once: true });
    };
})();
