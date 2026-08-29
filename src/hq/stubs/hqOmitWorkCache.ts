/** بديل بناء المقر — كاش إضبارة التنفيذ ليس سطح المقر. */
export const storageCache = {
    get: () => null,
    set: () => false,
    remove: () => undefined,
    invalidate: () => undefined,
    clear: () => undefined,
    touchCacheEntry: () => undefined,
    cleanup: () => 0,
};
