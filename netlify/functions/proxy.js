/**
 * Netlify Serverless Function: proxy
 * 
 * Handles requests forwarded from the /proxy/* redirect rule in netlify.toml.
 * Fetches HTML from source websites to bypass CORS restrictions.
 * 
 * URL pattern: /proxy/{sourceId}/{...rest}
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

exports.handler = async (event, context) => {
    // Netlify passes the ORIGINAL requested URL in event.rawUrl (most reliable)
    // event.path may be the function's own path after rewrite
    let rawPath = '';
    
    if (event.rawUrl) {
        try {
            rawPath = new URL(event.rawUrl).pathname;
        } catch (e) {
            rawPath = event.path || '';
        }
    } else {
        rawPath = event.path || '';
    }

    // Extract sourceId and restPath from the URL
    // Supports both: /proxy/sourceId/rest  AND  /.netlify/functions/proxy/sourceId/rest
    const proxyMatch = rawPath.match(/(?:\/proxy\/|\/\.netlify\/functions\/proxy\/)([^/]+)(?:\/(.*))?$/);

    if (!proxyMatch) {
        console.error('[proxy] No match for path:', rawPath);
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

    // Build query string from params (forward them to the target)
    const queryStringParameters = event.queryStringParameters || {};
    const qs = new URLSearchParams(queryStringParameters).toString();

    let targetUrl = TARGETS[sourceId];
    if (restPath) {
        targetUrl += '/' + restPath;
    } else {
        targetUrl += '/';
    }
    if (qs) {
        targetUrl += '?' + qs;
    }

    console.log(`[proxy] ${sourceId} → ${targetUrl}`);

    try {
        // Netlify Functions have a default 10s timeout; use AbortController for safety
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s to be safe

        const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache',
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
        console.error(`[proxy] ${isTimeout ? 'TIMEOUT' : 'ERROR'}: ${error.message} | url: ${targetUrl}`);

        return {
            statusCode: isTimeout ? 504 : 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: isTimeout ? 'Proxy timeout: sumber artikel terlalu lambat' : error.message,
                targetUrl,
            }),
        };
    }
};
