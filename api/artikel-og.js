export default async function handler(req, res) {
    const { sourceId, articleId } = req.query;

    if (!sourceId || !articleId) {
        return res.status(400).send('Missing parameters');
    }

    try {
        let finalArticleId = articleId;
        try {
            const decoded = atob(articleId);
            if (decoded.startsWith('/')) {
                const SOURCES = [
                    { id: 'fir', url: 'https://firanda.com' },
                    { id: 'rum', url: 'https://rumaysho.com' },
                    { id: 'ks', url: 'https://konsultasisyariah.com' },
                    { id: 'ms', url: 'https://muslim.or.id' },
                    { id: 'msh', url: 'https://muslimah.or.id' },
                    { id: 'maf', url: 'https://muslimafiyah.com' },
                    { id: 'kj', url: 'https://khotbahjumat.com' },
                ];
                const sourceUrl = SOURCES.find(s => s.id === sourceId)?.url || '';
                if (sourceUrl) {
                    finalArticleId = btoa(sourceUrl + decoded);
                }
            }
        } catch (e) {
            // Ignore decode error
        }

        // Fetch article detail
        const apiUrl = `https://artikel-islam.netlify.app/.netlify/functions/api/${sourceId}/detail/${encodeURIComponent(finalArticleId)}`;
        const apiRes = await fetch(apiUrl);
        const json = await apiRes.json();

        // Default meta
        let title = "Jurnal Ibadah";
        let desc = "Baca artikel Islam pilihan dari berbagai sumber tepercaya di Jurnal Ibadah.";
        let image = "https://jurnal-ibadah.vercel.app/img/og/og-jurnal-ibadah-1200x630.jpg";

        if (json.success && json.data) {
            if (json.data.title) title = json.data.title;
            
            if (json.data.content_html) {
                // Strip HTML and get first 160 chars
                const plainText = json.data.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (plainText) {
                    desc = plainText.substring(0, 160);
                    if (plainText.length > 160) desc += '...';
                }
            }

            if (json.data.thumbnail) {
                const thumb = json.data.thumbnail;
                if (thumb.startsWith('http') && thumb.length > 20) {
                    image = thumb;
                }
            } else {
                // fallback try to find first image in content
                const match = json.data.content_html?.match(/<img[^>]+src="([^">]+)"/i);
                if (match && match[1] && match[1].startsWith('http')) {
                    image = match[1];
                }
            }
        }

        // Fetch the original index.html
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'jurnal-ibadah.vercel.app';
        
        let html = '';
        try {
            const htmlRes = await fetch(`${protocol}://${host}/index.html`);
            if (htmlRes.ok) {
                html = await htmlRes.text();
            }
        } catch (fetchErr) {
            console.error('Failed to fetch index.html, using fallback', fetchErr);
        }

        if (!html) {
            // Fallback basic HTML that redirects to root if index.html cannot be fetched
            html = `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${title}</title>
                <meta property="og:title" content="${title}">
                <meta property="og:description" content="${desc}">
                <meta property="og:image" content="${image}">
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="${title}">
                <meta name="twitter:description" content="${desc}">
                <meta name="twitter:image" content="${image}">
                <script>window.location.href = "/";</script>
            </head>
            <body></body>
            </html>`;
        } else {
            // Inject tags into the fetched index.html
            html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
            
            const replaceOrAddMeta = (regex, replacement, htmlStr) => {
                if (regex.test(htmlStr)) {
                    return htmlStr.replace(regex, replacement);
                } else {
                    return htmlStr.replace('</head>', `    ${replacement}\n</head>`);
                }
            };

            html = replaceOrAddMeta(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${title}">`, html);
            html = replaceOrAddMeta(/<meta name="twitter:title" content="[^"]*">/i, `<meta name="twitter:title" content="${title}">`, html);
            
            html = replaceOrAddMeta(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${desc}">`, html);
            html = replaceOrAddMeta(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${desc}">`, html);
            html = replaceOrAddMeta(/<meta name="twitter:description" content="[^"]*">/i, `<meta name="twitter:description" content="${desc}">`, html);
            
            html = replaceOrAddMeta(/<meta property="og:image" content="[^"]*">/i, `<meta property="og:image" content="${image}">`, html);
            
            if (!/<meta name="twitter:image"/.test(html)) {
                html = replaceOrAddMeta(/<meta name="twitter:card" content="[^"]*">/i, `<meta name="twitter:card" content="summary_large_image">\n    <meta name="twitter:image" content="${image}">`, html);
            } else {
                html = replaceOrAddMeta(/<meta name="twitter:image" content="[^"]*">/i, `<meta name="twitter:image" content="${image}">`, html);
            }
        }

        res.setHeader('Content-Type', 'text/html');
        // Cache for bots for up to 1 day
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
        res.status(200).send(html);

    } catch (e) {
        console.error('Error generating OG tags:', e);
        // On error, fallback to client side render
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'jurnal-ibadah.vercel.app';
        try {
            const htmlRes = await fetch(`${protocol}://${host}/index.html`);
            const html = await htmlRes.text();
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(html);
        } catch (err) {
            res.redirect(302, '/');
        }
    }
}
