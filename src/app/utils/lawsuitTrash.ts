/** سلة مهملات الدعاوى المدنية — حذف ناعم 30 يوماً ثم إزالة تلقائية. */

export const LAWSUIT_TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export type LawsuitTrashFile = {
    status?: string;
    deletedAt?: number;
};

export function isLawsuitInTrash(file: LawsuitTrashFile): boolean {
    return file?.status === 'deleted';
}

export function isLawsuitArchived(file: { status?: string }): boolean {
    return file?.status === 'archived';
}

export function lawsuitTrashExpiresAtMs(deletedAtMs: number): number {
    if (!Number.isFinite(deletedAtMs)) return Date.now();
    return deletedAtMs + LAWSUIT_TRASH_RETENTION_MS;
}

export function lawsuitTrashDaysRemaining(file: LawsuitTrashFile): number {
    if (!isLawsuitInTrash(file) || file.deletedAt == null) return 0;
    const end = lawsuitTrashExpiresAtMs(file.deletedAt);
    const ms = end - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function shouldAutoPurgeLawsuitFromTrash(file: LawsuitTrashFile): boolean {
    if (!isLawsuitInTrash(file) || file.deletedAt == null) return false;
    return Date.now() >= lawsuitTrashExpiresAtMs(file.deletedAt);
}

export function purgeExpiredLawsuitsFromTrash<T extends LawsuitTrashFile>(files: T[]): T[] {
    return files.filter((f) => !shouldAutoPurgeLawsuitFromTrash(f));
}
