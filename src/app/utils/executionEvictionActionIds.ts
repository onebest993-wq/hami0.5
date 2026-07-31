/**
 * معرّفات إجراءات التخلية — بلا اعتماديات.
 * مفصولة عن executionModuleStrategies لكسر TDZ عند دورات storage-deferred.
 */
export const EVICTION_TIMELINE_ACTION_IDS = {
    FIELD_VISIT: 'eviction_field_visit',
    POLICE_FORCE: 'eviction_police_force',
    BREAK_INVENTORY: 'eviction_break_inventory',
    CUSTODIAN: 'eviction_judicial_custodian',
    HANDOVER_FINAL: 'eviction_handover_final',
    /** تسليم أثاث زوجية — موعد + جرد في طلب منفذ واحد */
    MARITAL_FURNITURE_DELIVERY: 'marital_furniture_delivery',
    /** إنهاء مهلة تخلية سكنية بموافقة المنفذ — يعيد دورة المهلة */
    RESIDENTIAL_GRACE_EARLY_END: 'eviction_residential_grace_early_end_executor',
    /** مذكرة إخبار بالتنفيذ لورثة المدين الشاغلين (تخلية) */
    HEIRS_EXECUTION_NOTICE_MEMO: 'eviction_heirs_execution_notice_memo',
} as const;

export type EvictionTimelineActionId =
    (typeof EVICTION_TIMELINE_ACTION_IDS)[keyof typeof EVICTION_TIMELINE_ACTION_IDS];
