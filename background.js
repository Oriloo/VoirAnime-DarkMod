chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req && req.type === 'fetchMalAnimePage') {
        fetch(`https://myanimelist.net/anime/${req.malId}`)
            .then(res => {
                if (!res.ok) throw new Error(`MAL HTTP ${res.status}`);
                return res.text();
            })
            .then(html => sendResponse({ ok: true, html }))
            .catch(err => sendResponse({ ok: false, error: err.message }));
        return true;
    }
});
