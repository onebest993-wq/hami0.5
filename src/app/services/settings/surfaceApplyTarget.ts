/** نطاق تطبيق لون الخلفية / زخرفة اللوحة */
export type SurfaceApplyTarget = 'board' | 'blocks' | 'both';

export const SURFACE_APPLY_TARGET_OPTIONS: ReadonlyArray<{
    value: SurfaceApplyTarget;
    label: string;
}> = [
    { value: 'board', label: 'اللوحة' },
    { value: 'blocks', label: 'الأقسام' },
    { value: 'both', label: 'كلاهما' },
];

export function normalizeSurfaceApplyTarget(raw: unknown): SurfaceApplyTarget {
    if (raw === 'board' || raw === 'blocks' || raw === 'both') return raw;
    return 'both';
}

export function appliesToBoard(target: SurfaceApplyTarget | undefined): boolean {
    const t = normalizeSurfaceApplyTarget(target);
    return t === 'board' || t === 'both';
}

export function appliesToBlocks(target: SurfaceApplyTarget | undefined): boolean {
    const t = normalizeSurfaceApplyTarget(target);
    return t === 'blocks' || t === 'both';
}

/** سطح محايد عندما لا يُطبَّق الثيم على هذا المستوى */
export const NEUTRAL_SURFACE_BG = '#0A0F1C';
