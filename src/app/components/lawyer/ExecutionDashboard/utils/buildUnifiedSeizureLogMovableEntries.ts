import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import type { SeizedAsset, SeizedMovable } from '@/app/types/execution';
import {
    readExecutorDecisionsArray,
    readSeizureRequestTarget,
} from '@/app/utils/executorSeizureDecisionQueue';
import { mergeSeizedMovableLists } from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';
import type { UnifiedSeizureLogBuildInput } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntriesTypes';
import {
    executorSeizureDecisionStatusLabel,
    list,
    seizureDecisionMatchesLogKind,
    shouldIncludeExecutorSeizureDecisionRow,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntryInternalHelpers';

export type BuildUnifiedSeizureLogMovableResult = {
    entries: UnifiedSeizureLogEntry[];
    seenMovableDecisionIds: Set<string>;
};

export function buildUnifiedSeizureLogMovableEntries(
    input: UnifiedSeizureLogBuildInput,
): BuildUnifiedSeizureLogMovableResult {
    const entries: UnifiedSeizureLogEntry[] = [];

    const seizedMovablesForLog = mergeSeizedMovableLists(
        list(input.seizedMovablesForSeizureLog),
        Array.isArray((input.viewExecutionData as { seizedMovables?: unknown })?.seizedMovables)
            ? ((input.viewExecutionData as { seizedMovables?: SeizedMovable[] }).seizedMovables as SeizedMovable[])
            : [],
    );

    const seenMovableDecisionIds = new Set<string>();
    const seenMovableEntityIds = new Set<string>();

    for (const asset of input.movableSeizureRegistryAssets as SeizedAsset[]) {
        const det =
            typeof asset?.details === 'object' && asset.details && !Array.isArray(asset.details)
                ? (asset.details as Record<string, unknown>)
                : null;
        const linkedDid = String(det?.decisionRowId || asset?.id || '').trim();
        const assetId = String(asset?.id || '').trim();
        if (linkedDid) seenMovableDecisionIds.add(linkedDid);
        if (assetId) seenMovableEntityIds.add(assetId);
        const t = String(det?.movableAssetType || det?.vehicleDescription || '').trim();
        const est = String(det?.movableEstimatedValueIqd || '').trim();
        const notes = String(det?.movableNotes || '').trim();
        const statusLabel =
            asset.status === 'seized'
                ? 'تم الحجز'
                : asset.status === 'released'
                  ? 'فُك الحجز'
                  : String(asset.status || '—');
        const desc = [t ? `المال المنقول: ${t}` : null, est ? `قيمة تقديرية: ${est}` : null, notes ? `ملاحظات:\n${notes}` : null]
            .filter(Boolean)
            .join('\n');
        entries.push({
            id: `movable:${String(asset.id)}`,
            kind: 'movable',
            dateYmd: String(asset.seizureDate || ''),
            title: 'حجز مال منقول',
            statusLabel,
            statusCode: String(asset.status || ''),
            description: desc,
            entityId: String(asset.id),
        });
    }

    for (const m of seizedMovablesForLog) {
        const mid = String(m.id || '').trim();
        const did = String(m.decisionRowId || m.id || '').trim();
        if (mid && seenMovableEntityIds.has(mid)) continue;
        if (did && seenMovableDecisionIds.has(did)) continue;
        if (mid) seenMovableEntityIds.add(mid);
        if (did) seenMovableDecisionIds.add(did);
        const ymd = String(m.seizedAtIso || '').slice(0, 10) || '';
        const statusCode = String(m.status || '');
        const statusLabel =
            statusCode === 'seized'
                ? 'تم الحجز'
                : statusCode === 'released'
                  ? 'فُك الحجز'
                  : statusCode === 'published'
                    ? 'قيد النشر والمزايدة'
                    : statusCode === 'valued' || statusCode === 'estimated'
                      ? 'تم التقدير'
                      : statusCode === 'initial_award'
                        ? 'إحالة أولية'
                        : statusCode === 'no_bidders'
                          ? 'لا راغب'
                          : statusCode === 'sold'
                            ? 'مباع'
                            : statusCode === 'estimation_objected'
                              ? 'تم الاعتراض'
                              : statusCode || '—';
        const desc = [
            String(m.movableDescription || '').trim() ? `وصف المال المنقول: ${String(m.movableDescription || '').trim()}` : null,
            String(m.movableLocation || '').trim() ? `المكان: ${String(m.movableLocation || '').trim()}` : null,
            String(m.judicialCustodianName || '').trim()
                ? `الحارس القضائي: ${String(m.judicialCustodianName || '').trim()}`
                : null,
        ]
            .filter(Boolean)
            .join('\n');
        entries.push({
            id: `movable_entity:${String(m.id)}`,
            kind: 'movable',
            dateYmd: ymd,
            title: 'حجز مال منقول',
            statusLabel,
            statusCode: String(m.status || ''),
            description: desc,
            entityId: String(m.id),
        });
    }

    const movableDecisionsExId = String(
        input.decisionsStorageExecutionId || input.viewExecutionData?.id || ''
    ).trim();
    if (movableDecisionsExId && movableDecisionsExId !== 'default' && movableDecisionsExId !== 'undefined') {
        const rows = readExecutorDecisionsArray(movableDecisionsExId) as Array<Record<string, unknown>>;
        for (const row of rows) {
            const did = String(row?.id || '').trim();
            if (!did || seenMovableDecisionIds.has(did)) continue;
            if (String(row?.requestKind || '').trim() !== 'seizure') continue;
            if (readSeizureRequestTarget(row) === 'guarantor') continue;
            let rowSubtype = String(row?.seizureSubtype || '').trim();
            if (!rowSubtype && /منقول|مركبة/i.test(`${String(row?.title || '')}\n${String(row?.body || '')}`)) {
                rowSubtype = 'movable';
            }
            if (!seizureDecisionMatchesLogKind(rowSubtype, 'movable')) continue;
            if (!shouldIncludeExecutorSeizureDecisionRow(row)) continue;
            seenMovableDecisionIds.add(did);
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            entries.push({
                id: `movable_decision:${did}`,
                kind: 'movable',
                dateYmd: ymd,
                title: String(row?.title || '').trim() || 'طلب حجز مال منقول',
                statusLabel: executorSeizureDecisionStatusLabel(row),
                statusCode: 'seized',
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز مال منقول — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
    }

    return { entries, seenMovableDecisionIds };
}
