/**
 * ربط مالك فهرس التنفيذ — بلا SecureStore / wipe / load/save الثقيل.
 * مصدر واحد لمعرّف المالك حتى لا تنفصل حالة الـ lite عن executionFilesStorage.
 */
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';

let activeStorageOwnerId: string | null = null;

export function normalizeExecutionFilesStorageOwnerId(
    userId: string | null | undefined,
): string | null {
    const id = String(userId ?? '').trim();
    if (!id) return null;
    return id;
}

export function getActiveExecutionFilesStorageOwnerLite(): string | null {
    return activeStorageOwnerId;
}

/** يضبط المالك ويُرجع هل تغيّر */
export function setActiveExecutionFilesStorageOwnerLite(
    userId: string | null | undefined,
): { ownerId: string | null; changed: boolean } {
    const next = normalizeExecutionFilesStorageOwnerId(userId);
    const changed = next !== activeStorageOwnerId;
    activeStorageOwnerId = next;
    return { ownerId: next, changed };
}

export function resolveExecutionFilesStorageKeyLite(userId?: string | null): string {
    const owner =
        userId !== undefined
            ? normalizeExecutionFilesStorageOwnerId(userId)
            : activeStorageOwnerId;
    if (!owner) return EXECUTION_FILES_STORAGE_KEY;
    return `${EXECUTION_FILES_STORAGE_KEY}:${owner}`;
}

/**
 * يحدّث معرّف المالك في الذاكرة فقط — الترحيل الثقيل يبقى في executionFilesStorage.bind*.
 */
export function bindExecutionFilesStorageOwnerLite(userId: string | null | undefined): string {
    setActiveExecutionFilesStorageOwnerLite(userId);
    return resolveExecutionFilesStorageKeyLite();
}

/** للاختبارات فقط */
export function __resetExecutionFilesStorageOwnerLiteForTests(): void {
    activeStorageOwnerId = null;
}
