import type React from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty } from '@/app/types/execution';

export type TrustDisbursedDetail = {
    executionId?: string;
    seizedMovableId?: string;
    seizedPropertyId?: string;
};

export type TrustDisbursedOutcomeContext = {
    executionDataId?: string;
    executionId?: string;
    executionDataRef: React.MutableRefObject<ExecutionFile | null>;
    persistExecutionMergeRef: React.MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
};

export function handleTrustDisbursedEvent(e: Event, ctx: TrustDisbursedOutcomeContext): void {
    const ce = e as CustomEvent<TrustDisbursedDetail>;
    const myId = String(ctx.executionDataId ?? ctx.executionId ?? '');
    if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;

    const seizedMovableId = String(ce.detail?.seizedMovableId ?? '').trim();
    const seizedPropertyId = String(ce.detail?.seizedPropertyId ?? '').trim();
    const nowIso = new Date().toISOString();

    if (seizedMovableId) {
        const movables = (ctx.executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const hit = movables.find((row) => String(row.id || '').trim() === seizedMovableId);
        if (!hit) return;
        const sold = String(hit.status || '') === 'sold';
        const delivered = Boolean(String(hit.buyerDeliveryCompletedAtIso || '').trim());
        const proceedsDone = Boolean(String(hit.proceedsDisburseCompletedAtIso || '').trim());
        if (!sold || !delivered || proceedsDone) return;
        const nextMovables = movables.map((row) =>
            String(row.id || '').trim() === seizedMovableId
                ? ({ ...row, proceedsDisburseCompletedAtIso: nowIso } as SeizedMovable)
                : row
        );
        ctx.persistExecutionMergeRef.current?.({ seizedMovables: nextMovables });
        return;
    }

    if (seizedPropertyId) {
        const properties = (ctx.executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
        const hit = properties.find((row) => String(row.id || '').trim() === seizedPropertyId);
        if (!hit) return;
        const sold = String(hit.status || '') === 'sold';
        const delivered = Boolean(String(hit.buyerDeliveryCompletedAtIso || '').trim());
        const titleDone = Boolean(String(hit.titleTransferCompletedAtIso || '').trim());
        const proceedsDone = Boolean(String(hit.proceedsDisburseCompletedAtIso || '').trim());
        if (!sold || !titleDone || !delivered || proceedsDone) return;
        const nextProperties = properties.map((row) =>
            String(row.id || '').trim() === seizedPropertyId
                ? ({ ...row, proceedsDisburseCompletedAtIso: nowIso } as SeizedProperty)
                : row
        );
        ctx.persistExecutionMergeRef.current?.({ seizedProperties: nextProperties });
    }
}
