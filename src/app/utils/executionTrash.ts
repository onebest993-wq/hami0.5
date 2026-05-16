/**
 * سلة مهملات إضابير التنفيذ — حذف ناعم 30 يوماً ثم إزالة تلقائية.
 */

export const EXECUTION_TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function getExecutionTrashDeletedAt(file: { executionTrashDeletedAt?: string | null }): string | null {
    const v = file?.executionTrashDeletedAt;
    if (typeof v !== 'string' || !v.trim()) return null;
    return v.trim();
}

export function isExecutionInTrash(file: { executionTrashDeletedAt?: string | null }): boolean {
    return getExecutionTrashDeletedAt(file) != null;
}

export function executionTrashExpiresAtMs(deletedAtIso: string): number {
    const t = Date.parse(deletedAtIso);
    if (!Number.isFinite(t)) return Date.now();
    return t + EXECUTION_TRASH_RETENTION_MS;
}

/** أيام تقويمية تقريبية متبقية قبل الحذف التلقائي (0 عند انتهاء المهلة) */
export function executionTrashDaysRemaining(file: { executionTrashDeletedAt?: string | null }): number {
    const del = getExecutionTrashDeletedAt(file);
    if (!del) return 0;
    const end = executionTrashExpiresAtMs(del);
    const ms = end - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function shouldAutoPurgeExecutionFromTrash(file: { executionTrashDeletedAt?: string | null }): boolean {
    const del = getExecutionTrashDeletedAt(file);
    if (!del) return false;
    return Date.now() >= executionTrashExpiresAtMs(del);
}

/** يزيل الإضابير التي انتهت مهلة الشهر في السلة */
export function purgeExpiredExecutionsFromTrash<T extends { executionTrashDeletedAt?: string | null }>(files: T[]): T[] {
    return files.filter((f) => !shouldAutoPurgeExecutionFromTrash(f));
}

export function stripExecutionTrashFields<T extends Record<string, unknown>>(file: T): T {
    const next = { ...file };
    delete (next as { executionTrashDeletedAt?: string }).executionTrashDeletedAt;
    return next;
}
