exports.handler = async (event, context) => {
    // Determine the original path. Netlify redirects preserve the original path in event.path
    let path = event.path;
    if (!path.startsWith('/proxy/')) {
        // Fallback if event.path is just the function path
        path = event.rawUrl ? new URL(event.rawUrl).pathname : '';
    }

    const cleanPath = path.replace(/^\/proxy\//, '');
    const parts = cleanPath.split('/');
    const sourceId = parts[0];
    const restPath = parts.slice(1).join('/');

    // Handle query parameters
    const queryStringParameters = event.queryStringParameters || {};
    const params = new URLSearchParams(queryStringParameters);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const targets = {
        'fir': 'https://firanda.com',
        'rum': 'https://rumaysho.com',
        'ks': 'https://konsultasisyariah.com',
        'ms': 'https://muslim.or.id',
        'msh': 'https://muslimah.or.id',
        'maf': 'https://muslimafiyah.com',
        'kj': 'https://khotbahjumat.com'
    };

    if (!targets[sourceId]) {
        return { statusCode: 404, body: 'Source not found in proxy config' };
    }

    let targetUrl = targets[sourceId];
    if (sourceId === 'ms' && restPath === '') {
        targetUrl += '/';
    } else if (restPath !== '') {
        targetUrl += '/' + restPath;
    }
    targetUrl += queryString;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Referer': 'https://www.google.com/',
                'Origin': 'https://www.google.com'
            }
        });

        // We could proxy binary data, but for scraping we only need text (HTML or JSON)
        const body = await response.text();

        return {
            statusCode: response.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': response.headers.get('content-type') || 'text/html; charset=utf-8'
            },
            body: body
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message, url: targetUrl })
        };
    }
};
