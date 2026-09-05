/** أنماط موحّدة — مودال سجل الملاحظات */

export function formatArTaskDate(value?: string) {
    if (!value?.trim()) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.trim();
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const ntm = {
    field:
        'w-full min-h-[44px] rounded-xl border border-white/[0.08] bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12',
    fieldSm:
        'min-w-0 min-h-[44px] flex-1 rounded-xl border border-white/[0.08] bg-transparent px-2.5 py-2 text-[11px] text-white placeholder:text-slate-500 outline-none transition-colors focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12',
    textarea:
        'w-full rounded-xl border border-white/[0.08] bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12 resize-none',
    section:
        'overflow-hidden rounded-xl border border-white/[0.08] bg-transparent p-3',
    card: 'overflow-hidden rounded-xl border border-white/[0.08] bg-transparent transition-colors hover:border-white/15',
    label: 'mb-1.5 block text-[11px] font-bold text-slate-400',
    btnPrimary:
        'flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 px-4 py-2.5 text-[11px] font-bold text-[#E6C673] transition-colors hover:bg-[#E6C673]/18 disabled:opacity-40 touch-manipulation',
    btnGhost:
        'min-h-[44px] rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-[11px] font-bold text-slate-300 transition-colors hover:bg-white/[0.06] touch-manipulation',
    btnChip:
        'min-h-[44px] rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/10 px-3 py-2 text-[11px] font-bold text-[#E6C673] transition-colors hover:bg-[#E6C673]/15 touch-manipulation',
    btnChipMuted:
        'min-h-[44px] rounded-xl border border-white/10 bg-transparent px-3 py-2 text-[11px] font-bold text-slate-300 transition-colors hover:bg-white/[0.06] touch-manipulation',
    iconWrap:
        'grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-transparent',
    stepDateChip:
        'mt-1 inline-flex items-center gap-1 rounded-md border border-white/10 bg-transparent px-1.5 py-0.5 text-[9px] font-medium text-slate-300 tabular-nums',
} as const;
