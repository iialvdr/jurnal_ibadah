/**
 * Vercel Serverless Function: /api/proxy
 * 
 * Forwards requests from /proxy/{sourceId}/{...path} to the actual source website.
 * This bypasses CORS restrictions when reading article HTML from the frontend.
 * 
 * Route: /api/proxy (handles /proxy/* via vercel.json rewrites)
 */

const TARGETS = {
    'fir': 'https://firanda.com',
    'rum': 'https://rumaysho.com',
    'ks': 'https://konsultasisyariah.com',
    'ms': 'https://muslim.or.id',
    'msh': 'https://muslimah.or.id',
    'maf': 'https://muslimafiyah.com',
    'kj': 'https://khotbahjumat.com',
};

export default async function handler(req, res) {
    // Path will be like /api/proxy/fir/judul-artikel or
    // (after rewrite) the query param sourceSlug is set
    // We use vercel.json rewrite: /proxy/:sourceId/:path* → /api/proxy?sourceId=:sourceId&path=:path
    const { sourceId, path: articlePath } = req.query;

    if (!sourceId || !TARGETS[sourceId]) {
        return res.status(404).json({ error: 'Source not found', sourceId });
    }

    const target = TARGETS[sourceId];
    // articlePath could be a string or array (Vercel wildcard catch-all)
    const restPath = Array.isArray(articlePath) ? articlePath.join('/') : (articlePath || '');
    
    // Build query string from remaining params (exclude our routing params)
    const remainingParams = { ...req.query };
    delete remainingParams.sourceId;
    delete remainingParams.path;
    const qs = new URLSearchParams(remainingParams).toString();

    let targetUrl = target;
    if (restPath) {
        targetUrl += '/' + restPath;
    } else {
        targetUrl += '/';
    }
    if (qs) {
        targetUrl += '?' + qs;
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache',
            },
            // Vercel functions run in Node.js, redirect: 'follow' is default
            redirect: 'follow',
        });

        const contentType = response.headers.get('content-type') || 'text/html; charset=utf-8';
        const body = await response.text();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);
        // Cache for a short time to avoid hitting source sites repeatedly
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(response.status).send(body);

    } catch (error) {
        console.error('[proxy] fetch error:', error.message, '| target:', targetUrl);
        return res.status(500).json({ error: error.message, targetUrl });
    }
}
