/** تسلسل المهام — سطح مسطّح على كحلي */
export function taskHierarchyVisuals(depth: number) {
    const isRoot = depth === 0;
    return {
        isRoot,
        levelLabel: isRoot ? 'مهمة' : 'إجراء متفرع',
        cardClass: 'border-b border-white/[0.07]',
        numberTextClass: isRoot ? 'text-[#E6C673]' : 'text-white/45',
    };
}
