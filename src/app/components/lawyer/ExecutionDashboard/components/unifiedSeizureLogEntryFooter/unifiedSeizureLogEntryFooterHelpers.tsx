import React from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, ThirdPartySeizure } from '@/app/types/execution';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import {
    mergeSeizedMovableLists,
    mergeSeizedPropertyLists,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';
import { isExecutionHandlerStubLeaf } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionHandlerClusterStubs';
import { dispatchUnifiedSeizureLogFooterAction } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogFooterNavigation';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';

export function resolveExecutorDecisionRow(
    decisions: Array<Record<string, unknown>>,
    decisionId: string,
): Record<string, unknown> | null {
    const did = String(decisionId || '').trim();
    if (!did) return null;
    return decisions.find((row) => String(row?.id || '').trim() === did) || null;
}

export function isExecutorDecisionRowPending(row: Record<string, unknown> | null): boolean {
    if (!row) return false;
    const outcome = String(row.executorOutcome ?? 'pending').trim();
    return !outcome || outcome === 'pending';
}

export function SeizureDecisionPendingMirrorFooter(props: {
    executionId: string;
    decisionId: string;
    row: Record<string, unknown> | null;
    appealPerspective: string;
    onOutcomeApplied?: () => void;
}) {
    if (!props.row || !isExecutorDecisionRowPending(props.row)) return null;
    return (
        <ExecutorDecisionFollowupMirror
            executionId={props.executionId}
            row={props.row}
            appealPerspective={props.appealPerspective}
            onOutcomeApplied={props.onOutcomeApplied}
            className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-3"
        />
    );
}

export function dispatchFooterSeizureAction(
    executionId: string,
    decisionId: string,
    kind: 'property' | 'third_party' | 'salary_completion' | 'guarantor',
    subject?: string,
    guarantorFocusKind?: 'salary' | 'movable' | 'property',
): void {
    dispatchUnifiedSeizureLogFooterAction({
        executionId,
        decisionId,
        kind,
        subject,
        guarantorFocusKind,
    });
}

export function inferSeizureWorkflowStatusFromLogEntry(entry: UnifiedSeizureLogEntry): string {
    const code = String(entry.statusCode || '').trim();
    if (code === 'estimated') return 'valued';
    if (code === 'auction_scheduled') return 'published';
    return code || 'seized';
}

export function inferMovableWorkflowStatus(rawStatus: string): string {
    if (rawStatus === 'estimated') return 'valued';
    if (rawStatus === 'auction_scheduled') return 'published';
    return rawStatus;
}

export function inferPropertyWorkflowStatus(rawStatus: string): string {
    if (rawStatus === 'estimated') return 'valued';
    if (rawStatus === 'auction_scheduled') return 'published';
    return rawStatus;
}

export function list<T>(value: T[] | undefined | null): T[] {
    return Array.isArray(value) ? value : [];
}

export function mergeSeizedMovables(
    primary: SeizedMovable[],
    executionData?: ExecutionFile | null,
): SeizedMovable[] {
    const fromFile = executionData?.seizedMovables;
    const secondary = Array.isArray(fromFile) ? fromFile : [];
    return mergeSeizedMovableLists(primary, secondary);
}

export function mergeSeizedProperties(
    primary: SeizedProperty[],
    executionData?: ExecutionFile | null,
): SeizedProperty[] {
    const fromFile = executionData?.seizedProperties;
    const secondary = Array.isArray(fromFile) ? fromFile : [];
    return mergeSeizedPropertyLists(primary, secondary);
}

/** صف حجز لدى الغير من حالة الواجهة أو من بلوب الإضبارة — لا يُفقد السجل إن تأخّر hydrate الـ UI */
export function resolveThirdPartySeizureForLog(
    ui: ThirdPartySeizure[],
    executionData: ExecutionFile | null | undefined,
    seizureId: string,
): ThirdPartySeizure | null {
    const id = String(seizureId || '').trim();
    if (!id) return null;
    const fromUi = ui.find((s) => String(s?.id || '').trim() === id);
    if (fromUi) return fromUi;
    const fromFile = Array.isArray(executionData?.thirdPartySeizures)
        ? executionData.thirdPartySeizures.find((s) => String(s?.id || '').trim() === id)
        : undefined;
    return fromFile ?? null;
}

export function SeizureWorkflowLoadingShell({ label }: { label?: string }) {
    return (
        <div
            className="mt-3 space-y-1.5"
            dir="rtl"
            aria-busy="true"
            aria-label={label}
            data-testid="execution-seizure-workflow-paint-slot"
        >
            <div className="h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]" aria-hidden />
            <div className="h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]" aria-hidden />
        </div>
    );
}

export function resolveMovableInlineSaveCtxForUnifiedLog(
    ctx: MovableInlineSaveContext,
    seizedMovables: SeizedMovable[],
    persistExecutionMerge: (patch: Record<string, unknown>) => void,
): MovableInlineSaveContext {
    return {
        ...ctx,
        readMovables: () => {
            const fromCtx = ctx.readMovables?.();
            if (Array.isArray(fromCtx) && fromCtx.length > 0) return fromCtx;
            return seizedMovables;
        },
        persistMovables: (next) => {
            const fromHandler =
                typeof ctx.persistMovables === 'function' && !isExecutionHandlerStubLeaf(ctx.persistMovables)
                    ? ctx.persistMovables(next)
                    : undefined;
            if (fromHandler !== false) return true;
            persistExecutionMerge({ seizedMovables: next });
            return true;
        },
    };
}

