// @ts-nocheck
import {
    readExecutorDecisionsFromActiveNamespace,
    writeExecutorDecisionsArray,
} from '@/app/utils/executionDecisionsNamespace';
import {
    dispatchDomainIsolationBlocked,
    gateExecutorRequestPersist,
    readExecutionDataForDomainGate,
} from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';

export const DECISIONS_RELOAD_EVENT = 'hami-decisions-reload';

function dispatchDecisionsReload(): void {
    try {
        window.dispatchEvent(new CustomEvent(DECISIONS_RELOAD_EVENT));
    } catch {
        /* ignore */
    }
}

function executorDecisionRowHubDefaults(): { status: 'pending'; appealPhase: null } {
    return { status: 'pending', appealPhase: null };
}

function newExecutorDecisionId(prefix: string): string {
    const c = (globalThis as any).crypto as { randomUUID?: () => string } | undefined;
    const uuid = c?.randomUUID?.();
    if (uuid) return `${prefix}_${uuid}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function assertSpecialFollowupDomainGate(executionId: string | undefined): boolean {
    const gate = gateExecutorRequestPersist(executionId, 'special_followup');
    if (!gate.allowed) {
        dispatchDomainIsolationBlocked(gate.reasonAr || 'الطلب غير مسموح في هذا المسار', 'special_followup');
        return false;
    }
    return true;
}

function readActiveSpecialFollowupDecisions(executionId: string | undefined): Record<string, unknown>[] {
    return readExecutorDecisionsFromActiveNamespace(
        executionId,
        readExecutionDataForDomainGate(executionId),
    );
}

function persistSpecialFollowupDecisions(
    executionId: string | undefined,
    rows: Record<string, unknown>[],
): void {
    const data = readExecutionDataForDomainGate(executionId);
    const persistId = resolveDecisionsStorageExecutionId(executionId, data);
    writeExecutorDecisionsArray(persistId !== 'default' ? persistId : executionId, rows, data);
    dispatchDecisionsReload();
}

export function appendSpecialFollowupRequest(input: {
    executionId: string | undefined;
    requestDate: string;
    content: string;
    appealRequestOrigin?: 'creditor_side' | 'debtor_side' | 'executor_side';
    decisionTitle?: string;
    payloadJson?: string;
}): string | null {
    if (!assertSpecialFollowupDomainGate(input.executionId)) {
        return null;
    }

    const trimmed = String(input.content || '').trim();
    const body = `بتاريخ ${input.requestDate}:\n\n${trimmed}`;
    const rowId = newExecutorDecisionId('special_followup');

    try {
        const rows = readActiveSpecialFollowupDecisions(input.executionId);
        const resolvedTitle = String(input.decisionTitle || '').trim() || 'طلب تنفيذي خاص';
        const payloadJson = String(input.payloadJson || '').trim();
        const dupPending = rows.some((row) => {
            const pending =
                (row as any).executorOutcome === 'pending' || (row as any).executorOutcome === undefined;
            if (!pending) return false;
            if (String((row as any).requestKind || '') !== 'special_followup') return false;
            return (
                String((row as any).title || '').trim() === resolvedTitle &&
                String((row as any).body || '').trim() === body &&
                String((row as any).payloadJson || '').trim() === payloadJson
            );
        });
        if (dupPending) {
            dispatchDecisionsReload();
            return null;
        }

        rows.unshift({
            id: rowId,
            title: resolvedTitle,
            body,
            date: input.requestDate,
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'special_followup' as const,
            ...(payloadJson ? { payloadJson } : {}),
            ...(input.appealRequestOrigin ? { appealRequestOrigin: input.appealRequestOrigin } : {}),
            ...executorDecisionRowHubDefaults(),
        });

        persistSpecialFollowupDecisions(input.executionId, rows);
        return rowId;
    } catch {
        return null;
    }
}
