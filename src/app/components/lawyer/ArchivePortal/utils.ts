import { executionStorageKey } from '@/app/utils/executionStorageKeysLite';
import { normalizeExecutionFileRecord } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { normalizeExecutionPartyList } from '@/app/utils/executionPartyNormalize';
import { storageCache } from '@/app/utils/storageCache';
import { readScopedSecureOrDrainLegacySync } from '@/app/utils/readScopedSecureOrDrainLegacySync';
import type { LooseArchiveFile } from './types';

export { executionTotalDemandEstimate, parseLooseAmount } from './archivePortalAmountUtils';
export { mergedPreviewTimelineEvents } from './executionArchivePreviewTimeline';
export {
    formatExecutionArchiveClientDebtorLabel,
    formatExecutionArchiveCreditorLabel,
    formatExecutionArchiveDebtorLabel,
    resolveExecutionArchiveFileNumberYear,
} from './executionArchiveListLabels';
export {
    executionClaimBadgeArabic,
    resolveExecutionArchiveCardView,
    type ExecutionArchiveCardView,
} from './executionArchiveCardView';

/** دمج قائمة الإضابير مع النسخة الحية — القرص اختياري لأن get() كان يفكّ بلوب كل إضبارة. */
export function readExecutionFileLiveSnapshot(
    file: LooseArchiveFile,
    options?: { allowDisk?: boolean },
): ExecutionFile {
    const id = String((file as { id?: unknown }).id ?? '').trim();
    const allowDisk = options?.allowDisk === true;
    let fromStorage: Record<string, unknown> | null = null;
    if (id) {
        try {
            const key = executionStorageKey(id);
            const cached = allowDisk ? storageCache.get(key) : storageCache.peekMemory(key);
            if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
                fromStorage = cached as Record<string, unknown>;
            }
        } catch {
            /* ignore */
        }
        if (allowDisk && !fromStorage) {
            try {
                const raw = readScopedSecureOrDrainLegacySync(executionStorageKey(id));
                if (raw) {
                    const parsed = JSON.parse(raw) as unknown;
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        fromStorage = parsed as Record<string, unknown>;
                    }
                }
            } catch {
                /* ignore */
            }
        }
    }
    const merged = fromStorage
        ? ({ ...file, ...fromStorage, id: id || fromStorage.id } as LooseArchiveFile)
        : file;
    const rawCreditors = Array.isArray((merged as { creditors?: unknown }).creditors)
        ? (merged as { creditors: unknown[] }).creditors
        : null;
    const rawDebtors = Array.isArray((merged as { debtors?: unknown }).debtors)
        ? (merged as { debtors: unknown[] }).debtors
        : null;
    const snap = normalizeExecutionFileRecord(merged);
    if (rawCreditors && rawCreditors.length > 0) {
        snap.creditors = normalizeExecutionPartyList(rawCreditors, 'الدائن');
    }
    if (rawDebtors && rawDebtors.length > 0) {
        snap.debtors = normalizeExecutionPartyList(rawDebtors, 'المدين');
    }
    return snap;
}
