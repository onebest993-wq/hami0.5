/** أحداث وثوابت نافذة التنفيذ — ملف خفيف بلا استيراد store/utils ثقيلة (يكسر circular chunks). */
export const HAMI_APPEND_EXECUTION_TIMELINE = 'hami-append-execution-timeline';

/** طبقات z-index لنوافذ التنفيذ (محضر المتابعة + فروعها + القرارات). */
export const EXEC_MODAL_Z = {
    unifiedFollowUp: 180,
    decisionsShell: 160,
    nestedOverUnified: 230,
    nestedOverFollowUpPortal: 280,
    unifiedSummonsAndLegacyNotification: 235,
    nestedOverDecisions: 240,
    timelineFullModal: 245,
    lawReferencePanel: 250,
    toastAboveExecution: 50000,
} as const;

/** خلفية معتمة موحّدة للطبقات العلوية */
export const EXEC_MODAL_BACKDROP_STRONG =
    'bg-slate-950/90 backdrop-blur-md';
