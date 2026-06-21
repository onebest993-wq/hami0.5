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

/** أحجام خط البطاقات الصغيرة (دعاوى / معاملات) */
export function hubRouteTitleRem(size: HomeBlockSize = 'normal'): number {
    return { compact: 1.22, normal: 1.58, large: 1.82 }[size];
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

export function dockCardIconBoxPx(size: HomeBlockSize = 'normal'): number {
    return { compact: 38, normal: 44, large: 50 }[size];
}

export function dockCardLabelRem(size: HomeBlockSize = 'normal'): number {
    return { compact: 0.88, normal: 1, large: 1.12 }[size];
}

export function forumLabelRem(size: HomeBlockSize = 'normal'): number {
    return { compact: 0.92, normal: 1.08, large: 1.24 }[size];
}

export function forumIconBoxPx(size: HomeBlockSize = 'normal'): number {
    return { compact: 38, normal: 44, large: 50 }[size];
}

export function forumIconStrokePx(size: HomeBlockSize = 'normal'): number {
    return { compact: 16, normal: 18, large: 20 }[size];
}

export function dockButtonBoxPx(size: HomeBlockSize = 'normal'): number {
    return { compact: 36, normal: 44, large: 52 }[size];
}

export function dockIconStrokePx(size: HomeBlockSize = 'normal'): number {
    return { compact: 16, normal: 18, large: 20 }[size];
}

export function dockLabelPx(size: HomeBlockSize = 'normal'): number {
    return { compact: 8, normal: 9, large: 10 }[size];
}
