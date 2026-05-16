/**
 * طبقات z-index لنوافذ التنفيذ (محضر المتابعة + فروعها + القرارات).
 * الأرقام الأعلى = فوق؛ النوافذ المربوطة بـ createPortal(document.body) تستخدم هذه القيم.
 */
export const EXEC_MODAL_Z = {
    /** غلاف «محضر المتابعة» */
    unifiedFollowUp: 180,
    /** غلاف «القرارات والطعون» */
    decisionsShell: 160,
    /** نافذة فرعية فوق محضر المتابعة (تأكيد إحضار جبري، نماذج الحجز المالي، مهلة التخلية السكنية، …) */
    nestedOverUnified: 230,
    /**
     * نوافذ فرعية تُعرَض عبر portal على document.body — فوق غلاف محضر المتابعة (180)
     * حتى لا تُحبس داخل سياق تراكمي للآباء.
     */
    nestedOverFollowUpPortal: 280,
    /** مركز التبليغ الموحّد + مودال التبليغ القديم — فوق محضر المتابعة ومحاذاة بقية النوافذ المدمجة */
    unifiedSummonsAndLegacyNotification: 235,
    /** نافذة فرعية فوق مركز القرارات (إضافة قرار / نتيجة طعن) */
    nestedOverDecisions: 240,
    /** لوحة جانبية «قانون التنفيذ» (مرجع تشريعي) */
    lawReferencePanel: 250,
    /**
     * إشعارات (toast) فوق غلاف التنفيذ z-[100] وأي stacking context داخله.
     * يُعرَض عبر createPortal(document.body).
     */
    toastAboveExecution: 50000,
} as const;

/** خلفية معتمة موحّدة للطبقات العلوية */
export const EXEC_MODAL_BACKDROP_STRONG =
    'bg-slate-950/90 backdrop-blur-md';
