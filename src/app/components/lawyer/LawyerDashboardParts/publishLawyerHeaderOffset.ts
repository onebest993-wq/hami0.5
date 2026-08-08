const HEADER_OFFSET_VAR = '--hami-lawyer-header-offset';

/** يزامن إزاحة المحتوى مع ارتفاع الهيدر الفعلي (safe-area + صف الأزرار). */
export function publishLawyerHeaderOffset(heightPx: number): void {
    if (typeof document === 'undefined' || !Number.isFinite(heightPx) || heightPx <= 0) return;
    document.documentElement.style.setProperty(HEADER_OFFSET_VAR, `${Math.ceil(heightPx)}px`);
}

export function clearPublishedLawyerHeaderOffset(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.style.removeProperty(HEADER_OFFSET_VAR);
}
