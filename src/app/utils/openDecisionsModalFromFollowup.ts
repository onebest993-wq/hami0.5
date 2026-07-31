import type { DecisionsModalBootTab } from '@/app/utils/decisionsModalBoot';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import { resolveExecutorDecisionRowContext } from '@/app/utils/executorSeizureDecisionQueue';

export const OPEN_DECISIONS_MODAL_EVENT = 'hami-open-decisions-modal';

export type OpenDecisionsModalFromFollowupInput = {
    /** معرّف تخزين القرارات — يُفضَّل الأب عند الإنابة */
    storageExecutionId: string | undefined;
    decisionId?: string;
    tab?: DecisionsModalBootTab;
    /** صف القرار — لاختيار التبويب الصحيح تلقائياً */
    decisionRow?: Record<string, unknown> | null;
    executionData?: Record<string, unknown> | null;
};

function isRowPendingExecutorOutcome(row: Record<string, unknown> | null | undefined): boolean {
    if (!row?.id) return true;
    const outcome = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending').trim();
    return !outcome || outcome === 'pending';
}

/** يحلّ معرّف تخزين القرارات من الصف والسياق — أب/فرع/مفتاح فعلي */
export function resolveFollowupDecisionsStorageId(input: {
    storageExecutionId?: string | undefined;
    decisionId?: string;
    decisionRow?: Record<string, unknown> | null;
    executionData?: Record<string, unknown> | null;
}): string {
    const decisionId = String(input.decisionId ?? input.decisionRow?.id ?? '').trim();
    const hints = [
        input.storageExecutionId,
        (input.executionData as { id?: string } | null)?.id,
        (input.executionData as { parentDossierId?: string } | null)?.parentDossierId,
        (input.executionData as { parentFileId?: string } | null)?.parentFileId,
    ]
        .map((v) => String(v ?? '').trim())
        .filter((v) => v && v !== 'default');

    if (decisionId) {
        for (const hint of hints) {
            const ctx = resolveExecutorDecisionRowContext(hint, decisionId);
            const resolved = String(ctx?.storageExecutionId ?? '').trim();
            if (resolved) return resolved;
        }
    }

    for (const hint of hints) {
        const canonical = resolveDecisionsStorageExecutionId(hint, input.executionData);
        if (canonical && canonical !== 'default') return canonical;
    }

    return hints[0] || '';
}

/** فتح مركز القرارات من محضر المتابعة — تبويب «الحالية» للطلبات المعلّقة */
export function dispatchOpenDecisionsModalFromFollowup(
    input: OpenDecisionsModalFromFollowupInput
): void {
    const storageExecutionId = resolveFollowupDecisionsStorageId({
        storageExecutionId: input.storageExecutionId,
        decisionId: input.decisionId,
        decisionRow: input.decisionRow,
        executionData: input.executionData,
    });
    if (!storageExecutionId) return;

    const decisionId = String(input.decisionId ?? '').trim();
    const resolvedTab =
        input.tab ??
        (decisionId
            ? isRowPendingExecutorOutcome(input.decisionRow)
                ? 'current'
                : 'previous'
            : 'current');

    try {
        window.dispatchEvent(
            new CustomEvent(OPEN_DECISIONS_MODAL_EVENT, {
                detail: {
                    executionId: storageExecutionId,
                    tab: resolvedTab,
                    ...(decisionId ? { decisionId } : {}),
                },
            })
        );
    } catch {
        /* ignore */
    }
}
