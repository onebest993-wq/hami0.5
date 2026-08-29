/** بديل بناء المقر — تسخين إضابير المحامي ليس إقلاع المقر. */
export const PROTECTED_ARRAY_STORAGE_KEYS = new Set<string>();
export const PROTECTED_OBJECT_STORAGE_KEYS = new Set<string>();
export const BOOT_SHELL_WARM_KEYS = [] as const;
export const PROTECTED_WARM_KEYS = [] as const;

export function isProtectedStorageKey(_key: string): boolean {
    return false;
}

export function backupDomainForStorageKey(_key: string): null {
    return null;
}
