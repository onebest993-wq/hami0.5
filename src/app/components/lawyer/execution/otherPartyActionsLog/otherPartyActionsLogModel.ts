import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { OtherPartyActionLogEntry } from '@/app/types/execution';
import {
    buildOtherPartyActionLogEntry,
    prependOtherPartyActionLog,
} from '@/app/application/execution/followup/otherPartyActionLogPersist';
import {
    resolveOtherPartyLogDecisionRow,
    resolveOtherPartyLogEntryOutcome,
} from '@/app/application/execution/followup/otherPartyActionLogOutcome';
import {
    DECISIONS_RELOAD_EVENT,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import { shouldShowSpecialFollowupExecutorStrip } from '@/app/components/lawyer/ExecutionDashboard/utils/dossierControlDecisions';

export type OtherPartyActionsLogProps = {
    entries: OtherPartyActionLogEntry[];
    onPersist: (next: OtherPartyActionLogEntry[]) => void;
    onSubmitToDecisions: (input: {
        date: string;
        content: string;
    }) => { ok: boolean; decisionId?: string; logEntryId?: string } | undefined | null;
    embedded?: boolean;
    hideSavedEntries?: boolean;
    executionId?: string;
    appealPerspective?: AppealUiPerspective;
};

/** يمنع انهيار «reading ok of undefined» عندما يكون المعالج stub أو لم يُحمَّل بعد */
export function normalizeOtherPartySubmitResult(
    result: { ok: boolean; decisionId?: string; logEntryId?: string } | undefined | null,
): { ok: boolean; decisionId?: string; logEntryId?: string } {
    if (result && typeof result === 'object' && typeof result.ok === 'boolean') {
        return result;
    }
    return { ok: false };
}

export function useMergedOtherPartyEntries(entries: OtherPartyActionLogEntry[]) {
    const [optimisticEntries, setOptimisticEntries] = useState<OtherPartyActionLogEntry[]>([]);

    useEffect(() => {
        setOptimisticEntries((prev) =>
            prev.filter((row) => !entries.some((saved) => saved.id === row.id)),
        );
    }, [entries]);

    const mergedEntries = useMemo(() => {
        const merged = new Map<string, OtherPartyActionLogEntry>();
        const decisionOwner = new Map<string, string>();

        for (const row of [...optimisticEntries, ...entries]) {
            const decisionId = String(row.decisionRowId || '').trim();
            if (decisionId) {
                const existingId = decisionOwner.get(decisionId);
                if (existingId && existingId !== row.id) {
                    merged.delete(existingId);
                }
                decisionOwner.set(decisionId, row.id);
            }
            merged.set(row.id, row);
        }

        return [...merged.values()];
    }, [entries, optimisticEntries]);

    return { mergedEntries, setOptimisticEntries };
}

export function isPendingExecutorDecisionRow(row: Record<string, unknown> | null | undefined): boolean {
    if (!row) return false;
    const outcome = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending');
    return outcome === 'pending' || outcome === '';
}

/** البطاقة العلوية فقط للطلب قيد البت — المُعتمد/المرفوض يبقى في السجل السفلي */
export function resolveActiveOtherPartyRequestCard(
    sorted: OtherPartyActionLogEntry[],
    decisions: Record<string, unknown>[],
    exId: string,
    appealPerspective: AppealUiPerspective,
): { entry: OtherPartyActionLogEntry; row: Record<string, unknown> } | null {
    if (!exId || sorted.length === 0) return null;

    for (const entry of sorted) {
        const row = resolveOtherPartyLogDecisionRow(entry, decisions);
        if (!row || !isPendingExecutorDecisionRow(row)) continue;
        if (
            !shouldShowSpecialFollowupExecutorStrip(row, {
                allDecisions: decisions,
                appealPerspective,
            })
        ) {
            continue;
        }
        return { entry, row };
    }

    const pending = sorted.find((e) => e.outcome === 'pending');
    if (!pending) return null;
    const row = resolveOtherPartyLogDecisionRow(pending, decisions);
    if (!row || !isPendingExecutorDecisionRow(row)) return null;
    if (
        !shouldShowSpecialFollowupExecutorStrip(row, {
            allDecisions: decisions,
            appealPerspective,
        })
    ) {
        return null;
    }
    return { entry: pending, row };
}

/** يمنع تكرار نفس السجل في البطاقة والقائمة — فقط للطلب النشط قيد البت */
export function excludeActiveCardFromSavedList(
    sorted: OtherPartyActionLogEntry[],
    activeCard: { entry: OtherPartyActionLogEntry } | null | undefined,
): OtherPartyActionLogEntry[] {
    const activeId = String(activeCard?.entry.id || '').trim();
    if (!activeId) return sorted;
    return sorted.filter((row) => row.id !== activeId);
}

export function commitOtherPartySaveResult(args: {
    submitRes: { ok: boolean; decisionId?: string; logEntryId?: string };
    date: string;
    content: string;
    entries: OtherPartyActionLogEntry[];
    hideSavedEntries: boolean;
    onPersist: (next: OtherPartyActionLogEntry[]) => void;
    setOptimisticEntries: Dispatch<SetStateAction<OtherPartyActionLogEntry[]>>;
}): void {
    const { submitRes, date, content, entries, hideSavedEntries, onPersist, setOptimisticEntries } =
        args;
    const row = buildOtherPartyActionLogEntry({
        id: submitRes.logEntryId,
        date,
        content,
        decisionRowId: submitRes.decisionId,
    });

    if (!hideSavedEntries) {
        const handlerAlreadyPersisted = Boolean(submitRes.logEntryId);
        if (!handlerAlreadyPersisted) {
            onPersist(prependOtherPartyActionLog(entries, row));
        }
    }

    if (submitRes.decisionId || submitRes.logEntryId) {
        setOptimisticEntries((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(DECISIONS_RELOAD_EVENT));
    }
}

export function resolveSavedEntryOutcome(
    entry: OtherPartyActionLogEntry,
    decisions: Record<string, unknown>[],
): OtherPartyActionLogEntry['outcome'] {
    return resolveOtherPartyLogEntryOutcome(entry, decisions);
}

export function useFollowupDecisions(executionId: string | undefined) {
    const exId = String(executionId || '').trim();
    const [decisions, setDecisions] = useState<Record<string, unknown>[]>(() =>
        readExecutorDecisionsArray(exId)
    );
    useEffect(() => {
        const sync = () => setDecisions(readExecutorDecisionsArray(exId));
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [exId]);
    return decisions;
}
