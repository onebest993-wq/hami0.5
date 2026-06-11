export function taskHierarchyVisuals(depth: number) {
    const isRoot = depth === 0;
    return {
        isRoot,
        levelLabel: isRoot ? 'مهمة رئيسية' : 'إجراء متفرع',
        cardClass: isRoot
            ? 'bg-gradient-to-br from-[#D4AF37]/14 via-white/[0.05] to-white/[0.03] border-[#D4AF37]/35 shadow-[0_14px_40px_rgba(212,175,55,0.14)] hover:border-[#D4AF37]/45 hover:from-[#D4AF37]/18'
            : 'bg-gradient-to-br from-sky-500/10 via-white/[0.04] to-white/[0.02] border-sky-400/28 shadow-[0_14px_40px_rgba(56,189,248,0.10)] hover:border-sky-400/38 hover:from-sky-500/14',
        numberBadgeClass: isRoot
            ? 'bg-[#D4AF37]/18 border-[#D4AF37]/35 text-[#F4C430]'
            : 'bg-sky-500/14 border-sky-400/30 text-sky-100',
        levelBadgeClass: isRoot
            ? 'bg-[#D4AF37]/12 border-[#D4AF37]/28 text-[#E6C673]'
            : 'bg-sky-500/10 border-sky-400/22 text-sky-200',
    };
}
