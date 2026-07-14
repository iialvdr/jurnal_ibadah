/**
 * Netlify Serverless Function: proxy
 *
 * Menangani request yang diarahkan dari redirect `/proxy/*` di netlify.toml.
 * Meneruskan request HTML ke situs sumber artikel untuk menghindari CORS.
 *
 * URL pattern: /proxy/{sourceId}/{...rest}
 */

const TARGETS = {
    'fir': 'https://firanda.com',
    'rum': 'https://rumaysho.com',
    'ks':  'https://konsultasisyariah.com',
    'ms':  'https://muslim.or.id',
    'msh': 'https://muslimah.or.id',
    'maf': 'https://muslimafiyah.com',
    'kj':  'https://khotbahjumat.com',
};

export const handler = async (event) => {
    // Gunakan rawUrl sebagai sumber path paling akurat
    let rawPath = '';
    if (event.rawUrl) {
        try { rawPath = new URL(event.rawUrl).pathname; } catch { rawPath = event.path || ''; }
    } else {
        rawPath = event.path || '';
    }

    // Ekstrak sourceId dan restPath
    // Cocok untuk: /proxy/sourceId/rest  ATAU  /.netlify/functions/proxy/sourceId/rest
    const proxyMatch = rawPath.match(/(?:\/proxy\/|\/\.netlify\/functions\/proxy\/)([^/]+)(?:\/(.*))?$/);

    if (!proxyMatch) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Invalid proxy path', path: rawPath }),
        };
    }

    const sourceId = proxyMatch[1];
    const restPath = proxyMatch[2] || '';

    if (!TARGETS[sourceId]) {
        return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Source not found', sourceId }),
        };
    }

    // Bangun query string
    const queryStringParameters = event.queryStringParameters || {};
    const qs = new URLSearchParams(queryStringParameters).toString();

    let targetUrl = TARGETS[sourceId];
    targetUrl += restPath ? '/' + restPath : '/';
    if (qs) targetUrl += '?' + qs;

    console.log(`[proxy] ${sourceId} → ${targetUrl}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
                'Referer': 'https://www.google.com/',
            },
            redirect: 'follow',
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || 'text/html; charset=utf-8';
        const body = await response.text();

        return {
            statusCode: response.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': contentType,
                'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
            },
            body,
        };
    } catch (error) {
        const isTimeout = error.name === 'AbortError';
        return {
            statusCode: isTimeout ? 504 : 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                error: isTimeout ? 'Proxy timeout: sumber artikel terlalu lambat' : error.message,
                targetUrl,
            }),
        };
    }
};
