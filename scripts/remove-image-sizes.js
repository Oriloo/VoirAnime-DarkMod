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

    window.onDarkmodConfig((config) => {
        if (!config.enabled || config.version !== '2') return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initImageSizes);
        } else {
            initImageSizes();
        }
    });
})();
