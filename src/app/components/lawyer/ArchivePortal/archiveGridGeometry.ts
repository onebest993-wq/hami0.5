/** هندسة شبكة الأرشيف — عرض الحاوية لا عرض نافذة سطح المكتب داخل إطار المخزن. */

export function resolveArchiveGridColumnCount(width: number): number {
    if (width >= 1280) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
}

export function archiveGridClassForColumnCount(columns: number): string {
    if (columns >= 4) return 'grid grid-cols-4 gap-2.5';
    if (columns >= 3) return 'grid grid-cols-3 gap-2.5';
    if (columns === 2) return 'grid grid-cols-2 gap-2.5';
    return 'grid grid-cols-1 gap-2.5';
}

/** أول رسم: عرض الشاشة إن لم تُقَس الحاوية بعد — يمنع عموداً واحداً ثم اتساعاً. */
export function readArchiveGridWidthGuess(measuredHostWidth: number): number {
    if (measuredHostWidth > 0) return measuredHostWidth;
    if (typeof window !== 'undefined' && window.innerWidth > 0) return window.innerWidth;
    return 0;
}
