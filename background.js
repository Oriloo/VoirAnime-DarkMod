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
    if (req && req.type === 'fetchNijihubMapping') {
        fetch(`https://api.nijihub.com/api/v1/id-map/lookup?va_slug=${encodeURIComponent(req.slug)}`)
            .then(res => {
                if (!res.ok) throw new Error(`nijihub HTTP ${res.status}`);
                return res.json();
            })
            .then(data => sendResponse({ ok: true, data }))
            .catch(err => sendResponse({ ok: false, error: err.message }));
        return true;
    }
});
