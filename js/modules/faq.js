export function initFaq() {
    const input = document.getElementById('faqSearchInput');
    const hint = document.getElementById('faqSearchHint');
    const btnOpenAll = document.getElementById('faqOpenAllBtn');
    const filterChips = Array.from(document.querySelectorAll('[data-faq-filter]'));
    const items = Array.from(document.querySelectorAll('.faq-item'));

    const getIcon = (item) => item.querySelector('.faq-toggle svg') || item.querySelector('[data-lucide="chevron-down"]');

    const closeAll = () => {
        items.forEach(item => {
            const content = item.querySelector('.faq-content');
            const icon = getIcon(item);
            if (content) content.classList.add('hidden');
            if (icon) icon.classList.remove('rotate-180');
        });
    };

    const normalize = (str) => (str || '').toString();
    const clearHighlights = () => {
        document.querySelectorAll('[data-faq-highlight]').forEach(el => {
            el.replaceWith(document.createTextNode(el.textContent));
        });
    };

    const highlightInElement = (el, query) => {
        if (!el || !query) return;
        const text = el.textContent;
        const lower = text.toLowerCase();
        const q = query.toLowerCase();
        if (!lower.includes(q)) return;

        const parts = [];
        let start = 0;
        let idx = lower.indexOf(q, start);
        while (idx !== -1) {
            parts.push(document.createTextNode(text.slice(start, idx)));
            const mark = document.createElement('mark');
            mark.setAttribute('data-faq-highlight', 'true');
            mark.className = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded px-0.5';
            mark.textContent = text.slice(idx, idx + q.length);
            parts.push(mark);
            start = idx + q.length;
            idx = lower.indexOf(q, start);
        }
        parts.push(document.createTextNode(text.slice(start)));
        el.textContent = '';
        parts.forEach(p => el.appendChild(p));
    };

    const matchesQuery = (item, q) => {
        const titleEl = item.querySelector('h5');
        const bodyEl = item.querySelector('.faq-content p');
        const title = normalize(titleEl?.textContent);
        const body = normalize(bodyEl?.textContent);
        return (title + ' ' + body).toLowerCase().includes(q);
    };

    const openAll = () => {
        items.forEach(item => {
            const content = item.querySelector('.faq-content');
            const icon = getIcon(item);
            if (content) content.classList.remove('hidden');
            if (icon) icon.classList.add('rotate-180');
        });
    };

    items.forEach(item => {
        const btn = item.querySelector('.faq-toggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const content = item.querySelector('.faq-content');
            const icon = getIcon(item);
            if (!content) return;
            const isOpen = !content.classList.contains('hidden');
            closeAll();
            if (!isOpen) {
                content.classList.remove('hidden');
                if (icon) icon.classList.add('rotate-180');
            }
        });
    });

    const setActiveChip = (chip) => {
        filterChips.forEach(c => {
            c.classList.remove('bg-emerald-500/10', 'text-emerald-600', 'dark:text-emerald-400');
            c.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500');
        });
        if (chip) {
            chip.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500');
            chip.classList.add('bg-emerald-500/10', 'text-emerald-600', 'dark:text-emerald-400');
        }
    };

    const resetFilter = () => {
        const sections = Array.from(document.querySelectorAll('.faq-section'));
        sections.forEach(section => section.classList.remove('hidden'));
        items.forEach(item => item.classList.remove('hidden'));
        closeAll();
    };

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const filter = chip.dataset.faqFilter;
            if (input) input.value = '';
            if (hint) hint.classList.remove('hidden');
            clearHighlights();
            setActiveChip(chip);

            if (!filter || filter === 'all') {
                resetFilter();
                return;
            }

            const sections = Array.from(document.querySelectorAll('.faq-section'));
            sections.forEach(section => {
                const cats = (section.dataset.faqCategory || '').split(',').map(s => s.trim());
                const show = cats.includes(filter);
                section.classList.toggle('hidden', !show);
            });
            items.forEach(item => item.classList.remove('hidden'));
            closeAll();
        });
    });

    if (btnOpenAll) btnOpenAll.addEventListener('click', () => openAll());

    if (input) {
        input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            if (hint) hint.classList.toggle('hidden', q.length > 0);

            clearHighlights();
            items.forEach(item => {
                const show = q.length === 0 || matchesQuery(item, q);
                item.classList.toggle('hidden', !show);
            });

            const sections = Array.from(document.querySelectorAll('.faq-section'));
            sections.forEach(section => {
                const visibleItems = section.querySelectorAll('.faq-item:not(.hidden)');
                section.classList.toggle('hidden', visibleItems.length === 0);
            });

            if (q.length > 0) {
                items.forEach(item => {
                    if (!item.classList.contains('hidden')) {
                        const content = item.querySelector('.faq-content');
                        const icon = getIcon(item);
                        if (content) content.classList.remove('hidden');
                        if (icon) icon.classList.add('rotate-180');
                        const titleEl = item.querySelector('h5');
                        const bodyEl = item.querySelector('.faq-content p');
                        highlightInElement(titleEl, q);
                        highlightInElement(bodyEl, q);
                    }
                });
            } else {
                closeAll();
            }
        });
    }

    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'faqView') {
            if (input) {
                input.value = '';
                if (hint) hint.classList.remove('hidden');
            }
            items.forEach(item => item.classList.remove('hidden'));
            const sections = Array.from(document.querySelectorAll('.faq-section'));
            sections.forEach(section => section.classList.remove('hidden'));
            clearHighlights();
            closeAll();
            setActiveChip(filterChips.find(c => c.dataset.faqFilter === 'all'));
        }
    });

    setActiveChip(filterChips.find(c => c.dataset.faqFilter === 'all'));
}
