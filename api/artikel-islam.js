/**
 * Vercel Serverless Function: /api/artikel-islam
 *
 * Meneruskan request ke backend artikel-islam.netlify.app.
 * Menangani semua path di bawah /api/artikel-islam/* via vercel.json rewrites.
 *
 * Contoh route yang ditangani:
 *   /api/artikel-islam/fir?page=1   → https://artikel-islam.netlify.app/.netlify/functions/api/fir?page=1
 *   /api/artikel-islam/rum/detail/… → https://artikel-islam.netlify.app/.netlify/functions/api/rum/detail/…
 */

const BACKEND_BASE = 'https://artikel-islam.netlify.app/.netlify/functions/api';

export default async function handler(req, res) {
    // path param diisi via vercel.json rewrite: /api/artikel-islam/:path*
    const { path: pathParts, ...rest } = req.query;

    // Bangun path setelah /api/artikel-islam
    const subPath = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts || '');

    // Sisa query string (tanpa param routing 'path')
    const qs = new URLSearchParams(rest).toString();

    let targetUrl = BACKEND_BASE;
    if (subPath) targetUrl += '/' + subPath;
    if (qs) targetUrl += '?' + qs;

    console.log(`[artikel-islam] proxying → ${targetUrl}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const upstream = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'JurnalIbadah/1.0',
            },
        });
        clearTimeout(timeoutId);

        const contentType = upstream.headers.get('content-type') || 'application/json';
        const body = await upstream.text();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(upstream.status).send(body);
    } catch (err) {
        const isTimeout = err.name === 'AbortError';
        console.error(`[artikel-islam] ${isTimeout ? 'TIMEOUT' : 'ERROR'}: ${err.message}`);
        return res.status(isTimeout ? 504 : 500).json({
            success: false,
            error: err.message,
            targetUrl,
        });
    }
}
