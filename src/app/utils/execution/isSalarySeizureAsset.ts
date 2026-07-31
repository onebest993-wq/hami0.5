/**
 * تمييز أصل حجز راتب — مشترك بين التنفيذ وبوابات FOC (بلا عكس اعتماد الشرائح).
 */
export function isSalarySeizureAsset(asset: unknown): boolean {
    if (!asset || typeof asset !== 'object') return false;
    const a = asset as Record<string, unknown>;
    const det =
        typeof a.details === 'object' && a.details && !Array.isArray(a.details)
            ? (a.details as Record<string, unknown>)
            : null;
    const kind = String(det?.seizureUiKind || '').trim();
    if (kind === 'salary') return true;
    return /راتب|خُمس|خمس|salary/i.test(String(a.type || ''));
}
