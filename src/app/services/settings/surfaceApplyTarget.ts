/** نطاق تطبيق لون الخلفية / زخرفة اللوحة */
export type SurfaceApplyTarget = 'board' | 'blocks' | 'both';

/** نطاق تطبيق ألوان الشبكة — يشمل النقوش على البطاقات */
export type ColorApplyTarget = SurfaceApplyTarget | 'patterns';

export const SURFACE_APPLY_TARGET_OPTIONS: ReadonlyArray<{
    value: SurfaceApplyTarget;
    label: string;
}> = [
    { value: 'board', label: 'اللوحة' },
    { value: 'blocks', label: 'الأقسام' },
];

/** نطاق تطبيق زخرفة الخلفية (خلفية البطاقة) */
export const PATTERN_APPLY_TARGET_OPTIONS: ReadonlyArray<{
    value: SurfaceApplyTarget;
    label: string;
}> = [
    { value: 'board', label: 'اللوحة' },
    { value: 'blocks', label: 'البطاقات' },
    { value: 'both', label: 'الكل' },
];

export const COLOR_APPLY_TARGET_OPTIONS: ReadonlyArray<{
    value: ColorApplyTarget;
    label: string;
}> = [
    ...SURFACE_APPLY_TARGET_OPTIONS,
    { value: 'patterns', label: 'النقوش' },
];

export function normalizeSurfaceApplyTarget(raw: unknown): SurfaceApplyTarget {
    if (raw === 'board' || raw === 'blocks' || raw === 'both') return raw;
    return 'board';
}

export function normalizeColorApplyTarget(raw: unknown): ColorApplyTarget {
    if (raw === 'patterns') return 'patterns';
    return normalizeSurfaceApplyTarget(raw);
}

export function isPatternsColorTarget(target: ColorApplyTarget | undefined): boolean {
    return normalizeColorApplyTarget(target) === 'patterns';
}

export function appliesToBoard(target: SurfaceApplyTarget | ColorApplyTarget | undefined): boolean {
    const t = normalizeColorApplyTarget(target);
    return t === 'board' || t === 'both';
}

export function appliesToBlocks(target: SurfaceApplyTarget | ColorApplyTarget | undefined): boolean {
    const t = normalizeColorApplyTarget(target);
    return t === 'blocks' || t === 'both';
}

/** سطح محايد عندما لا يُطبَّق الثيم على هذا المستوى */
export const NEUTRAL_SURFACE_BG = '#0A0F1C';

/** لون صلب للهيدر/الكروم عند وجود صورة خلفية */
export const LAWYER_WALLPAPER_CHROME_BG = '#0B1021';
