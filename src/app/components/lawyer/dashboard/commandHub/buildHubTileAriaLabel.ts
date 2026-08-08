/** تسمية وصولية للبلاطات — عدّاد سبارك دون تغيير بصري */
export function buildHubTileAriaLabel(
    label: string,
    suffix: string,
    proceduralAttentionCount?: number,
): string {
    const count = typeof proceduralAttentionCount === 'number' ? proceduralAttentionCount : 0;
    if (count > 0) {
        const countLabel = count === 1 ? 'متابعة إجرائية واحدة' : `${count} متابعات إجرائية`;
        return `${label} — ${countLabel} — ${suffix}`;
    }
    return `${label} — ${suffix}`;
}
