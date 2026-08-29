import type { HomeBlockSize, HomeBlockStyleOverride } from './homeLayout';

const SIZE_SCALE: Record<HomeBlockSize, number> = {
    compact: 0.86,
    normal: 1,
    large: 1.18,
};

export function resolveBlockSizeScale(size: HomeBlockSize = 'normal'): number {
    return SIZE_SCALE[size];
}

/** مقياس موحّد للنص والأيقونة داخل البطاقة */
export function resolveContentScale(
    override: HomeBlockStyleOverride | undefined,
    baseMinHeightPx?: number,
    ignoreHeightPx = false,
): number {
    const sizeScale = SIZE_SCALE[override?.size ?? 'normal'];
    if (ignoreHeightPx || !override?.heightPx || !baseMinHeightPx) return sizeScale;
    const heightRatio = override.heightPx / baseMinHeightPx;
    const heightScale = Math.max(0.78, Math.min(1.32, heightRatio));
    return sizeScale * heightScale;
}

export function contentScaleVar(scale: number): Record<'--hami-content-scale', string> {
    return { '--hami-content-scale': String(Number(scale.toFixed(3))) };
}

/** أحجام خط البلاطات النصفية — داخل الحاوية دون ملء الارتفاع */
export function hubRouteTitleRemHalf(size: HomeBlockSize = 'normal'): number {
    return { compact: 1.72, normal: 2.05, large: 2.28 }[size];
}

/** أحجام خط البطاقات الصغيرة (دعاوى / معاملات) */
export function hubRouteTitleRem(size: HomeBlockSize = 'normal'): number {
    return { compact: 1.38, normal: 1.82, large: 2.08 }[size];
}

/** أحجام خط بطاقة التنفيذ */
export function hubExecutionTitleRem(size: HomeBlockSize = 'normal'): number {
    return { compact: 2.15, normal: 2.85, large: 3.25 }[size];
}

export function hubIconBoxPx(size: HomeBlockSize = 'normal'): number {
    return { compact: 40, normal: 46, large: 52 }[size];
}

export function hubIconStrokePx(size: HomeBlockSize = 'normal'): number {
    return { compact: 18, normal: 21, large: 24 }[size];
}
