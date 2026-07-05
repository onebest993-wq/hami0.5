/** عدّاد طبقات الإضبارة المحلية (سير الدعوى، المرجع القانوني، محضر الجلسة…) — يمنع Escape من إغلاق الإضبارة كاملة */
let inlineOverlayCount = 0;

export function isSmartFileInlineOverlayOpen(): boolean {
    return inlineOverlayCount > 0;
}

/** سجّل طبقة مفتوحة — يُرجع دالة تنظيف عند الإغلاق أو unmount */
export function registerSmartFileInlineOverlay(): () => void {
    inlineOverlayCount += 1;
    return () => {
        inlineOverlayCount = Math.max(0, inlineOverlayCount - 1);
    };
}

/** إعادة ضبط العداد عند فتح إضبارة جديدة — يمنع Escape/إغلاق عالقاً من جلسة سابقة */
export function resetSmartFileInlineOverlayRegistry(): void {
    inlineOverlayCount = 0;
}
