/** أنماط موحّدة — مودال سجل الملاحظات والمهام */

export function formatArTaskDate(value?: string) {
    if (!value?.trim()) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.trim();
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const ntm = {
    field:
        'w-full rounded-xl border border-amber-500/20 bg-[#0A0F1C]/45 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/45 focus:outline-none transition-all',
    fieldSm:
        'min-w-0 flex-1 rounded-xl border border-amber-500/20 bg-[#0A0F1C]/45 px-2.5 py-2 text-[11px] text-white placeholder:text-slate-500 focus:border-amber-500/45 focus:outline-none transition-all',
    textarea:
        'w-full rounded-xl border border-amber-500/20 bg-[#0A0F1C]/45 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/45 focus:outline-none transition-all resize-none',
    section:
        'overflow-hidden rounded-2xl border border-amber-500/15 bg-[#0A0F1C]/35 p-4 backdrop-blur-xl',
    card: 'overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1C]/30 transition-colors hover:border-amber-500/20',
    label: 'mb-1.5 block text-[11px] font-bold text-slate-400',
    btnPrimary:
        'flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-amber-600 to-amber-500 px-4 py-2.5 text-[11px] font-bold text-white transition-all hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 shadow-[0_0_16px_-8px_rgba(245,158,11,0.45)]',
    btnGhost:
        'rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] font-bold text-slate-300 transition-all hover:bg-white/[0.06]',
    btnChip:
        'rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-100 transition-all hover:bg-amber-500/15',
    btnChipMuted:
        'rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-bold text-slate-300 transition-all hover:bg-white/[0.06]',
    iconWrap:
        'grid h-9 w-9 place-items-center rounded-xl border border-amber-500/25 bg-amber-500/10',
    stepDateChip:
        'mt-1 inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-100/95 tabular-nums',
} as const;
