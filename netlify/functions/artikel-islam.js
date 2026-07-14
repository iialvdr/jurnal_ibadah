/**
 * Netlify Serverless Function: artikel-islam
 *
 * Meneruskan request daftar artikel ke backend artikel-islam.netlify.app.
 * Dipanggil via redirect di netlify.toml: /api/artikel-islam/* → function ini
 */

const BACKEND_BASE = 'https://artikel-islam.netlify.app/.netlify/functions/api';

export const handler = async (event) => {
    // Ambil path setelah /api/artikel-islam dari rawUrl
    let rawPath = '';
    if (event.rawUrl) {
        try { rawPath = new URL(event.rawUrl).pathname; } catch { rawPath = event.path || ''; }
    } else {
        rawPath = event.path || '';
    }

    // Ekstrak sub-path setelah /api/artikel-islam
    const subPathMatch = rawPath.match(/\/api\/artikel-islam(?:\/(.*))?$/);
    const subPath = subPathMatch?.[1] || '';

    // Query string
    const queryStringParameters = event.queryStringParameters || {};
    const qs = new URLSearchParams(queryStringParameters).toString();

    let targetUrl = BACKEND_BASE;
    if (subPath) targetUrl += '/' + subPath;
    if (qs) targetUrl += '?' + qs;

    console.log(`[artikel-islam] → ${targetUrl}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'JurnalIbadah/1.0',
            },
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || 'application/json';
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
                success: false,
                error: error.message,
                targetUrl,
            }),
        };
    }
};
