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

export const DOSSIER_WARM_KEYS = [
    LAWSUIT_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEY,
    ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
] as const;
