import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import {
    readExecutorDecisionsArray,
    readSeizureRequestTarget,
} from '@/app/utils/executorSeizureDecisionQueue';
import { coalesceDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import type { UnifiedSeizureLogBuildInput } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntriesTypes';
import {
    guarantorSeizureSubtypeToLogKind,
    inferGuarantorSeizureSubtype,
    isExecutorRowPending,
    shouldIncludeExecutorSeizureDecisionRow,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntryInternalHelpers';

export type BuildUnifiedSeizureLogGuarantorParams = {
    input: UnifiedSeizureLogBuildInput;
    linkedPropertyDecisionIds: Set<string>;
    linkedSalaryDecisionIds: Set<string>;
    seenMovableDecisionIds: Set<string>;
};

export function buildUnifiedSeizureLogGuarantorEntries(
    params: BuildUnifiedSeizureLogGuarantorParams,
): UnifiedSeizureLogEntry[] {
    const {
        input,
        linkedPropertyDecisionIds,
        linkedSalaryDecisionIds,
        seenMovableDecisionIds,
    } = params;
    const entries: UnifiedSeizureLogEntry[] = [];

    const guarantorDecisionsExId = coalesceDecisionsStorageExecutionId({
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        executionId: input.executionId,
        executionData: input.viewExecutionData as Record<string, unknown> | null,
    });
    if (
        guarantorDecisionsExId &&
        guarantorDecisionsExId !== 'default' &&
        guarantorDecisionsExId !== 'undefined'
    ) {
        const rows = readExecutorDecisionsArray(guarantorDecisionsExId) as Array<Record<string, unknown>>;
        const gf = input.viewExecutionData?.guarantor_followup;
        const guarantorName = String(gf?.guarantor_name || '').trim();
        for (const row of rows) {
            if (readSeizureRequestTarget(row) !== 'guarantor') continue;
            if (String(row?.requestKind || '').trim() !== 'seizure') continue;
            const did = String(row?.id || '').trim();
            if (!did) continue;
            const rowSubtype = inferGuarantorSeizureSubtype(row);
            const kind = guarantorSeizureSubtypeToLogKind(rowSubtype);
            if (!kind) continue;
            if (kind === 'property' && linkedPropertyDecisionIds.has(did)) continue;
            if (kind === 'salary' && linkedSalaryDecisionIds.has(did)) continue;
            if (kind === 'movable' && seenMovableDecisionIds.has(did)) continue;
            if (!shouldIncludeExecutorSeizureDecisionRow(row)) continue;
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            const baseTitle = String(row?.title || '').trim();
            const titlePrefix = guarantorName ? `حجز كفيل — ${guarantorName}` : 'حجز كفيل';
            const title =
                baseTitle && !/كفيل|ضامن/i.test(baseTitle)
                    ? `${titlePrefix} — ${baseTitle}`
                    : baseTitle || titlePrefix;
            entries.push({
                id: `guarantor_decision:${did}`,
                kind,
                dateYmd: ymd,
                title,
                statusLabel: String(row?.seizureRequestSavedAt || '').trim()
                    ? 'مسجّل في السجل'
                    : isExecutorRowPending(row)
                      ? 'قيد البت لدى المنفذ'
                      : 'موافقة المنفذ — أكمل بيانات الكفيل',
                statusCode: String(row?.seizureRequestSavedAt ? 'seized' : isExecutorRowPending(row) ? 'pending' : 'seized'),
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز على الكفيل — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
    }

    return entries;
}
