import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, RefreshCw, AlertCircle, Share2, ExternalLink, Tag } from 'lucide-react';
import "@aejkatappaja/phantom-ui";
import { motion } from 'framer-motion';

const API_ROOT = import.meta.env.DEV ? '/api/artikel-islam' : 'https://artikel-islam.netlify.app/.netlify/functions/api';

const SOURCES = [
    { id: 'fir',  name: 'Firanda.com',          url: 'https://firanda.com',           icon: 'F',   iconImg: '/img/firanda.png', accent: '#3b82f6', bg: 'bg-blue-500' },
    { id: 'rum',  name: 'Rumaysho',              url: 'https://rumaysho.com',          icon: 'R',   iconImg: '/img/rumaysho.png', accent: '#8b5cf6', bg: 'bg-violet-500' },
    { id: 'ks',   name: 'Konsultasi Syariah',    url: 'https://konsultasisyariah.com', icon: 'KS',  accent: '#14b8a6', bg: 'bg-teal-500' },
    { id: 'ms',   name: 'Muslim.or.id',          url: 'https://muslim.or.id',          icon: 'M',   iconImg: '/img/muslim.png', accent: '#22c55e', bg: 'bg-green-500' },
    { id: 'msh',  name: 'Muslimah.or.id',        url: 'https://muslimah.or.id',        icon: 'MH',  iconImg: '/img/muslimah.png', accent: '#f43f5e', bg: 'bg-rose-500' },
    { id: 'maf',  name: 'Muslimafiyah',          url: 'https://muslimafiyah.com',      icon: 'MF',  iconImg: '/img/muslimafiyah.jpg', accent: '#f59e0b', bg: 'bg-amber-500' },
    { id: 'kj',   name: 'Khotbah Jumat',         url: 'https://khotbahjumat.com',      icon: 'KJ',  accent: '#f97316', bg: 'bg-orange-500' },
];

async function fetchWithTimeout(url, timeout = 8000, options = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const defaultHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8'
        };
        const fetchOptions = {
            ...options,
            headers: { ...defaultHeaders, ...options.headers },
            signal: controller.signal
        };
        const response = await fetch(url, fetchOptions);
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// ─── Peta Nama Surah → Nomor (114 Surah) ────────────────────────────────
// Key: variasi penulisan nama surah (lowercase, tanpa tanda baca)
const SURAH_MAP = {
    'al fatihah':1,'alfatihah':1,'fatihah':1,'al-fatihah':1,
    'al baqarah':2,'albaqarah':2,'baqarah':2,'al-baqarah':2,
    'ali imran':3,'ali imron':3,'aliimran':3,'al imran':3,'al-imran':3,
    'an nisa':4,'annisa':4,'nisa':4,'an-nisa':4,
    'al maidah':5,'almaidah':5,'maidah':5,'al-maidah':5,
    'al anam':6,'alanam':6,'al-anam':6,
    'al araf':7,'alaraf':7,'al-araf':7,'al araaf':7,'al-araaf':7,'al a\'raf':7,'al-a\'raf':7,'al a\u2019raf':7,'al-a\u2019raf':7,'al a\'raaf':7,'al-a\'raaf':7,'al a\u2019raaf':7,'al-a\u2019raaf':7,
    'al anfal':8,'alanfal':8,'al-anfal':8,
    'at taubah':9,'attaubah':9,'taubah':9,'at-taubah':9,
    'yunus':10,'al-yunus':10,
    'hud':11,
    'yusuf':12,
    'ar rad':13,'ar-rad':13,
    'ibrahim':14,
    'al hijr':15,'al-hijr':15,
    'an nahl':16,'an-nahl':16,
    'al isra':17,'al-isra':17,'bani israil':17,
    'al kahf':18,'al-kahf':18,'alkahf':18,'al kahfi':18,'al-kahfi':18,
    'maryam':19,
    'ta ha':20,'taha':20,'thaha':20,'thaahaa':20,'tha ha':20,
    'al anbiya':21,'al-anbiya':21,'anbiya':21,
    'al hajj':22,'al-hajj':22,
    'al mukminun':23,'almukminun':23,'al-mukminun':23,'almuminun':23,
    'an nur':24,'an-nur':24,'annur':24,'an-an-nur':24,'an an nur':24,
    'al furqan':25,'al-furqan':25,
    'asy syuara':26,'asy-syuara':26,'asy-syu\u2019ara':26,
    'an naml':27,'an-naml':27,
    'al qasas':28,'al-qasas':28,
    'al ankabut':29,'al-ankabut':29,
    'ar rum':30,'ar-rum':30,
    'luqman':31,
    'as sajdah':32,'as-sajdah':32,
    'al ahzab':33,'al-ahzab':33,
    'saba':34,
    'fatir':35,'fathir':35,
    'ya sin':36,'yasin':36,'ya-sin':36,
    'as saffat':37,'as-saffat':37,
    'sad':38,
    'az zumar':39,'az-zumar':39,
    'al mukmin':40,'al-mukmin':40,'ghafir':40,
    'fussilat':41,'al fussilat':41,'fushshilat':41,'fushilat':41,
    'asy syura':42,'asy-syura':42,
    'az zukhruf':43,'az-zukhruf':43,
    'ad dukhan':44,'ad-dukhan':44,
    'al jasiyah':45,'al-jasiyah':45,'al jatsiyah':45,'al-jatsiyah':45,'al jathiyah':45,'al-jathiyah':45,
    'al ahqaf':46,'al-ahqaf':46,
    'muhammad':47,
    'al fath':48,'al-fath':48,'alfath':48,
    'al hujurat':49,'al-hujurat':49,'al hujurot':49,
    'qaf':50,
    'az zariyat':51,'az-zariyat':51,'adz dzariyat':51,'adz-dzariyat':51,
    'at tur':52,'at-tur':52,
    'an najm':53,'an-najm':53,
    'al qamar':54,'al-qamar':54,
    'ar rahman':55,'ar-rahman':55,'arrahman':55,
    'al waqiah':56,'al-waqiah':56,
    'al hadid':57,'al-hadid':57,
    'al mujadalah':58,'al-mujadalah':58,
    'al hasyr':59,'al-hasyr':59,
    'al mumtahanah':60,'al-mumtahanah':60,
    'as saf':61,'as-saf':61,
    'al jumuah':62,'al-jumuah':62,
    'al munafiqun':63,'al-munafiqun':63,
    'at tagabun':64,'at-tagabun':64,'at taghabun':64,'at-taghabun':64,
    'at talaq':65,'at-talaq':65,'ath thalaq':65,'ath-thalaq':65,'ath tholaq':65,'ath-tholaq':65,
    'at tahrim':66,'at-tahrim':66,
    'al mulk':67,'al-mulk':67,'almulk':67,
    'al qalam':68,'al-qalam':68,
    'al haqqah':69,'al-haqqah':69,
    'al maarij':70,'al-maarij':70,
    'nuh':71,
    'al jin':72,'al-jin':72,
    'al muzzammil':73,'al-muzzammil':73,
    'al muddassir':74,'al-muddassir':74,
    'al qiyamah':75,'al-qiyamah':75,
    'al insan':76,'al-insan':76,'ad dahar':76,
    'al mursalat':77,'al-mursalat':77,
    'an naba':78,'an-naba':78,
    'an naziat':79,'an-naziat':79,
    'abasa':80,
    'at takwir':81,'at-takwir':81,
    'al infitar':82,'al-infitar':82,
    'al mutaffifin':83,'al-mutaffifin':83,'al muthaffifin':83,'al-muthaffifin':83,
    'al insyiqaq':84,'al-insyiqaq':84,
    'al buruj':85,'al-buruj':85,
    'at tariq':86,'at-tariq':86,
    'al ala':87,'al-ala':87,
    'al gasyiyah':88,'al-gasyiyah':88,'al ghasyiyah':88,'al-ghasyiyah':88,
    'al fajr':89,'al-fajr':89,
    'al balad':90,'al-balad':90,
    'asy syams':91,'asy-syams':91,
    'al lail':92,'al-lail':92,
    'ad duha':93,'ad-duha':93,'ad dhuha':93,'ad-dhuha':93,'adh dhuha':93,'adh-dhuha':93,
    'al insyirah':94,'al-insyirah':94,'asy syarh':94,
    'at tin':95,'at-tin':95,
    'al alaq':96,'al-alaq':96,
    'al qadr':97,'al-qadr':97,
    'al bayyinah':98,'al-bayyinah':98,
    'az zalzalah':99,'az-zalzalah':99,
    'al adiyat':100,'al-adiyat':100,
    'al qariah':101,'al-qariah':101,
    'at takasur':102,'at-takasur':102,
    'al asr':103,'al-asr':103,
    'al humazah':104,'al-humazah':104,
    'al fil':105,'al-fil':105,
    'quraisy':106,
    'al maun':107,'al-maun':107,
    'al kausar':108,'al-kausar':108,
    'al kafirun':109,'al-kafirun':109,
    'an nasr':110,'an-nasr':110,
    'al lahab':111,'al-lahab':111,'al masad':111,
    'al ikhlas':112,'al-ikhlas':112,
    'al falaq':113,'al-falaq':113,
    'an nas':114,'an-nas':114,
};

// Daftar kata kunci sumber hadist yang dikenali
const HADITH_KEYWORDS = [
    'bukhari','shahih bukhari','sahih bukhari',
    'muslim','shahih muslim','sahih muslim',
    'abu daud','abu dawud',
    'tirmidzi','at tirmidzi','at-tirmidzi',
    'nasai','an nasai','an-nasai',
    'ibnu majah','ibnu majjah',
    'ahmad','musnad ahmad',
    'al baihaqi','al-baihaqi',
    'al hakim','al-hakim',
    'al baghawi','al-baghawi',
    'al-adab al-mufrad','adab al mufrad',
    'ibnu hibban',
    'ibnu khuzaimah',
    'darimi','ad darimi',
    'al thabrani','at-thabrani',
    'ibnu rajab','ibnu taimiyyah','ibnul qayyim',
];

// ─── Helper Functions ────────────────────────────────────────────────────────

function stripHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function readingTime(html) {
    const words = stripHtml(html).trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return `${minutes} mnt`;
}

// Normalisasi tanggal ke format singkat Indonesia
function normalizeDate(dateStr) {
    if (!dateStr) return '';
    const s = dateStr.trim();
    const monthMap = {
        jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'Mei', jun: 'Jun',
        jul: 'Jul', aug: 'Agu', sep: 'Sep', oct: 'Okt', nov: 'Nov', dec: 'Des',
        january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', june: 'Jun',
        july: 'Jul', august: 'Agu', september: 'Sep', october: 'Okt', november: 'Nov', december: 'Des',
        januari: 'Jan', februari: 'Feb', maret: 'Mar', mei: 'Mei', juni: 'Jun',
        juli: 'Jul', agustus: 'Agu', september2: 'Sep', oktober: 'Okt', desember: 'Des',
    };
    let match = s.match(/^(\d{1,2})[- ](\w+)[, -]+(\d{4})$/);
    if (match) {
        const m = monthMap[match[2].toLowerCase()];
        return m ? `${match[1]} ${m} ${match[3]}` : s;
    }
    match = s.match(/^(\w+)\s+(\d{1,2}),?\s*(\d{4})$/);
    if (match) {
        const m = monthMap[match[1].toLowerCase()];
        return m ? `${match[2]} ${m} ${match[3]}` : s;
    }
    try {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    } catch {}
    return s;
}

// Cek apakah thumbnail valid
function isValidThumb(thumb) {
    if (!thumb) return false;
    if (thumb.startsWith('data:image') && thumb.length < 500) return false;
    if (thumb.length < 20) return false;
    if (thumb.includes('printfriendly')) return false;
    if (thumb.match(/Ads-Banner|banner|iklan|ads-/i)) return false;
    if (!thumb.startsWith('http') && !thumb.startsWith('/')) return false;
    return true;
}

// Pastikan URL gambar absolut
function toAbsoluteUrl(url, baseUrl) {
    if (!url || url.startsWith('http') || url.startsWith('data:')) return url;
    try {
        return new URL(url, baseUrl).href;
    } catch {
        if (url.startsWith('/')) return baseUrl.replace(/\/$/, '') + url;
        return baseUrl.replace(/\/$/, '') + '/' + url;
    }
}

// Deteksi apakah teks didominasi karakter Arab
function isArabicDominant(text) {
    if (!text || !text.trim()) return false;
    // Hapus semua HTML tags untuk menghitung teks bersih
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
    const arabicChars = (cleanText.match(arabicPattern) || []).length;
    const totalChars = cleanText.replace(/\s/g, '').length;
    // Anggap dominan Arab jika > 40% karakter adalah Arab DAN minimal ada 5 karakter Arab (menghindari false positive pada teks campur pendek)
    return totalChars > 0 && (arabicChars / totalChars > 0.4) && arabicChars >= 5;
}

// ─── Deteksi & Injeksi Kutipan Quran / Hadist ──────────────────────────────

function findSurahNumber(name) {
    if (!name) return null;
    const normalized = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (SURAH_MAP[normalized]) return SURAH_MAP[normalized];
    const noSpace = normalized.replace(/\s/g, '');
    if (SURAH_MAP[noSpace]) return SURAH_MAP[noSpace];
    const noDash = normalized.replace(/-/g, ' ');
    if (SURAH_MAP[noDash]) return SURAH_MAP[noDash];
    return null;
}

// Proses text node dalam DOM yang sudah dirender — bungkus QS. dan HR. dengan chip
function injectCitationLinks(container) {
    if (!container) return;

    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName.toUpperCase();
                if (['SCRIPT', 'STYLE', 'CODE', 'PRE', 'A'].includes(tag)) return NodeFilter.FILTER_REJECT;
                if (parent.hasAttribute('data-citation-done')) return NodeFilter.FILTER_REJECT;
                const text = node.nodeValue || '';
                if (!text.includes('QS') && !text.includes('HR.') && !text.includes('Riwayat')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(textNode => {
        const text = textNode.nodeValue || '';
        const parent = textNode.parentElement;
        if (!parent) return;

        // Regex toleransi tinggi untuk format QS dan HR (ditambahkan backtick)
        const COMBINED = /(?:((?:Q\.?S\.?|Qs\.?)\s+([A-Za-z'\u2018\u2019\`\u00C0-\u024F][A-Za-z '\u2018\u2019\`\u00C0-\u024F-]{2,30})\s*(?:ayat|:|(?:\[\d+\])?:?)\s*(\d{1,3}(?:[-\u2013\u2014]\d{1,3})?))|((?:H\.?R\.?|Hr\.?)[ \u00A0]*([A-Za-z][A-Za-z .'`-]{2,50}?)(?=[,;.)"'\s]|$)))/ig;

        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let hasMatch = false;
        let m;

        while ((m = COMBINED.exec(text)) !== null) {
            const matchStr = m[0];
            const start = m.index;

            if (start > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
            }

            const chip = document.createElement('span');

            if (m[1]) {
                // QS kutipan
                const qsInner = matchStr.match(/(?:Q\.?S\.?|Qs\.?)\s+(.+?)\s*(?:ayat|:|(?:\[\d+\])?:?)\s*(\d{1,3})/i);
                const surahName = qsInner?.[1]?.trim() || '';
                const ayatNum  = parseInt(qsInner?.[2] || '1');
                const surahNum = findSurahNumber(surahName);

                chip.className = 'citation-chip citation-quran';
                chip.textContent = matchStr.trim();
                chip.setAttribute('data-citation-type', 'quran');
                if (surahNum) {
                    chip.setAttribute('data-surah', surahNum);
                    chip.setAttribute('data-ayat', ayatNum);
                    chip.title = `Buka ${matchStr.trim()} di halaman Al-Qur\u2019an`;
                } else {
                    chip.classList.add('citation-quran--nf');
                }
            } else if (m[2]) {
                // HR kutipan
                chip.className = 'citation-chip citation-hadith';
                chip.textContent = matchStr.trim();
                chip.setAttribute('data-citation-type', 'hadith');
                chip.title = 'Buka halaman Hadist';
            }

            fragment.appendChild(chip);
            lastIndex = start + matchStr.length;
            hasMatch = true;
        }

        if (!hasMatch) return;
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        parent.setAttribute('data-citation-done', '1');
        parent.replaceChild(fragment, textNode);
    });
}

function processContent(html, sourceUrl) {
    if (!html) return '';

    // 1. Sanitasi dasar HTML
    let processed = html
        .replace(/&nbsp;/g, ' ')
        // Ubah h1 menjadi h2 agar konten dan ID tidak hilang, tapi hierarki tetap rapi
        .replace(/<h1(\s[^>]*)?>/gi, '<h2$1>')
        .replace(/<\/h1>/gi, '</h2>')
        // Hapus elemen junk dari WordPress/KS
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<div[^>]*class="[^"]*tptn_counter[^"]*"[^>]*>.*?<\/div>/gis, '')
        .replace(/<div[^>]*class="[^"]*post-views[^"]*"[^>]*>.*?<\/div>/gis, '')
        .replace(/<div[^>]*class="[^"]*code-block[^"]*"[^>]*>.*?<\/div>/gis, '')
        // Hapus br berlebih khas Firanda Gutenberg
        .replace(/<\/p>\s*<br\s*\/?>\s*<p/gi, '</p><p')
        .replace(/<br\s*\/?>\s*(<\/?(?:p|div|h[1-6]|ul|ol|li|blockquote))/gi, '$1')
        // Hapus atribut class WordPress
        .replace(/\s+class="wp-block-[^"]*"/gi, '')
        .replace(/\s+class="[^"]*wp-block[^"]*"/gi, '')
        // Hapus atribut style inline (akan diproses ulang)
        .replace(/\s+style="[^"]*"/gi, '')
        .replace(/\s+width="[^"]*"/gi, '')
        .replace(/\s+height="[^"]*"/gi, '')
        // Hapus link catatan kaki internal
        .replace(/<a\s+href="#_ftn[^"]*"[^>]*>(.*?)<\/a>/gi, '<sup class="artikel-fn">$1</sup>')
        .replace(/<a\s+id="_ftn[^"]*"[^>]*>/gi, '<span ')
        // Hapus paragraf kosong
        .replace(/<p[^>]*>\s*<\/p>/gi, '')
        .replace(/<br\s*\/?>\s*<br\s*\/?>\s*<br\s*\/?>/gi, '<br>')
        .replace(/<br\s*\/?>\s*<br\s*\/?>(?=\s*<br)/gi, '<br>');

    // 2. Parse DOM untuk proses lanjutan
    try {
        const doc = new DOMParser().parseFromString(processed, 'text/html');
        const inlineElements = new Set(['A', 'SPAN', 'STRONG', 'EM', 'B', 'I', 'U', 'SUP', 'SUB', 'CITE']);

        // 3. Bersihkan ez-toc-section span (Muslim.or.id) dan pindahkan ID span ke heading (Rumaysho dll)
        doc.querySelectorAll('span.ez-toc-section, span.ez-toc-section-end').forEach(el => {
            el.replaceWith(...el.childNodes);
        });
        
        doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
            const spanWithId = h.querySelector('span[id]');
            if (spanWithId && !h.id) {
                h.id = spanWithId.id;
                spanWithId.removeAttribute('id');
            }
        });

        // 4. Proses semua link
        const sourceDomain = sourceUrl ? new URL(sourceUrl).hostname : '';
        doc.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href') || '';

            if (href.startsWith('#')) {
                // Anchor link → tandai sebagai anchor
                a.setAttribute('data-link-type', 'anchor');
                return;
            }

            try {
                const linkUrl = new URL(href, sourceUrl || 'https://example.com');
                const linkDomain = linkUrl.hostname;

                if (sourceDomain && (linkDomain === sourceDomain || linkDomain.endsWith('.' + sourceDomain))) {
                    const path = linkUrl.pathname.toLowerCase();
                    const isNonArticle = path === '/' || path.match(/\/(tag|category|kategori|author|penulis|page)(\/|$)/);
                    
                    if (isNonArticle) {
                        a.setAttribute('data-link-type', 'external');
                        a.setAttribute('target', '_blank');
                        a.setAttribute('rel', 'noopener noreferrer');
                        a.setAttribute('href', linkUrl.href); // Pastikan href absolut agar tidak nyasar ke localhost
                    } else {
                        // Link ke sumber yang sama → buka di dalam app
                        a.setAttribute('data-link-type', 'internal');
                        a.setAttribute('data-link-url', linkUrl.href);
                        a.setAttribute('href', '#'); // Cegah hover dan open in new tab nyasar ke localhost
                    }
                } else {
                    // Link ke sumber lain → tandai sebagai eksternal
                    a.setAttribute('data-link-type', 'external');
                    a.setAttribute('target', '_blank');
                    a.setAttribute('rel', 'noopener noreferrer');
                }
            } catch {
                a.setAttribute('data-link-type', 'external');
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            }
        });

        // 4.5 Proses Gambar (Jadikan absolut & filter iklan)
        doc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
            const parentA = img.closest('a');
            const linkHref = parentA ? (parentA.getAttribute('href') || '') : '';
            
            // Indikator iklan:
            const isAd = src.match(/banner|iklan|ads|promo/i) || 
                         linkHref.match(/wa\.me|api\.whatsapp|nurramadhan|shopee|tokopedia/i) ||
                         img.closest('.widget, .ad-container, .advertisement, [id*="ad-"]');
            
            if (isAd) {
                const parent = img.closest('p, figure, div');
                if (parent && parent !== doc.body && parent.textContent.trim() === '') parent.remove();
                else img.remove();
                if (parentA) parentA.remove();
                return;
            }

            if (src) {
                img.setAttribute('src', toAbsoluteUrl(src, sourceUrl));
                img.removeAttribute('srcset'); // Hindari loading srcset relatif dari WP
                img.setAttribute('class', 'rounded-xl my-4 max-w-full h-auto mx-auto shadow-sm');
                // Hapus parent link jika itu mengarah ke file gambar yang sama (agar tidak bisa diklik)
                if (parentA && parentA.getAttribute('href') === src) {
                    parentA.replaceWith(img);
                }
            }
        });

        // 5. Deteksi Arabic dan set dir=rtl
        const blockTags = doc.body.querySelectorAll('p, div, blockquote, li');
        blockTags.forEach(el => {
            // Cegah duplikasi class jika parent-nya sudah diberi style arab (mencegah kotak ganda)
            if (el.parentElement && el.parentElement.closest('.artikel-arab')) return;

            // Gunakan innerHTML lalu buang tag-nya agar perhitungan lebih akurat meski ada tag formatting di dalamnya
            if (isArabicDominant(el.innerHTML)) {
                el.setAttribute('dir', 'rtl');
                // Tidak pakai inline style lagi, pakai class
                el.classList.add('artikel-arab');
            }
        });

        return doc.body.innerHTML;
    } catch {
        return processed;
    }
}

// ─── Scroll Progress Bar ─────────────────────────────────────────────────────

function ScrollProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const container = document.getElementById('artikel-scroll-container');
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const total = scrollHeight - clientHeight;
            if (total <= 0) return;
            setProgress(Math.min(100, (scrollTop / total) * 100));
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="fixed top-0 left-0 right-0 z-[110] h-1 bg-transparent">
            <div
                className="h-full bg-emerald-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ArtikelDetail() {
    const { sourceId, articleId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const listArticle = location.state?.article || {};
    const contentRef = useRef(null);

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [imgError, setImgError] = useState(false);

    const source = SOURCES.find(s => s.id === sourceId) || SOURCES[0];

    const fetchDetail = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setImgError(false);

            let finalArticleId = articleId;
            let decodedOriginalUrl = '';
            try {
                const decoded = atob(articleId);
                decodedOriginalUrl = decoded;
                if (decoded.startsWith('/')) {
                    const sourceUrl = SOURCES.find(s => s.id === sourceId)?.url || '';
                    if (sourceUrl) {
                        finalArticleId = btoa(sourceUrl + decoded);
                        decodedOriginalUrl = sourceUrl + decoded;
                    }
                } else if (decoded.startsWith('http')) {
                    decodedOriginalUrl = decoded;
                }
            } catch {}

            let detailData = null;

            if (decodedOriginalUrl) {
                // Bypass backend API for ALL sources to prevent stripped html tags
                // Use proxy to avoid CORS
                let proxyUrl = `/proxy/${sourceId}${new URL(decodedOriginalUrl).pathname}`;
                
                // timeout dikembalikan ke 15 detik karena proxy lokal sangat cepat
                const res = await fetchWithTimeout(proxyUrl, 15000);
                if (!res.ok) throw new Error('Gagal mengambil artikel dari sumber asli');
                const html = await res.text();
                
                const doc = new DOMParser().parseFromString(html, 'text/html');
                
                // Generalized selectors for title
                const titleNode = doc.querySelector('.entry-title, h1.title, h1.entry-title, head title');
                
                // Generalized selectors for content (PRIORITIZE SPECIFIC ONES FIRST)
                const contentNode = doc.querySelector('.entry-content') 
                                 || doc.querySelector('.post-content') 
                                 || doc.querySelector('.td-post-content') 
                                 || doc.querySelector('article .content') 
                                 || doc.querySelector('article')
                                 || doc.querySelector('main')
                                 || doc.querySelector('#main')
                                 || doc.body;
                
                if (!contentNode) throw new Error('Konten artikel tidak ditemukan di halaman aslinya');
                
                // --- UNIVERSAL CLEANER (READER VIEW MODE) ---
                // Hapus script, style, noscript, form, link, iframe iklan
                doc.querySelectorAll('script, style, noscript, link, form').forEach(el => el.remove());
                doc.querySelectorAll('iframe').forEach(el => {
                    if (!el.src || (!el.src.includes('youtube.com') && !el.src.includes('youtu.be'))) {
                        el.remove();
                    }
                });

                // Hapus atribut style bawaan (inline-style) agar 100% patuh pada CSS Jurnal Ibadah
                contentNode.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));

                // Hapus Native TOC (karena kita punya TOC sendiri)
                doc.querySelectorAll('#ez-toc-container, .toc_container, .ez-toc-v2_container, .tdc-toc').forEach(el => el.remove());
                
                // Hapus Related Posts & Pencarian
                doc.querySelectorAll('.yarpp-related, .jp-relatedposts, .crp_related, .rp4wp-related-posts, .related-posts, .similiar-posts, .search-form, .widget_search, .widget').forEach(el => el.remove());
                
                // Hapus text atau blok dengan icon 🔍 (Pencarian Terkait)
                contentNode.querySelectorAll('p, div, span, li').forEach(el => {
                    if (el.textContent.includes('🔍')) {
                        el.remove();
                    }
                });
                
                // Hapus gambar iklan di dalam konten berdasarkan URL atau link parent-nya
                contentNode.querySelectorAll('img').forEach(img => {
                    const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazyload') || '';
                    const parentA = img.closest('a');
                    const linkHref = parentA ? (parentA.getAttribute('href') || '') : '';
                    const isAd = src.match(/Ads-Banner|ads-banner|banner-\d|Ramadan.*\d{4}H|printfriendly/i) ||
                                 linkHref.match(/bit\.ly|wa\.me|api\.whatsapp|tokopedia|shopee|printfriendly/i) ||
                                 img.closest('.stream-item, .newsletter-widget, [id^="tie-block"], [class*="printfriendly"], [id*="printfriendly"]');
                    if (isAd) {
                        const container = img.closest('p, figure, div, a');
                        if (container && container !== contentNode) container.remove();
                        else img.remove();
                    }
                });
                
                // Hapus Sharing Buttons & Print Buttons secara agresif
                doc.querySelectorAll('.sharedaddy, .social-share, .share-buttons, .nc_socialPanel, .heateor_sss_sharing_container, .addtoany_share_save_container, .post-share, .essb_links, [class*="printfriendly"], [id*="printfriendly"], a[href*="printfriendly"]').forEach(el => {
                    const parent = el.closest('p, div');
                    if (parent && parent !== contentNode && parent.textContent.trim().length < 20) {
                        parent.remove(); // Hapus paragraph bungkusnya jika teksnya sedikit
                    } else {
                        el.remove();
                    }
                });
                
                // Hapus Tags & Meta bawah
                doc.querySelectorAll('.tags-links, .post-tags, .tagcloud, .entry-tags, .entry-meta, .post-info').forEach(el => el.remove());
                
                // Hapus Author Box
                doc.querySelectorAll('.author-bio, .author-box, .author-info, .abh_box_business, .vcard').forEach(el => el.remove());
                
                // Hapus Breadcrumbs universal
                doc.querySelectorAll('.yoast-breadcrumb, #breadcrumbs, .breadcrumb, .rank-math-breadcrumb').forEach(el => el.remove());
                
                // Hapus blok promosi/iklan khas Muslimafiyah (stream-item, dll)
                doc.querySelectorAll('.stream-item, .stream-item-below-post-content, .post-tags-modern, .tagcloud, .tie-the-tags, .newsletter-widget, [id^="tie-block"]').forEach(el => el.remove());
                
                // Hapus blok widget/sidebar yang nyasar ke dalam entry-content
                contentNode.querySelectorAll('aside, .sidebar, .widget-area').forEach(el => el.remove());
                
                // Clean up specific elements for Rumaysho
                if (sourceId === 'rum') {
                    // Remove top header image (usually ad)
                    const firstImg = contentNode.querySelector('img');
                    if (firstImg) {
                        const parent = firstImg.closest('p, figure, div');
                        if (parent && parent !== contentNode && parent.textContent.trim() === '') {
                            parent.remove();
                        } else {
                            firstImg.remove();
                        }
                    }

                    // Remove specific ads (e.g., nurramadhan_wisata)
                    contentNode.querySelectorAll('a').forEach(a => {
                        const href = a.href || '';
                        if (href.includes('nurramadhan_wisata') || href.includes('instagram.com/nurramadhan')) {
                            const parent = a.closest('p, div, blockquote');
                            if (parent && parent !== contentNode) parent.remove();
                            else a.remove();
                        }
                    });

                    // Sometimes breadcrumbs or tags are just in plain paragraphs or spans
                    contentNode.querySelectorAll('p, div, span, strong, b, h1, h2, h3, h4, h5, h6').forEach(el => {
                        const txt = el.textContent.trim();
                        if (txt.startsWith('Home /') || txt.startsWith('Home/Belajar Islam') || txt === 'Tags' || txt.startsWith('Tags:')) {
                            el.remove();
                        }
                    });
                }
                
                // Clean up title 
                let pageTitle = titleNode ? titleNode.textContent.trim() : '';
                pageTitle = pageTitle.replace(/\s*[-–—|]\s*Rumaysho.*/i, '')
                                     .replace(/\s*[-–—|]\s*Konsultasi.*/i, '')
                                     .replace(/\s*[-–—|]\s*Muslim.*/i, '')
                                     .replace(/\s*[-–—|]\s*Firanda.*/i, '')
                                     .replace(/\s*[-–—|]\s*Khotbah.*/i, '');
                
                let thumb = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
                if (!thumb) {
                    // Try data-main-img first (Jannah theme lazy-load attribute)
                    const mainImg = doc.querySelector('[data-main-img="1"]');
                    if (mainImg) {
                        thumb = mainImg.getAttribute('data-src') || mainImg.getAttribute('src') || '';
                    }
                }
                if (!thumb) {
                    // Fallback: post-thumbnail or featured image
                    const thumbEl = doc.querySelector('.post-thumbnail img, .entry-thumbnail img, .post-featured-image img, .featured-image img');
                    if (thumbEl) {
                        thumb = thumbEl.getAttribute('data-src') || thumbEl.getAttribute('src') || '';
                    }
                }
                // Filter out ads/banners from thumbnail
                if (thumb && (thumb.match(/Ads-Banner|banner|iklan|ads-|printfriendly/i) || thumb.startsWith('data:'))) {
                    thumb = '';
                }
                
                detailData = {
                    title: pageTitle,
                    content_html: contentNode.innerHTML,
                    source: sourceId,
                    id: decodedOriginalUrl,
                    author: doc.querySelector('.author, .post-author, .td-post-author-name, .vcard')?.textContent.trim() || source?.name || 'Penulis',
                    date: doc.querySelector('.date, .post-date, .td-post-date, time.entry-date, time')?.textContent.trim() || '',
                    thumbnail: thumb || ''
                };
            } else {
                throw new Error('URL Artikel tidak valid');
            }
            
            setDetail(detailData);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [articleId, sourceId]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    // Update document title
    useEffect(() => {
        const docTitle = detail?.title || listArticle?.title;
        if (docTitle) {
            document.title = `${docTitle} - Jurnal Ibadah`;
        }
        return () => { document.title = 'Jurnal Ibadah'; };
    }, [detail, listArticle]);

    const handleBack = () => {
        if (navigator.vibrate) navigator.vibrate(8);
        navigate(-1);
    };

    const handleShare = async () => {
        if (navigator.vibrate) navigator.vibrate(8);
        const shareTitle = detail?.title || listArticle.title || 'Artikel Islam';
        try {
            if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: `Baca artikel: ${shareTitle}`,
                    url: window.location.href
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('Tautan artikel berhasil disalin ke clipboard!');
            }
        } catch {}
    };

    // ─── Intercept link & kutipan clicks dalam konten artikel ─────────────────────────
    useEffect(() => {
        const el = contentRef.current;
        if (!el || !detail?.content_html) return;

        // Injeksi markup kutipan (QS. & HR.)
        injectCitationLinks(el);

        const handleClick = (e) => {
            // Handle klik kutipan Al-Quran / Hadist
            const citation = e.target.closest('.citation-chip');
            if (citation) {
                const type = citation.getAttribute('data-citation-type');
                if (type === 'quran') {
                    const surah = citation.getAttribute('data-surah');
                    const ayat = citation.getAttribute('data-ayat');
                    if (surah) {
                        navigate('/quran', { state: { surah: parseInt(surah), ayat: parseInt(ayat) } });
                    }
                } else if (type === 'hadith') {
                    // Ekstrak nama rawi/perawi untuk pencarian (opsional)
                    navigate('/hadith');
                }
                return;
            }

            // Handle klik toggle TOC Rumaysho (lwptoc)
            const tocToggle = e.target.closest('.lwptoc_toggle_label');
            if (tocToggle) {
                e.preventDefault();
                const container = e.target.closest('.lwptoc_i');
                if (container) {
                    const items = container.querySelector('.lwptoc_items');
                    if (items) {
                        items.classList.toggle('lwptoc_items-visible');
                        if (items.style.display === 'none') {
                            items.style.display = 'block';
                            tocToggle.innerText = 'tutup';
                        } else {
                            items.style.display = 'none';
                            tocToggle.innerText = 'buka';
                        }
                    }
                }
                return;
            }

            // Handle klik link artikel
            const link = e.target.closest('a[data-link-type]');
            if (!link) return;

            const linkType = link.getAttribute('data-link-type');

            if (linkType === 'anchor') {
                // Smooth scroll ke anchor dalam halaman
                e.preventDefault();
                const targetId = link.getAttribute('href')?.replace('#', '');
                if (!targetId) return;
                
                // Cari elemen target (coba beberapa metode selector yang aman)
                let target = document.getElementById(targetId);
                if (!target) {
                    try { target = el.querySelector(`[id="${targetId}"]`); } catch(e){}
                }
                if (!target) {
                    try { target = el.querySelector(`[id="${decodeURIComponent(targetId)}"]`); } catch(e){}
                }
                
                // Fallback 3: Cari berdasarkan teks judul
                if (!target) {
                    const label = link.querySelector('.lwptoc_item_label, .ez-toc-section');
                    const textStr = label ? label.textContent.trim() : link.textContent.trim();
                    const cleanText = textStr.replace(/^[\d.\s]+/, '').trim(); // Hapus nomor di awal
                    if (cleanText.length > 5) {
                        const headings = Array.from(el.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                        target = headings.find(h => h.textContent.includes(cleanText));
                    }
                }
                
                if (target) {
                    const scrollContainer = document.getElementById('artikel-scroll-container');
                    if (scrollContainer) {
                        const headerOffset = 80;
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const elementRect = target.getBoundingClientRect();
                        
                        const scrollTop = scrollContainer.scrollTop;
                        const relativeTop = elementRect.top - containerRect.top;
                        const targetTop = Math.max(0, scrollTop + relativeTop - headerOffset);
                        
                        try {
                            scrollContainer.scrollTo({ top: targetTop, behavior: 'smooth' });
                        } catch(e) {
                            scrollContainer.scrollTop = targetTop; // Fallback untuk browser lama
                        }
                    } else {
                        try {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } catch(e) {
                            target.scrollIntoView();
                        }
                    }
                }
                return;
            }

            if (linkType === 'internal') {
                // Buka artikel sumber yang sama di dalam app
                e.preventDefault();
                const linkUrl = link.getAttribute('data-link-url');
                if (!linkUrl) return;

                // Encode URL sebagai article ID (sama dengan cara API)
                const encodedId = btoa(linkUrl);
                navigate(`/artikel/${sourceId}/${encodeURIComponent(encodedId)}`, {
                    state: { article: { title: link.textContent?.trim() || '', url: linkUrl } }
                });
            }
            // external links: biarkan browser buka tab baru
        };

        el.addEventListener('click', handleClick);
        return () => el.removeEventListener('click', handleClick);
    }, [detail, sourceId, navigate]);


    if (loading) {
        return (
            <div className="app-view active absolute inset-0 z-50 overflow-hidden bg-slate-50 dark:bg-slate-950">
                <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/8 to-transparent pointer-events-none z-0" />
                <div className="sticky top-0 z-[100] px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                    <div className="relative flex items-center justify-between p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                        <button onClick={handleBack} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <p className="text-sm font-black text-slate-800 dark:text-white flex-1 text-center px-2 truncate">Memuat...</p>
                        <div className="w-10" />
                        <ScrollProgress />
                    </div>
                </div>
                <div className="px-4 pt-2 pb-16 w-full max-w-3xl mx-auto md:px-8 mt-4">
                    <div className="w-full h-52 rounded-2xl bg-slate-200 dark:bg-slate-800/60 animate-pulse mb-6" />
                    <div className="mb-6 space-y-3">
                        <div className="h-8 bg-slate-200 dark:bg-slate-800/60 rounded-xl w-full animate-pulse" />
                        <div className="h-8 bg-slate-200 dark:bg-slate-800/60 rounded-xl w-4/5 animate-pulse" />
                        <div className="flex gap-2 mt-4">
                            <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800/60 rounded-full animate-pulse" />
                            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800/60 rounded-full animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={`h-4 bg-slate-200 dark:bg-slate-800/60 rounded-lg animate-pulse ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Error State ───────────────────────────────────────────────────────
    if (error || !detail) {
        return (
            <div className="app-view active flex flex-col h-full absolute inset-0 z-50 overflow-hidden bg-slate-50 dark:bg-slate-950">
                <div className="sticky top-0 z-[100] px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                    <div className="flex items-center p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                        <button onClick={handleBack} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 transition active:scale-90">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <p className="text-sm font-black text-slate-800 dark:text-white flex-1 text-center px-2">Gagal Memuat</p>
                        <div className="w-10" />
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Gagal memuat artikel</p>
                    <p className="text-xs text-slate-400 mt-2 mb-6">{error}</p>
                    <button onClick={fetchDetail} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition shadow-sm">
                        <RefreshCw className="w-4 h-4" /> Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    // ─── Resolve Data (always prefer detail, fallback to listArticle) ───────
    const title   = (detail.title   || listArticle.title   || '').trim();
    const date    = normalizeDate(detail.date || listArticle.date || '');
    const author  = (detail.author  || listArticle.author  || source.name).trim();
    const category = detail.categories?.[0]?.name || listArticle.categories?.[0]?.name || '';
    const articleUrl = detail.url || listArticle.url || '';
    const rt = readingTime(detail.content_html || '');

    // Resolve thumbnail (Prioritaskan gambar dari listArtikel agar persis sama dengan halaman depan)
    let thumb = listArticle.thumbnail || detail.thumbnail;
    if (!isValidThumb(thumb)) thumb = null;
    if (thumb) thumb = toAbsoluteUrl(thumb, source.url);

    // Jika masih tidak ada, cari dari konten dengan mengecek path tanggal upload
    if (!thumb) {
        // Dapatkan YYYY/MM dari tanggal asli (sebelum dinormalisasi)
        let datePath = null;
        const rawDate = detail.date_time || detail.date || listArticle.date_time || listArticle.date;
        if (rawDate) {
            try {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    datePath = `/${y}/${m}/`;
                }
            } catch {}
        }

        const imgMatches = [...(detail.content_html || '').matchAll(/<img[^>]+src="([^">]+)"/ig)];
        for (const match of imgMatches) {
            const candidate = toAbsoluteUrl(match[1], source.url);
            if (isValidThumb(candidate)) {
                // Jika dari WordPress (mengandung wp-content/uploads), pastikan tanggal sesuai
                if (candidate.includes('wp-content/uploads')) {
                    if (datePath && candidate.includes(datePath)) {
                        thumb = candidate;
                        break;
                    }
                } else {
                    // Jika bukan dari wp-content/uploads, pakai saja (bisa jadi image eksternal)
                    thumb = candidate;
                    break;
                }
            }
        }
    }

    // Pengecualian: hilangkan gambar header/thumbnail untuk Rumaysho (seringkali banner iklan/donasi)
    if (sourceId === 'rum') {
        thumb = null;
    }

    const content = processContent(detail.content_html || '', source.url);

    return (
        <div
            id="artikel-scroll-container"
            className="app-view active absolute inset-0 z-50 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950 no-scrollbar"
        >
            {/* Background gradient */}
            <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/8 via-emerald-500/4 to-transparent pointer-events-none z-0" />

            {/* ─── Sticky Header ─── */}
            <div className="sticky top-0 z-[100] px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <div className="relative flex items-center p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button onClick={handleBack} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group shrink-0">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <p className="text-sm font-black text-slate-800 dark:text-white flex-1 text-center px-2 truncate">Baca Artikel</p>
                    <button onClick={handleShare} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group shrink-0" title="Bagikan Artikel">
                        <Share2 className="w-[18px] h-[18px] group-hover:scale-110 transition" />
                    </button>
                    <ScrollProgress />
                </div>
            </div>

            {/* ─── Content ─── */}
            <div className="relative z-10 px-4 pt-2 pb-24 w-full max-w-3xl mx-auto md:px-8 mt-2">

                {/* Thumbnail */}
                {thumb && !imgError && (
                    <div className="w-full rounded-2xl overflow-hidden mb-6 shadow-md bg-slate-100 dark:bg-slate-800/50">
                        <img
                            src={thumb}
                            alt={title}
                            className="w-full h-auto"
                            onError={() => setImgError(true)}
                        />
                    </div>
                )}

                {/* Title & Meta */}
                <div className="mb-6">
                    {/* Category badge */}
                    {category && (
                        <div className="mb-3 inline-flex items-center gap-1.5">
                            <span
                                className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                                style={{ background: `${source.accent}15`, color: source.accent }}
                            >
                                <Tag className="w-2.5 h-2.5" />
                                {category}
                            </span>
                        </div>
                    )}

                    <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-snug tracking-tight">
                        {title}
                    </h1>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <div
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold text-white ${source.iconImg ? 'overflow-hidden' : ''}`}
                            style={{ background: source.accent }}
                        >
                            {source.iconImg ? (
                                <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-white p-[1px] shrink-0">
                                    <img src={source.iconImg} alt={source.name} className="w-full h-full object-contain mix-blend-normal" />
                                </div>
                            ) : (
                                <span>{source.icon}</span>
                            )}
                            <span>{source.name}</span>
                        </div>

                        {date && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                <Clock className="w-3 h-3" /> {date}
                            </span>
                        )}

                        <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800 shadow-sm font-medium ml-auto">
                            <BookOpen className="w-3 h-3" /> ~{rt} baca
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="mt-5 h-px" style={{ background: `linear-gradient(to right, ${source.accent}50, ${source.accent}10, transparent)` }} />
                </div>

                {/* Article Content */}
                <div
                    ref={contentRef}
                    className="artikel-konten"
                    dangerouslySetInnerHTML={{ __html: content }}
                />

                {/* Footer */}
                <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-center text-[11px] text-slate-400 mb-5">
                        Ditulis oleh <span className="font-semibold" style={{ color: source.accent }}>{author}</span>
                    </p>

                    {/* Read at source button */}
                    {articleUrl && (
                        <a
                            href={articleUrl.startsWith('http') ? articleUrl : source.url + articleUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 text-sm font-bold transition-all hover:shadow-md active:scale-[0.98]"
                            style={{
                                borderColor: `${source.accent}50`,
                                color: source.accent,
                                background: `${source.accent}08`
                            }}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Baca di {source.name}
                        </a>
                    )}

                    <div className="mt-4 pb-6" />
                </div>
            </div>
        </div>
    );
}
