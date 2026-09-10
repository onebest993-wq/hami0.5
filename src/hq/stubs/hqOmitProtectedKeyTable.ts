/** بديل بناء المقر — تسخين إضابير المحامي ليس إقلاع المقر. */
export const PROTECTED_ARRAY_STORAGE_KEYS = new Set<string>();
export const PROTECTED_OBJECT_STORAGE_KEYS = new Set<string>();
export const BOOT_SHELL_WARM_KEYS = [] as const;
export const PROTECTED_WARM_KEYS = [] as const;

export function isTransactionsThreadingStateKey(_key: string): boolean {
    return false;
}

export function isTransactionsTaskTemplatesKey(_key: string): boolean {
    return false;
}

export function isTaskHelpRequestsKey(_key: string): boolean {
    return false;
}

export function isProtectedStorageKey(_key: string): boolean {
    return false;
}

export function backupDomainForStorageKey(_key: string): null {
    return null;
}

/*
 * شواهد الحذف — يستوردهما `SecureStoreService` منذ `3fb8c029` ولم يلحقهما البديل،
 * فكان `vite build --mode hq` يسقط عليهما. والمقر بلا إضابير محامٍ فلا مفتاح شاهدٍ
 * فيه: `false` هو الجواب الصادق، كبقيّة مُسنَدات هذا الملفّ.
 */
export function isDossierTombstonesStorageKey(_key: string): boolean {
    return false;
}

export function isDeletedIdsTombstoneStorageKey(_key: string): boolean {
    return false;
}
