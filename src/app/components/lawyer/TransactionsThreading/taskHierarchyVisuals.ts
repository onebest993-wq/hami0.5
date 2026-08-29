/** تسلسل المهام — سطح فاتح على كحلي */
export function taskHierarchyVisuals(depth: number) {
    const isRoot = depth === 0;
    return {
        isRoot,
        levelLabel: isRoot ? 'مهمة رئيسية' : 'إجراء متفرع',
        cardClass: isRoot
            ? 'bg-white/[0.04] border-[#E6C673]/25'
            : 'bg-white/[0.025] border-white/[0.07] hover:border-[#E6C673]/20',
        numberTextClass: isRoot ? 'text-[#E6C673]' : 'text-white/45',
    };
}
