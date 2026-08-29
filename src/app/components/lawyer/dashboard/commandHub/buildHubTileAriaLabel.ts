/** تسمية وصولية للبلاطات — بلا عدّاد مهجور */
export function buildHubTileAriaLabel(label: string, suffix: string): string {
    return `${label} — ${suffix}`;
}
