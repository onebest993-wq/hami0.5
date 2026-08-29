/** أنماط موحّدة — مودال سجل الملاحظات والمهام */

export function formatArTaskDate(value?: string) {
    if (!value?.trim()) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.trim();
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const ntm = {
    field:
        'w-full min-h-[44px] rounded-xl border border-amber-500/20 bg-[#0A0F1C]/45 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/45 focus:outline-none transition-all',
    fieldSm:
        'min-w-0 min-h-[44px] flex-1 rounded-xl border border-amber-500/20 bg-[#0A0F1C]/45 px-2.5 py-2 text-[11px] text-white placeholder:text-slate-500 focus:border-amber-500/45 focus:outline-none transition-all',
    textarea:
        'w-full rounded-xl border border-amber-500/20 bg-[#0A0F1C]/45 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/45 focus:outline-none transition-all resize-none',
    section:
        'overflow-hidden rounded-2xl border border-amber-500/15 bg-[#0A0F1C]/50 p-4',
    card: 'overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1C]/30 transition-colors hover:border-amber-500/20',
    label: 'mb-1.5 block text-[11px] font-bold text-slate-400',
    btnPrimary:
        'flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-[11px] font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-40 touch-manipulation',
    btnGhost:
        'min-h-[44px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] font-bold text-slate-300 transition-all hover:bg-white/[0.06] touch-manipulation',
    btnChip:
        'min-h-[44px] rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-100 transition-all hover:bg-amber-500/15 touch-manipulation',
    btnChipMuted:
        'min-h-[44px] rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-bold text-slate-300 transition-all hover:bg-white/[0.06] touch-manipulation',
    iconWrap:
        'grid h-9 w-9 place-items-center rounded-xl border border-amber-500/25 bg-amber-500/10',
    stepDateChip:
        'mt-1 inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-100/95 tabular-nums',
} as const;
