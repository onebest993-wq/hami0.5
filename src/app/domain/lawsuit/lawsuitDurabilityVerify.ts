import type { LawsuitCommitResult } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import { parseLawsuitActiveFiles } from '@/app/domain/lawsuit/lawsuitActiveDurability';
import {
    clearPendingLawsuitCreate,
    listPendingLawsuitCreates,
    settleLawsuitPendingPersist,
} from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import {
    isLawsuitJournalStillOpen,
    pruneLawsuitJournalForFileIds,
    settleLawsuitJournalPersist,
} from '@/app/domain/lawsuit/lawsuitWriteJournal';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    wasLawsuitJournaledThisPage,
    wasLawsuitStagedThisPage,
} from '@/app/domain/lawsuit/lawsuitPageWriteGuard';

/** هل النص المفكوك يحتوي معرّف الإضبارة في المقطع النشط؟ */
export function activePlaintextContainsFileId(
    plain: string | null,
    fileId: string | number,
): boolean {
    const id = String(fileId);
    return parseLawsuitActiveFiles(plain).some((row) => String(row.id) === id);
}

export function isLawsuitCreateStillPending(fileId: string | number): boolean {
    const id = String(fileId);
    return listPendingLawsuitCreates().some((row) => String(row.id) === id);
}

/**
 * تحقّق من IndexedDB مُفكّكاً — لا تعتمد على getItemSync (الذاكرة قد تكذب).
 */
export async function verifyLawsuitActiveFileOnDisk(fileId: string | number): Promise<boolean> {
    try {
        const plain = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
        return activePlaintextContainsFileId(plain, fileId);
    } catch {
        return false;
    }
}

/** تحقّق سريع من الذاكرة المفكّكة — للتنظيف بعد كتابة ناجحة دون انتظار IDB.
 * leftover في localStorage وحده ليس إثبات قرص — لا drain هنا. */
export function verifyLawsuitActiveFileOnDiskSync(fileId: string | number): boolean {
    if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY)) return false;
    try {
        const plain = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        return typeof plain === 'string' && activePlaintextContainsFileId(plain, fileId);
    } catch {
        return false;
    }
}

/** يُزيل من السجل فقط المعرّفات المثبتة على المقطع النشط (sync) */
export function pruneVerifiedLawsuitJournalEntries(
    fileIds: readonly (string | number)[],
): number {
    const verified = fileIds.filter(
        (id) => !wasLawsuitJournaledThisPage(id) && verifyLawsuitActiveFileOnDiskSync(id),
    );
    if (verified.length === 0) return 0;
    pruneLawsuitJournalForFileIds(verified);
    return verified.length;
}

/**
 * القاعدة الذهبية لمسح المعلّق:
 * commit.ok ∧ لا يزال معلّقاً ∧ المعرّف موجود في active على القرص مُفكّكاً.
 */
export async function tryClearPendingLawsuitCreateAfterProof(
    fileId: string | number,
    commit: LawsuitCommitResult,
): Promise<boolean> {
    if (!commit.ok) return false;
    if (!isLawsuitCreateStillPending(fileId)) return false;
    /* نفس الصفحة التي أنشأت ≠ إقلاع بعد Reload */
    if (wasLawsuitStagedThisPage(fileId)) return false;
    if (!(await verifyLawsuitActiveFileOnDisk(fileId))) return false;
    await settleLawsuitPendingPersist();
    clearPendingLawsuitCreate(fileId);
    await settleLawsuitJournalPersist();
    pruneLawsuitJournalForFileIds([fileId]);
    return true;
}

/**
 * مسح سجل WAL بعد إثبات القرص — لكل كتابة (إنشاء أو تعديل).
 */
export async function tryFinalizeLawsuitJournalAfterProof(
    fileId: string | number,
    commit: LawsuitCommitResult,
): Promise<boolean> {
    if (!commit.ok) return false;
    if (!isLawsuitJournalStillOpen(fileId)) return false;
    if (wasLawsuitJournaledThisPage(fileId)) return false;
    if (!(await verifyLawsuitActiveFileOnDisk(fileId))) return false;
    await settleLawsuitJournalPersist();
    pruneLawsuitJournalForFileIds([fileId]);
    return true;
}
