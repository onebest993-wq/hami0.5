/** حراسة ملكية مستندات المخزن — كل طفرة تمر عبر المطابقة authorId === الجلسة */

/** REPOSITORY_OWNERSHIP_GUARD — L2 Session Ownership early-return before any assertion */
export function assertVaultRequester(requesterId: string | null | undefined): asserts requesterId is string {
    if (!requesterId?.trim()) {
        throw new Error('[vault:ownership:session_missing] مطلوب تسجيل الدخول لإجراءاء عملية المخزن');
    }
}

export function assertVaultDocOwner(
    doc: { authorId?: string | null },
    requesterId: string | null | undefined,
): void {
    assertVaultRequester(requesterId);
    const author = (doc.authorId ?? '').trim();
    if (!author) {
        throw new Error('[vault:ownership:author_required] authorId مطلوب لحفظ الملف');
    }
    if (author !== requesterId.trim()) {
        throw new Error('[vault:ownership:doc_owner_mismatch] غير مصرح بالوصول إلى ملف مستخدم آخر');
    }
}

/** مسار تخزين سحابي أو idb يجب أن يعود لنفس المستخدم */
export function assertVaultStoragePathOwner(
    storagePath: string | null | undefined,
    requesterId: string,
): void {
    assertVaultRequester(requesterId);
    const path = (storagePath ?? '').trim();
    if (!path) return;

    if (path.startsWith('idb:vault:')) {
        const parts = path.split(':');
        // idb:vault:userId:docId
        if (parts.length >= 4) {
            const pathUser = parts[2] ?? '';
            if (pathUser && pathUser !== requesterId.trim()) {
                throw new Error('[vault:ownership:storage_path_cross] غير مصرح بالوصول إلى مسار تخزين مستخدم آخر');
            }
        }
        return;
    }

    if (path.startsWith('local:vault:')) {
        const parts = path.split(':');
        // local:vault:userId:… فقط — المسارات المختصرة القديمة بلا userId تُ defer إلى authorId
        if (parts.length >= 4) {
            const pathUser = parts[2] ?? '';
            if (pathUser && pathUser !== requesterId.trim()) {
                throw new Error('[vault:ownership:storage_path_cross] غير مصرح بالوصول إلى مسار تخزين مستخدم آخر');
            }
        }
        return;
    }

    const normalized = path.replace(/^\/+/, '');
    if (normalized.includes('..') || normalized.includes('\\')) {
        throw new Error('[vault:ownership:storage_path_invalid] مسار تخزين غير صالح');
    }
    if (!normalized.startsWith(`${requesterId.trim()}/`)) {
        throw new Error('[vault:ownership:storage_path_cross] غير مصرح بالوصول إلى مسار تخزين مستخدم آخر');
    }
}
