import type { FileData } from './lawsuitFileTypes';
import {
    pruneVerifiedLawsuitJournalEntries,
    tryClearPendingLawsuitCreateAfterProof,
    tryFinalizeLawsuitJournalAfterProof,
} from '@/app/domain/lawsuit/lawsuitDurabilityVerify';
import {
    clearPendingLawsuitCreate,
    flushPendingLawsuitCreatesToActive,
    listPendingLawsuitCreates,
    mergePendingLawsuitCreatesInto,
} from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import {
    awaitLawsuitWorkspaceCommit,
    type LawsuitCommitResult,
} from '@/app/domain/lawsuit/lawsuitPersistFlush';
import {
    flushLawsuitJournalToActive,
    hasUnverifiedLawsuitJournal,
    listLawsuitJournalEntries,
    mergeLawsuitJournalInto,
    pruneLawsuitJournalForFileIds,
    settleLawsuitJournalPersist,
} from '@/app/domain/lawsuit/lawsuitWriteJournal';

/** دمج كل طبقات المتانة (pending + journal) فوق المقطع النشط */
export function mergeLawsuitDurabilityOverlaysInto(active: FileData[]): FileData[] {
    return mergeLawsuitJournalInto(mergePendingLawsuitCreatesInto(active));
}

export function lawsuitDurabilityHasUncommittedWrites(): boolean {
    return listPendingLawsuitCreates().length > 0 || hasUnverifiedLawsuitJournal();
}

/** إزالة pending + WAL عند خروج الإضبارة من النشط (أرشفة/سلة/حذف نهائي) */
export function pruneLawsuitDurabilityOverlaysForFileIds(
    fileIds: readonly (string | number)[],
): void {
    for (const id of fileIds) {
        clearPendingLawsuitCreate(id);
    }
    pruneLawsuitJournalForFileIds(fileIds);
}

export async function flushLawsuitDurabilityOverlaysToActive(): Promise<number> {
    const pending = await flushPendingLawsuitCreatesToActive();
    const journal = await flushLawsuitJournalToActive();
    return pending + journal;
}

/**
 * بعد autosave/تعديل/pagehide: انتظر commit ثم أزل pending/WAL المثبت على القرص.
 * لا يُستدعى داخل بوابة الكتابة.
 */
export function scheduleFinalizeLawsuitDurabilityAfterCommit(
    fileIds?: readonly (string | number)[],
    options?: { timeoutMs?: number; requireActiveFileId?: string | number },
): void {
    void awaitLawsuitWorkspaceCommit({
        timeoutMs: options?.timeoutMs ?? 8_000,
        requireActiveFileId: options?.requireActiveFileId,
    })
        .then((commit) => finalizeLawsuitDurabilityAfterCommit(commit, fileIds))
        .catch(() => undefined);
}

export async function finalizeLawsuitDurabilityAfterCommit(
    commit: LawsuitCommitResult,
    fileIds?: readonly (string | number)[],
): Promise<number> {
    if (!commit.ok) return 0;

    const candidateIds = new Set<string>();
    if (fileIds?.length) {
        for (const id of fileIds) candidateIds.add(String(id));
    } else {
        for (const row of listPendingLawsuitCreates()) {
            candidateIds.add(String(row.id));
        }
        for (const entry of listLawsuitJournalEntries()) {
            candidateIds.add(entry.fileId);
        }
    }
    if (candidateIds.size === 0) return 0;

    let finalized = 0;
    for (const id of candidateIds) {
        const pendingCleared = await tryClearPendingLawsuitCreateAfterProof(id, commit);
        if (pendingCleared) {
            finalized += 1;
            continue;
        }
        const journalCleared = await tryFinalizeLawsuitJournalAfterProof(id, commit);
        if (journalCleared) finalized += 1;
    }

    await settleLawsuitJournalPersist();
    pruneVerifiedLawsuitJournalEntries(Array.from(candidateIds));
    return finalized;
}
