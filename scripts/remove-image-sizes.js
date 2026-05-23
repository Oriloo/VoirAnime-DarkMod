(() => {
    const removeImageSizes = () => {
        document.querySelectorAll('img[sizes]').forEach(img => img.removeAttribute('sizes'));
    };

    const imageSizesObserver = new MutationObserver(records => {
        records.forEach(rec => rec.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            if (n.matches('img[sizes]')) n.removeAttribute('sizes');
            n.querySelectorAll('img[sizes]').forEach(img => img.removeAttribute('sizes'));
        }));
    });

    const initImageSizes = () => {
        removeImageSizes();
        imageSizesObserver.observe(document.documentElement, { childList: true, subtree: true });
    };

    const onConfig = (callback) => {
        const root = document.documentElement;
        const read = () => {
            const raw = root.dataset.darkmodConfig;
            if (!raw) return;
            try { callback(JSON.parse(raw)); } catch {}
        };
        if (root.dataset.darkmodConfig) read();
        else root.addEventListener('darkmod:ready', read, { once: true });
    };

    onConfig((config) => {
        if (!config.enabled || config.version !== '2') return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initImageSizes);
        } else {
            initImageSizes();
        }
    });
})();
