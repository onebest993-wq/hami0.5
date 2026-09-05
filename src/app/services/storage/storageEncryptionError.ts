/** أخطاء تشفير/كتابة القرص — ورقة بلا SecureStore حتى لا يسحبها مسار المعاملات إلى الإقلاع. */
export class StorageEncryptionError extends Error {
    constructor(key: string, cause?: unknown) {
        super(`Refused to persist sensitive key "${key}" without encryption`);
        this.name = 'StorageEncryptionError';
        if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
    }
}

export class StoragePersistenceError extends Error {
    constructor(key: string, cause?: unknown) {
        super(`Failed to persist key "${key}" to IndexedDB`);
        this.name = 'StoragePersistenceError';
        if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
    }
}
