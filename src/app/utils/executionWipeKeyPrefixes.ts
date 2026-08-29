/** مفاتيح فهرس/متجر التنفيذ التي لا تبدأ ببادئة execution_ */
export const EXECUTION_WIPE_EXACT_KEYS = [
    'executionFiles',
    'hami:execution-dashboard',
    'execution-dashboard-storage',
    'lawyer_execution_files',
    'lawyer-execution-files',
    'hami-execution-files',
] as const;

/** بادئات فهرس التنفيذ — تُمسح عند الخروج لا عند حذف إضبارة واحدة */
export const EXECUTION_INDEX_WIPE_PREFIXES = [
    'executionFiles:',
    'hami:execution:',
] as const;

/** بادئات مفاتيح التنفيذ التي تُمسح عند حذف الإضبارة أو تسجيل الخروج */
export const EXECUTION_WIPE_KEY_PREFIXES = [
    'execution_',
    'executionFiles:',
    'garnishment_',
    'hami_garnishment_',
    'hami_unified_funds_ledger_',
    'hami_party_badges_hidden_',
    'hami_eviction_grace_',
    'hami:employee_personal_unlock',
    'hami:execution:',
] as const;
