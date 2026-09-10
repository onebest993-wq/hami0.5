export const EXECUTION_FILES_STORAGE_KEY = 'executionFiles';
export const EXECUTION_FILES_STORAGE_KEYS_LEGACY = [
    'hami-execution-files',
    'execution_files',
    'lawyer_execution_files',
] as const;

export const LAWSUIT_FILES_STORAGE_KEY = 'lawyer_files';
export const LAWSUIT_FILES_STORAGE_KEYS_LEGACY = [
    'lawsuitFiles',
    'hami-lawsuit-files',
    'lawsuit_files',
] as const;

/** مقسّم — boot يحمّل النشطة + الفهرس فقط */
export const LAWSUIT_FILES_INDEX_KEY = 'lawyer_files_index';
export const LAWSUIT_FILES_ACTIVE_KEY = 'lawyer_files_active';
export const LAWSUIT_FILES_ARCHIVED_KEY = 'lawyer_files_archived';
export const LAWSUIT_FILES_TRASH_KEY = 'lawyer_files_trash';

export const DOSSIER_WARM_KEYS = [
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_TRASH_KEY,
    EXECUTION_FILES_STORAGE_KEY,
    ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
] as const;

/** كل مقاطع الدعوى — تُسخَّن قبل getItemSync بعد HMR أو فتح المخزن */
export const LAWSUIT_SEGMENT_WARM_KEYS = [
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_TRASH_KEY,
] as const;

/** فهرس التنفيذ فقط — شواهد الحذف تُفكّ عند المزامنة لا عند تسخين الفهرس */
export const EXECUTION_INDEX_WARM_KEYS = [
    EXECUTION_FILES_STORAGE_KEY,
    ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
] as const;
