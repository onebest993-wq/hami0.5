/** تسلسل المهام — بترول مسطح · لمسة أُخْرَة للجذر */
export function taskHierarchyVisuals(depth: number) {
    const isRoot = depth === 0;
    return {
        isRoot,
        levelLabel: isRoot ? 'مهمة رئيسية' : 'إجراء متفرع',
        cardClass: isRoot
            ? 'bg-[#1A3340] border-[#C4782F]/35 hover:border-[#C4782F]/50'
            : 'bg-[#152A32] border-[#2A4550]/90 hover:border-[#2A4550]',
        numberBadgeClass: isRoot
            ? 'bg-[#C4782F]/14 border-[#C4782F]/40 text-[#D49248]'
            : 'bg-[#1A3340] border-[#2A4550] text-[#B4B0AA]',
        levelBadgeClass: isRoot
            ? 'bg-[#C4782F]/10 border-[#C4782F]/30 text-[#D49248]'
            : 'bg-[#152A32] border-[#2A4550] text-[#8A8680]',
    };
}
