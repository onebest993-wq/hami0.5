/** أحداث وثوابت نافذة التنفيذ — ملف خفيف بلا استيراد store/utils ثقيلة (يكسر circular chunks). */
export const HAMI_APPEND_EXECUTION_TIMELINE = 'hami-append-execution-timeline';

/**
 * طبقات z-index لنوافذ التنفيذ (محضر المتابعة + فروعها + القرارات).
 *
 * ⚠️ قاعدة صلبة: إطار الإضبارة ExecutionDashboardRootFrame يجلس على z-[230]
 * (فوق مخزن التنفيذ 220). كل نافذة تُرسم عبر createPortal إلى document.body
 * يجب أن تتجاوز 230 وإلا ظهرت خلف الإضبارة (تفتح وتُحجب فوراً — زر ميت).
 */
export const EXEC_MODAL_Z = {
    decisionsShell: 240,
    unifiedFollowUp: 244,
    nestedOverUnified: 248,
    unifiedSummonsAndLegacyNotification: 252,
    nestedOverDecisions: 256,
    timelineFullModal: 262,
    lawReferencePanel: 266,
    nestedOverFollowUpPortal: 280,
    toastAboveExecution: 50000,
} as const;

/** خلفية معتمة موحّدة للطبقات العلوية */
export const EXEC_MODAL_BACKDROP_STRONG =
    'bg-slate-950/90 backdrop-blur-md';
