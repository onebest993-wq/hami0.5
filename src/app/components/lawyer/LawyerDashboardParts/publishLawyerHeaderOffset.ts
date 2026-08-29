const HEADER_OFFSET_VAR = '--hami-lawyer-header-offset';
const HEADER_OFFSET_NOISE_PX = 2;

/** يزامن إزاحة المحتوى مع ارتفاع شريط الأدوات العلوي (الصف + safe-area العلوي). */
export function publishLawyerHeaderOffset(heightPx: number): void {
    if (typeof document === 'undefined' || !Number.isFinite(heightPx) || heightPx <= 0) return;
    const next = `${Math.ceil(heightPx)}px`;
    const current = document.documentElement.style.getPropertyValue(HEADER_OFFSET_VAR);
    if (current === next) return;
    if (current) {
        const prev = Number.parseFloat(current);
        if (Number.isFinite(prev) && Math.abs(prev - Math.ceil(heightPx)) < HEADER_OFFSET_NOISE_PX) {
            return;
        }
    }
    document.documentElement.style.setProperty(HEADER_OFFSET_VAR, next);
}

export function clearPublishedLawyerHeaderOffset(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.style.removeProperty(HEADER_OFFSET_VAR);
}
