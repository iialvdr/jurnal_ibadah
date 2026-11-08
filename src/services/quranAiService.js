/**
 * Sends questions to the server-side Quran, doa, and Hadith RAG endpoint.
 */
export async function askQuranAI({ query, history = [], onStatusChange = () => {} }) {
    if (!query?.trim()) throw new Error('Pertanyaan tidak boleh kosong');

    onStatusChange({ step: 'connecting', message: 'Mencari ayat, doa, dan hadis yang relevan...' });
    const res = await fetch('/api/tanya-quran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.answer) {
        throw new Error(data.error || 'Layanan AI sedang tidak tersedia. Silakan coba lagi.');
    }

    onStatusChange({ step: 'done', message: 'Selesai' });
    return {
        answer: data.answer,
        hasReference: data.hasReference === true,
        references: data.references || { ayat: [], doa: [], hadis: [] }
    };
}

export async function getDailyAISuggestions(date) {
    const res = await fetch(`/api/tanya-quran?action=suggestions&date=${encodeURIComponent(date)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data.suggestions)) {
        throw new Error(data.error || 'Gagal memuat pertanyaan rekomendasi.');
    }
    return data.suggestions;
}
