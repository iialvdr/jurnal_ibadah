// src/pages/TanyaQuran.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Send, Sparkles, BookOpen,
    ExternalLink, Copy, Check, RotateCcw, HeartHandshake, Compass,
    Shield, Flame, Lightbulb, ChevronDown, ChevronUp, Bot
} from 'lucide-react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import TopNavConfig from '@/components/TopNavConfig';
import { useApp } from '@/store/AppContext';
import { askQuranAI, getDailyAISuggestions } from '@/services/quranAiService';

const SUGGESTED_PROMPTS = [
    { icon: Compass, text: 'Mengapa hati sering merasa gelisah dan cemas?' },
    { icon: Flame, text: 'Bagaimana cara agar kuat menghadapi cobaan berat?' },
    { icon: Lightbulb, text: 'Konsep rezeki yang berkah menurut Al-Qur\'an' },
    { icon: HeartHandshake, text: 'Bagaimana adab memaafkan orang yang mendzolimi kita?' },
    { icon: Shield, text: 'Ayat perlindungan dari godaan dan bisikan jahat' },
    { icon: BookOpen, text: 'Tips menjaga istiqomah dalam beribadah sehari-hari' }
];
const DAILY_SUGGESTIONS_KEY = 'jurnal_tanya_quran_suggestions';
const DAILY_SUGGESTIONS_ATTEMPT_KEY = 'jurnal_tanya_quran_suggestions_attempt';

function getLocalDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Configure DOMPurify to allow needed tags and dir="rtl" for Arabic calligraphy
const DOMPURIFY_CONFIG = {
    ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr', 'strong', 'em', 'b', 'i',
        'ul', 'ol', 'li',
        'blockquote',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span',
    ],
    ALLOWED_ATTR: ['class', 'style', 'dir'],
};

function formatMarkdown(text) {
    if (!text) return '';

    const lines = text.split('\n');

    // Step A: Parse Blockquotes (Tadabbur, Doa, Doa Penutup)
    const mergedBqLines = [];
    let bqBuffer = [];

    const flushBq = () => {
        if (bqBuffer.length === 0) return;
        const rawContent = bqBuffer.join('\n');

        const arCount = (rawContent.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
        const isArabicDoa = arCount >= 5;

        let badgeTitle = 'Tadabbur & Mutiara Hikmah';
        let badgeIcon = '✨';
        if (rawContent.toLowerCase().includes('doa penutup')) {
            badgeTitle = 'Doa Penutup & Harapan';
            badgeIcon = '🤲';
        } else if (isArabicDoa || rawContent.toLowerCase().includes('doa')) {
            badgeTitle = 'Doa Pilihan';
            badgeIcon = '🤲';
        }

        let htmlBlock = '';
        if (isArabicDoa) {
            // Doa dengan teks Arab dan terjemahan
            const bqLines = rawContent.split('\n');
            let arLines = [];
            let trLines = [];

            bqLines.forEach(bl => {
                const trimmedBl = bl.trim();
                const lArCount = (trimmedBl.match(/[\u0600-\u06FF]/g) || []).length;
                if (lArCount >= 4) {
                    arLines.push(trimmedBl);
                } else if (trimmedBl) {
                    trLines.push(trimmedBl);
                }
            });

            htmlBlock = `<div class="my-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/5 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/20 border border-emerald-500/20 dark:border-emerald-800/30 shadow-xs">
                <div class="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    <span>${badgeIcon}</span><span>${badgeTitle}</span>
                </div>
                ${arLines.length > 0 ? `<p class="font-quran text-xl md:text-2xl text-slate-900 dark:text-emerald-100 leading-[2.5] text-right my-1 select-text" dir="rtl">${arLines.join('<br />')}</p>` : ''}
                ${trLines.length > 0 ? `<p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed mt-2 pt-2 border-t border-emerald-500/10 dark:border-emerald-800/20">${trLines.join('<br />')}</p>` : ''}
            </div>`;
        } else {
            // Tadabbur umum atau doa penutup teks
            htmlBlock = `<div class="my-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-transparent dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-transparent border border-emerald-500/30 dark:border-emerald-800/40 shadow-xs">
                <div class="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                    <span>${badgeIcon}</span><span>${badgeTitle}</span>
                </div>
                <div class="text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic">
                    ${rawContent.replace(/\n/g, '<br />')}
                </div>
            </div>`;
        }

        mergedBqLines.push(`___HTML_BLOCK___${htmlBlock}___HTML_BLOCK_END___`);
        bqBuffer = [];
    };

    for (let l of lines) {
        const trimmed = l.trim();
        if (trimmed.startsWith('>')) {
            bqBuffer.push(trimmed.replace(/^>\s?/, ''));
        } else {
            flushBq();
            mergedBqLines.push(l);
        }
    }
    flushBq();

    // Step B: Tables
    const tableProcessed = [];
    let inTable = false;
    let tableLines = [];

    const flushTable = () => {
        if (tableLines.length === 0) return;
        const mergedRows = [];
        for (let line of tableLines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('|')) {
                mergedRows.push(trimmed);
            } else if (mergedRows.length > 0) {
                mergedRows[mergedRows.length - 1] += '<br />' + trimmed;
            }
        }

        if (mergedRows.length >= 2) {
            const headerRow = mergedRows[0];
            const dividerRow = mergedRows[1];

            const isDivider = /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(dividerRow) || dividerRow.includes('---');

            if (isDivider) {
                const parseCells = (rowStr) => {
                    return rowStr
                        .replace(/^\|/, '')
                        .replace(/\|$/, '')
                        .split('|')
                        .map(c => c.trim());
                };

                const headers = parseCells(headerRow);
                const dataRows = mergedRows.slice(2).map(parseCells);

                const formatCell = (val) => {
                    let formatted = val
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

                    const arMatches = (val.match(/[\u0600-\u06FF]/g) || []).length;
                    if (arMatches >= 4) {
                        formatted = `<div class="font-quran text-lg md:text-xl text-slate-900 dark:text-emerald-100 leading-loose text-right my-1 select-text" dir="rtl">${formatted}</div>`;
                    }
                    return formatted;
                };

                let html = '<div class="table-container my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">';
                html += '<div class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">';
                html += '<span class="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">📊 Rujukan Ayat & Tafsir</span>';
                html += '<span class="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/30">↔ Geser tabel</span>';
                html += '</div>';
                html += '<div class="overflow-x-auto no-scrollbar">';
                html += '<table class="w-full text-left border-collapse text-xs min-w-[560px]">';

                html += '<thead><tr class="bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">';
                headers.forEach(h => {
                    html += `<th class="px-3.5 py-2.5 font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300">${formatCell(h)}</th>`;
                });
                html += '</tr></thead>';

                html += '<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">';
                dataRows.forEach((cols, rIdx) => {
                    const rowBg = rIdx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/20' : '';
                    html += `<tr class="${rowBg} hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">`;
                    headers.forEach((_, cIdx) => {
                        const cellVal = formatCell(cols[cIdx] || '');
                        html += `<td class="px-3.5 py-3 text-slate-700 dark:text-slate-300 leading-relaxed align-top">${cellVal}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody></table></div></div>';

                tableProcessed.push(`___HTML_BLOCK___${html}___HTML_BLOCK_END___`);
                tableLines = [];
                inTable = false;
                return;
            }
        }

        tableProcessed.push(...tableLines);
        tableLines = [];
        inTable = false;
    };

    for (let i = 0; i < mergedBqLines.length; i++) {
        const line = mergedBqLines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('|')) {
            inTable = true;
            tableLines.push(line);
        } else if (inTable) {
            if (trimmed === '' || (!trimmed.includes('|') && !trimmed.startsWith('"') && !trimmed.startsWith('\u201c') && !trimmed.startsWith('('))) {
                flushTable();
                tableProcessed.push(line);
            } else {
                tableLines.push(line);
            }
        } else {
            tableProcessed.push(line);
        }
    }
    if (inTable) flushTable();

    // Step C: Line-by-line formatting
    let processedLines = tableProcessed.map(line => {
        const trimmed = line.trim();
        if (line.includes('___HTML_BLOCK___')) return line;

        // Divider '---'
        if (/^\s*[-*_]{3,}\s*$/.test(trimmed)) {
            return '<div class="my-6 flex items-center gap-3"><div class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-slate-200 dark:to-slate-800"></div><div class="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div><div class="h-px flex-1 bg-gradient-to-r from-slate-200 dark:via-slate-800 to-transparent"></div></div>';
        }

        // Section header ##
        const h2Match = trimmed.match(/^##\s*(.*?)$/);
        if (h2Match) {
            const numberedHeading = h2Match[1].match(/^(\d+)\.\s*(.*)$/);
            const sectionNumber = numberedHeading?.[1];
            const sectionTitle = numberedHeading?.[2] || h2Match[1];
            return `<div class="section-title mt-7 mb-3.5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">${sectionNumber ? `<span class="ai-section-number">${sectionNumber}</span>` : '<span class="w-1.5 h-5 rounded-full bg-emerald-500 shrink-0"></span>'}<h2 class="text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight">${sectionTitle}</h2></div>`;
        }

        // Sub-header ###
        const h3Match = trimmed.match(/^###\s*(.*?)$/);
        if (h3Match) {
            return `<h3 class="text-sm md:text-base font-bold text-emerald-700 dark:text-emerald-400 mt-5 mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span><span>${h3Match[1]}</span></h3>`;
        }

        const titleMatch = trimmed.match(/^\*\*(.+)\*\*$/);
        if (titleMatch) {
            return `<h3 class="ai-answer-title">${titleMatch[1]}</h3>`;
        }

        // Sub-bullet (indented with 2+ spaces)
        const subBulletMatch = line.match(/^\s{2,}[\-\*]\s*(.*)$/);
        if (subBulletMatch) {
            return `<div class="flex items-start gap-2 ml-5 my-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/60 dark:bg-emerald-500/50 mt-1.5 shrink-0"></span><div class="flex-1">${subBulletMatch[1]}</div></div>`;
        }

        // Main bullet
        const bulletMatch = line.match(/^(?:[-•]\s+|\*\s+)(.*)$/);
        if (bulletMatch) {
            return `<div class="flex items-start gap-2.5 mt-3 mb-1 text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed"><span class="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-xs"></span><div class="flex-1">${bulletMatch[1]}</div></div>`;
        }

        // Numbered item: 1. ...
        const numMatch = line.match(/^(\d+)\.\s*(.*)$/);
        if (numMatch) {
            return `<div class="flex items-start gap-2.5 mt-3.5 mb-1.5 text-xs md:text-sm font-bold text-slate-900 dark:text-white leading-relaxed"><span class="w-5 h-5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">${numMatch[1]}</span><div class="flex-1">${numMatch[2]}</div></div>`;
        }

        // Standalone Arabic line outside blocks
        const arCount = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
        if (arCount >= 5) {
            const latinCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
            if (arCount > latinCount) {
                return `<div class="arabic-quote my-3 px-4 py-3 rounded-2xl bg-gradient-to-l from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-transparent border border-emerald-500/20 dark:border-emerald-800/30 text-right shadow-xs"><p class="font-quran text-xl md:text-2xl text-slate-900 dark:text-emerald-100 leading-[2.5] select-text" dir="rtl">${trimmed}</p></div>`;
            }
        }

        return line;
    });

    let processed = processedLines.join('\n');

    // Step D: Re-assemble HTML blocks without unwanted paragraph wrapping
    const regex = /___HTML_BLOCK___([\s\S]*?)___HTML_BLOCK_END___/g;
    let match;
    let lastIdx = 0;
    let finalHtml = '';

    const formatTextBlock = (block) => {
        const output = [];
        let paragraphLines = [];
        const flushParagraph = () => {
            const paragraph = paragraphLines.join(' ').trim();
            if (paragraph) {
                output.push(`<p class="ai-answer-paragraph">${paragraph}</p>`);
            }
            paragraphLines = [];
        };

        block.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                flushParagraph();
            } else if (/^<(?:div|h[1-6]|table|ul|ol|blockquote)\b/i.test(trimmed)) {
                flushParagraph();
                output.push(trimmed);
            } else {
                paragraphLines.push(trimmed);
            }
        });
        flushParagraph();
        return output.join('');
    };

    while ((match = regex.exec(processed)) !== null) {
        const beforeText = processed.substring(lastIdx, match.index);
        finalHtml += formatTextBlock(beforeText);
        finalHtml += match[1];
        lastIdx = regex.lastIndex;
    }
    const afterText = processed.substring(lastIdx);
    finalHtml += formatTextBlock(afterText);

    // Clean up unnecessary <br /> tags immediately around cards and headings
    finalHtml = finalHtml
        .replace(/(?:<br\s*\/?>\s*)+(<div class="my-|<div class="table-container|<div class="section-title|<div class="arabic-quote)/g, '$1')
        .replace(/(<\/div>\s*)(?:<br\s*\/?>\s*)+/g, '$1')
        .replace(/\\\*/g, '')
        .replace(/\*/g, '');

    const template = document.createElement('template');
    template.innerHTML = DOMPurify.sanitize(finalHtml, DOMPURIFY_CONFIG);

    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((textNode) => {
        const content = textNode.textContent;
        const markdownPattern = /\*\*(.+?)\*\*|\*([^*\n]+)\*/g;
        if (!markdownPattern.test(content)) return;
        markdownPattern.lastIndex = 0;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let markdownMatch;
        while ((markdownMatch = markdownPattern.exec(content)) !== null) {
            fragment.append(content.slice(lastIndex, markdownMatch.index));
            const formatted = document.createElement(markdownMatch[1] ? 'strong' : 'em');
            formatted.className = markdownMatch[1]
                ? 'font-bold text-slate-900 dark:text-white'
                : 'italic text-slate-600 dark:text-slate-300';
            formatted.textContent = markdownMatch[1] || markdownMatch[2];
            fragment.append(formatted);
            lastIndex = markdownPattern.lastIndex;
        }
        fragment.append(content.slice(lastIndex));
        textNode.replaceWith(fragment);
    });

    return template.innerHTML;
}

function canShowReferences(message) {
    if (message.hasReference === false) return false;
    const answer = message.content?.normalize('NFKC').toLocaleLowerCase('id-ID') || '';
    return !answer.includes('maaf, saya adalah asisten khusus') &&
        !answer.includes('tidak memiliki data rujukan resmi');
}

export default function TanyaQuran() {
    const navigate = useNavigate();
    const { showAppToast } = useApp(state => ({ showAppToast: state.showAppToast }));
    const [messages, setMessages] = useState(() => {
        try {
            const saved = sessionStorage.getItem('jurnal_tanya_quran_chat');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [input, setInput] = useState('');
    const [suggestionTexts, setSuggestionTexts] = useState(() => SUGGESTED_PROMPTS.map(({ text }) => text));
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [openTafsirMap, setOpenTafsirMap] = useState({});

    // Collapsible states: default collapsed
    const [ayatExpanded, setAyatExpanded] = useState({});
    const [hadisExpanded, setHadisExpanded] = useState({});
    const [doaExpanded, setDoaExpanded] = useState({});

    const scrollContainerRef = useRef(null);
    const latestUserMsgRef = useRef(null);
    const latestAiMsgRef = useRef(null);
    const requestedSuggestionsDateRef = useRef(null);

    const vib = () => { if (navigator.vibrate) navigator.vibrate(10); };

    useEffect(() => {
        try {
            sessionStorage.setItem('jurnal_tanya_quran_chat', JSON.stringify(messages));
        } catch {}
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0) return;

        const date = getLocalDateKey();
        if (requestedSuggestionsDateRef.current === date) return;
        requestedSuggestionsDateRef.current = date;

        try {
            const cached = JSON.parse(localStorage.getItem(DAILY_SUGGESTIONS_KEY) || 'null');
            if (
                cached?.date === date &&
                Array.isArray(cached.suggestions) &&
                cached.suggestions.length === SUGGESTED_PROMPTS.length &&
                cached.suggestions.every((suggestion) => typeof suggestion === 'string')
            ) {
                setSuggestionTexts(cached.suggestions);
                return;
            }
            if (localStorage.getItem(DAILY_SUGGESTIONS_ATTEMPT_KEY) === date) return;
            localStorage.setItem(DAILY_SUGGESTIONS_ATTEMPT_KEY, date);
        } catch {
            // Continue with built-in suggestions if browser storage is unavailable.
        }

        setSuggestionsLoading(true);
        getDailyAISuggestions(date)
            .then((suggestions) => {
                if (
                    suggestions.length !== SUGGESTED_PROMPTS.length ||
                    !suggestions.every((suggestion) => typeof suggestion === 'string')
                ) return;
                setSuggestionTexts(suggestions);
                try {
                    localStorage.setItem(DAILY_SUGGESTIONS_KEY, JSON.stringify({ date, suggestions }));
                } catch {
                    // Keep the generated suggestions in memory for this visit.
                }
            })
            .catch((error) => {
                console.warn('[TanyaQuran] Daily AI suggestions unavailable:', error);
            })
            .finally(() => setSuggestionsLoading(false));
    }, [messages.length]);

    // Precise scroll helper that ONLY scrolls the container, never the window or outer app
    const scrollToElement = useCallback((targetEl) => {
        if (!scrollContainerRef.current || !targetEl) return;
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        // Target relative offset within container
        const relativeTop = targetRect.top - containerRect.top;
        // Keep 85px space for the TopNav so it never covers the text
        const targetScroll = container.scrollTop + relativeTop - 85;

        container.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
        });
    }, []);

    // Controlled scroll on new user question or new AI response
    useEffect(() => {
        if (loading) {
            // User just sent — scroll container so user's message is right below TopNav
            const timer = setTimeout(() => {
                scrollToElement(latestUserMsgRef.current);
            }, 100);
            return () => clearTimeout(timer);
        } else if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'assistant') {
                // AI response arrived — scroll container so AI card starts right below TopNav
                const timer = setTimeout(() => {
                    scrollToElement(latestAiMsgRef.current);
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [loading, messages, scrollToElement]);

    const handleCopy = (id, text) => {
        vib();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        showAppToast('Jawaban berhasil disalin', 'success');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSend = async (textToSend) => {
        const queryText = (textToSend || input).trim();
        if (!queryText || loading) return;

        vib();
        setInput('');
        setAyatExpanded({});
        setHadisExpanded({});
        setDoaExpanded({});
        setOpenTafsirMap({});

        const userMsg = {
            id: 'u_' + Date.now(),
            role: 'user',
            content: queryText
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setLoading(true);
        setLoadingStep('Mencari ayat, hadis, dan doa yang relevan...');

        try {
            const history = messages.slice(-8).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }));

            const result = await askQuranAI({
                query: queryText,
                history,
                onStatusChange: (status) => {
                    setLoadingStep(status.message);
                }
            });

            const botMsg = {
                id: 'b_' + Date.now(),
                role: 'assistant',
                content: result.answer,
                hasReference: result.hasReference,
                references: result.references
            };

            setMessages([...newMessages, botMsg]);
        } catch (err) {
            showAppToast(err.message || 'Gagal memproses pertanyaan', 'error');
            const errorMsg = {
                id: 'err_' + Date.now(),
                role: 'assistant',
                content: 'Mohon maaf, saat ini sedang terjadi kendala saat menghubungkan ke sumber rujukan atau AI. Silakan coba sesaat lagi.'
            };
            setMessages([...newMessages, errorMsg]);
        } finally {
            setLoading(false);
            setLoadingStep('');
        }
    };

    const handleClear = () => {
        vib();
        setMessages([]);
        setAyatExpanded({});
        setHadisExpanded({});
        setDoaExpanded({});
        sessionStorage.removeItem('jurnal_tanya_quran_chat');
        showAppToast('Percakapan dibersihkan', 'info');
    };

    const toggleTafsir = (key) => {
        vib();
        setOpenTafsirMap(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAyat = (msgId) => {
        vib();
        setAyatExpanded(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    const toggleDoa = (msgId) => {
        vib();
        setDoaExpanded(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    const toggleHadis = (msgId) => {
        vib();
        setHadisExpanded(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    const openAyatInQuran = (surahId, ayatNumber) => {
        vib();
        navigate('/quran', { state: { surah: surahId, ayat: ayatNumber } });
    };

    return (
        <div id="tanyaQuranView" className="app-view active h-full w-full bg-slate-100 dark:bg-slate-950 overflow-hidden absolute inset-0 z-40">
            {/* Top Ambient Glow */}
            <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Header Detail Style TopNav */}
            <TopNavConfig
                leftNode={
                    <button
                        onClick={() => { vib(); navigate(-1); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group"
                        title="Kembali"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                }
                titleNode={
                    <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
                            <span className="text-sm font-bold text-slate-800 dark:text-white">Tanya AI Islami</span>
                        </div>
                    </div>
                }
                rightNode={
                    messages.length > 0 ? (
                        <button
                            onClick={handleClear}
                            title="Bersihkan Percakapan"
                            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    ) : <div className="w-10" />
                }
            />

            {/* Scrollable Container */}
            <div
                ref={scrollContainerRef}
                id="tanyaQuranScrollContainer"
                className="absolute inset-0 overflow-y-auto no-scrollbar z-10 flex flex-col"
            >
                {/* Spacer di DALAM scroll container agar posisi awal konten pas di bawah TopNav */}
                <div className="h-[5.5rem] md:h-[7rem] shrink-0 w-full pointer-events-none" />

                {/* Konten Chat & Rekomendasi */}
                <div className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-6 flex flex-col justify-start pb-28 md:pb-32 relative z-10">
                    {messages.length === 0 ? (
                        // Welcome / Hero Screen
                        <div className="my-auto py-6 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
                                    <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
                                        <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                                    <Sparkles className="w-3 h-3" />
                                </div>
                            </div>

                            <div className="space-y-1.5 max-w-sm px-2">
                                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Temukan Jawaban Islami
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Tanyakan kegelisahan atau urusan hidupmu. AI akan mencari ayat, tafsir, hadis, dan doa yang relevan.
                                </p>
                            </div>

                            {/* Suggested Prompts Grid */}
                            <div className="w-full pt-1">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 text-left px-1">
                                    Pertanyaan AI hari ini
                                    {suggestionsLoading && <span className="ml-2 normal-case tracking-normal">• sedang disiapkan</span>}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {suggestionTexts.map((text, idx) => {
                                        const item = SUGGESTED_PROMPTS[idx];
                                        const IconComponent = item.icon;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleSend(text)}
                                                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left flex items-start gap-2.5 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition active:scale-[0.98] shadow-sm group"
                                            >
                                                <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                    <IconComponent className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug flex-1">
                                                    {text}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Messages Stream
                        <div className="space-y-4 py-3">
                            {messages.map((msg, msgIdx) => {
                                const isUser = msg.role === 'user';
                                const isLastUser = isUser && msgIdx === messages.length - 1;
                                const isLastAi = !isUser && msgIdx === messages.length - 1;
                                const isAyatOpen = ayatExpanded[msg.id];
                                const isHadisOpen = hadisExpanded[msg.id];
                                const isDoaOpen = doaExpanded[msg.id];

                                return (
                                    <motion.div
                                        key={msg.id}
                                        ref={isLastUser ? latestUserMsgRef : isLastAi ? latestAiMsgRef : null}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                                    >
                                        {/* User Bubble */}
                                        {isUser ? (
                                            <div className="max-w-[85%] md:max-w-[75%] bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-md">
                                                <p className="text-xs md:text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        ) : (
                                            // AI Card (Clean Solid Background, Premium Islamic Accent)
                                            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-6 shadow-sm space-y-4">
                                                {/* Card Header */}
                                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                                            <Bot className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white leading-tight">Asisten Islami</h4>
                                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Rujukan Al-Qur'an, hadis, dan doa</p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleCopy(msg.id, msg.content)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90"
                                                        title="Salin Jawaban"
                                                    >
                                                        {copiedId === msg.id ? (
                                                            <Check className="w-4 h-4 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>

                                                {/* AI Text Content with Rich HTML Renderer */}
                                                <div
                                                    className="ai-answer-content prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed overflow-x-hidden"
                                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                                                />

                                                {/* Referenced Quran Verses — Collapsible, default collapsed */}
                                                {canShowReferences(msg) && msg.references?.ayat && msg.references.ayat.length > 0 && (
                                                    <div className="pt-2">
                                                        {/* Toggle Header */}
                                                        <button
                                                            onClick={() => toggleAyat(msg.id)}
                                                            aria-expanded={isAyatOpen}
                                                            className="flex items-center justify-between w-full px-3.5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/40 transition active:scale-[0.99]"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                                <span className="text-left text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                                                                    Kutipan Ayat
                                                                    <span className="ml-2 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                                                        {msg.references.ayat.length} sumber
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            {isAyatOpen
                                                                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                                                : <ChevronDown className="w-4 h-4 text-slate-400" />
                                                            }
                                                        </button>

                                                        {/* Expanded Ayat List */}
                                                        {isAyatOpen && (
                                                            <div className="space-y-2 mt-2">
                                                                {msg.references.ayat.map((ayat, aIdx) => {
                                                                    const tafsirKey = `${msg.id}_ayat_${aIdx}`;
                                                                    const isTafsirOpen = openTafsirMap[tafsirKey];

                                                                    return (
                                                                        <div
                                                                            key={aIdx}
                                                                            className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 space-y-2.5"
                                                                        >
                                                                            {/* Surah Header & Actions */}
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                                                                                    QS. {ayat.surahName}: {ayat.ayatNumber}
                                                                                </span>

                                                                                <div className="flex items-center gap-1.5">
                                                                                    <button
                                                                                        onClick={() => openAyatInQuran(ayat.surahId, ayat.ayatNumber)}
                                                                                        className="p-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition text-[10px] font-bold flex items-center gap-1"
                                                                                        title="Buka surah ini di halaman Qur'an"
                                                                                    >
                                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                                        <span>Buka di Qur'an</span>
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Arabic Text */}
                                                                            {ayat.arabic && (
                                                                                <p className="font-quran text-right text-xl md:text-2xl leading-loose text-slate-900 dark:text-white pt-1 select-text" dir="rtl">
                                                                                    {ayat.arabic}
                                                                                </p>
                                                                            )}

                                                                            {/* Latin */}
                                                                            {ayat.latin && (
                                                                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">
                                                                                {ayat.latin}
                                                                                </p>
                                                                            )}

                                                                            {/* Translation */}
                                                                            {ayat.translation && (
                                                                                <div className="rounded-lg bg-white/80 dark:bg-slate-900/70 border border-emerald-100 dark:border-emerald-900/30 p-3">
                                                                                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">Terjemahan</p>
                                                                                    <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                                                                                        “{ayat.translation}”
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            {/* Tafsir Toggle */}
                                                                            {ayat.tafsir && (
                                                                                <div className="pt-0.5">
                                                                                    <button
                                                                                        onClick={() => toggleTafsir(tafsirKey)}
                                                                                        className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                                                                                    >
                                                                                        {isTafsirOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                                        <span>{isTafsirOpen ? 'Tutup ringkasan tafsir' : 'Baca ringkasan tafsir Kemenag'}</span>
                                                                                    </button>

                                                                                    {isTafsirOpen && (
                                                                                        <div className="mt-2 p-3 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border border-emerald-100 dark:border-emerald-900/30">
                                                                                            {ayat.tafsir}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Referenced Hadith Cards — Collapsible, default collapsed */}
                                                {canShowReferences(msg) && msg.references?.hadis && msg.references.hadis.length > 0 && (
                                                    <div className="pt-1">
                                                        <button
                                                            onClick={() => toggleHadis(msg.id)}
                                                            className="flex items-center justify-between w-full px-3.5 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100/80 dark:hover:bg-amber-950/40 transition active:scale-[0.99]"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                                <span className="text-left text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                                                                    Hadis rujukan
                                                                    <span className="ml-2 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                                                        {msg.references.hadis.length} sumber
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            {isHadisOpen
                                                                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                                                : <ChevronDown className="w-4 h-4 text-slate-400" />
                                                            }
                                                        </button>

                                                        {isHadisOpen && (
                                                            <div className="space-y-2 mt-2">
                                                                {msg.references.hadis.map((hadis) => (
                                                                    <div
                                                                        key={hadis.id}
                                                                        className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 space-y-2"
                                                                    >
                                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                                                                Hadis #{hadis.id}
                                                                            </span>
                                                                            {hadis.grade && (
                                                                                <span className="rounded-full bg-white/80 dark:bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                                                                    {hadis.grade}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {hadis.arabic && (
                                                                            <p className="font-quran text-right text-xl md:text-2xl leading-loose text-slate-900 dark:text-white pt-0.5 select-text" dir="rtl">
                                                                                {hadis.arabic}
                                                                            </p>
                                                                        )}
                                                                        <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                                                                            {hadis.translation}
                                                                        </p>
                                                                        {hadis.takhrij && (
                                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 border-t border-amber-200/60 dark:border-amber-800/30 pt-2">
                                                                                {hadis.takhrij}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Referenced Doa Cards — Collapsible, default collapsed */}
                                                {canShowReferences(msg) && msg.references?.doa && msg.references.doa.length > 0 && (
                                                    <div className="pt-1">
                                                        {/* Toggle Header */}
                                                        <button
                                                            onClick={() => toggleDoa(msg.id)}
                                                            className="flex items-center justify-between w-full px-3.5 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200/60 dark:border-rose-800/40 hover:bg-rose-100/80 dark:hover:bg-rose-950/40 transition active:scale-[0.99]"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <HeartHandshake className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                                                <span className="text-left text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                                                                    Doa rujukan
                                                                    <span className="ml-2 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                                                                        {msg.references.doa.length} sumber
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            {isDoaOpen
                                                                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                                                : <ChevronDown className="w-4 h-4 text-slate-400" />
                                                            }
                                                        </button>

                                                        {/* Expanded Doa List */}
                                                        {isDoaOpen && (
                                                            <div className="space-y-2 mt-2">
                                                                {msg.references.doa.map((doa, dIdx) => (
                                                                    <div
                                                                        key={dIdx}
                                                                        className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30 space-y-2"
                                                                    >
                                                                        <h6 className="text-xs md:text-sm font-bold text-rose-700 dark:text-rose-400">
                                                                            {doa.title}
                                                                        </h6>
                                                                        {doa.arabic && (
                                                                            <p className="font-quran text-right text-xl md:text-2xl leading-loose text-slate-900 dark:text-white pt-0.5 select-text" dir="rtl">
                                                                                {doa.arabic}
                                                                            </p>
                                                                        )}
                                                                        {doa.latin && (
                                                                            <p className="text-[11px] text-rose-700 dark:text-rose-400 italic">
                                                                                {doa.latin}
                                                                            </p>
                                                                        )}
                                                                        {doa.translation && (
                                                                            <div className="rounded-lg bg-white/80 dark:bg-slate-900/70 border border-rose-100 dark:border-rose-900/30 p-3">
                                                                                <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">Artinya</p>
                                                                                <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                                                                                    “{doa.translation}”
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}

                            {/* Loading Indicator (Single Minimalist Elegant AI Pill) */}
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/25 dark:border-emerald-500/20 shadow-sm max-w-fit"
                                >
                                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-2 pr-1">
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                            {loadingStep || 'Menganalisis Al-Qur\'an...'}
                                        </p>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div className="h-4 shrink-0" />
                        </div>
                    )}
                </div>
            </div>

            {/* Docked Input Bar at Bottom (Solid, Clean, Tanpa Blur) */}
            <div className="absolute bottom-0 left-0 right-0 z-20 w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
                <div className="max-w-3xl mx-auto space-y-1.5">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="relative flex items-center"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Tanyakan tentang ayat, hadis, doa, atau hikmah..."
                            disabled={loading}
                            className="w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 text-xs md:text-sm font-medium rounded-full py-3.5 pl-4 pr-12 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors disabled:opacity-60"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="absolute right-1.5 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition active:scale-95 disabled:opacity-40 disabled:hover:bg-emerald-600 shadow-sm"
                        >
                            <Send className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                    </form>

                    <p className="text-center text-[9px] text-slate-400 dark:text-slate-500">
                        Jawaban AI bisa keliru meski merujuk Al-Qur'an, hadis, dan doa. Verifikasi kembali; untuk fatwa hukum, rujuk ulama.
                    </p>
                </div>
            </div>
        </div>
    );
}
