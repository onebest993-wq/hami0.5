import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import {
    buildSalarySeizureDescriptionText,
    resolveSalarySeizureSubject,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureDisplayUtils';
import type { SeizedAsset } from '@/app/types/execution';
import {
    readExecutorDecisionsArray,
    readSeizureRequestTarget,
} from '@/app/utils/executorSeizureDecisionQueue';
import { coalesceDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import { buildSalarySeizureTabRows } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import type { UnifiedSeizureLogBuildInput } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntriesTypes';
import {
    executorSeizureDecisionStatusLabel,
    readAssetSeizureTarget,
    readSalaryDecisionRowId,
    seizureDecisionMatchesLogKind,
    shouldIncludeExecutorSeizureDecisionRow,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntryInternalHelpers';

export type BuildUnifiedSeizureLogSalaryResult = {
    entries: UnifiedSeizureLogEntry[];
    linkedSalaryDecisionIds: Set<string>;
};

export function buildUnifiedSeizureLogSalaryEntries(
    input: UnifiedSeizureLogBuildInput,
): BuildUnifiedSeizureLogSalaryResult {
    const entries: UnifiedSeizureLogEntry[] = [];

    const decisionsExIdForSalary = coalesceDecisionsStorageExecutionId({
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        executionId: input.executionId,
        executionData: input.viewExecutionData as Record<string, unknown> | null,
    });
    const salaryDrafts = (input.viewExecutionData?.seizureDraftsByDecisionId || {}) as Record<
        string,
        SeizedAsset
    >;
    const salaryAssetsForLog = buildSalarySeizureTabRows({
        registryAssets: (input.salarySeizureRegistryAssets || []) as SeizedAsset[],
        seizureDraftsByDecisionId: salaryDrafts,
        executionData: input.viewExecutionData ?? null,
        executionId: decisionsExIdForSalary || '',
    });
    const linkedSalaryDecisionIds = new Set<string>();
    for (const asset of salaryAssetsForLog) {
        const did = readSalaryDecisionRowId(asset);
        if (did) linkedSalaryDecisionIds.add(did);
    }

    for (const asset of salaryAssetsForLog) {
        const det =
            typeof asset?.details === 'object' && asset.details && !Array.isArray(asset.details)
                ? (asset.details as Record<string, unknown>)
                : null;
        const office = String(det?.employerName || '').trim();
        const salary = String(det?.salaryAmount || '').trim();
        const deductionRaw = det?.monthlyDeductionIqd ?? det?.monthlyDeduction ?? null;
        const deductionNum =
            typeof deductionRaw === 'number' && Number.isFinite(deductionRaw) && deductionRaw > 0
                ? Math.trunc(deductionRaw)
                : 0;
        const statusLabel =
            asset.status === 'seized'
                ? 'تم الحجز'
                : asset.status === 'released'
                  ? 'فُك الحجز'
                  : String(asset.status || '—');
        const subject = resolveSalarySeizureSubject(
            asset as unknown as Record<string, unknown>,
            input.viewExecutionData ?? null,
            coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId: input.decisionsStorageExecutionId,
                executionId: input.executionId,
                executionData: input.viewExecutionData as Record<string, unknown> | null,
            }),
        );
        const desc = buildSalarySeizureDescriptionText({
            employerName: office,
            salaryAmount: salary,
            monthlyDeductionIqd: deductionNum > 0 ? deductionNum : undefined,
            activeDebtorIsDeceased: input.activeDebtorIsDeceased,
            subject,
        });
        entries.push({
            id: `salary:${String(asset.id)}`,
            kind: 'salary',
            dateYmd: String(asset.seizureDate || ''),
            title:
                readAssetSeizureTarget(det) === 'guarantor' || /كفيل|ضامن/i.test(String(asset.type || ''))
                    ? input.activeDebtorIsDeceased
                        ? 'حجز مخصصات/مكافأة الكفيل'
                        : 'حجز راتب الكفيل'
                    : input.activeDebtorIsDeceased
                      ? 'حجز مخصصات/مكافأة'
                      : 'حجز راتب',
            statusLabel,
            statusCode: String(asset.status || ''),
            description: desc,
            entityId: String(asset.id),
        });
    }

    if (decisionsExIdForSalary && decisionsExIdForSalary !== 'default' && decisionsExIdForSalary !== 'undefined') {
        const rows = readExecutorDecisionsArray(decisionsExIdForSalary) as Array<Record<string, unknown>>;
        for (const row of rows) {
            const did = String(row?.id || '').trim();
            if (!did || linkedSalaryDecisionIds.has(did)) continue;
            if (String(row?.requestKind || '').trim() !== 'seizure') continue;
            if (readSeizureRequestTarget(row) === 'guarantor') continue;
            let rowSubtype = String(row?.seizureSubtype || '').trim();
            if (!rowSubtype && /راتب|مكافآت|حوافز|مخصصات/i.test(`${String(row?.title || '')}\n${String(row?.body || '')}`)) {
                rowSubtype = 'salary';
            }
            if (!seizureDecisionMatchesLogKind(rowSubtype, 'salary')) continue;
            if (!shouldIncludeExecutorSeizureDecisionRow(row)) continue;
            linkedSalaryDecisionIds.add(did);
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            entries.push({
                id: `salary_decision:${did}`,
                kind: 'salary',
                dateYmd: ymd,
                title: String(row?.title || '').trim() || (input.activeDebtorIsDeceased ? 'طلب حجز مخصصات' : 'طلب حجز راتب'),
                statusLabel: executorSeizureDecisionStatusLabel(row),
                statusCode: String(row.seizureRequestSavedAt ? 'seized' : 'pending'),
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز راتب — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
    }

    return { entries, linkedSalaryDecisionIds };
}
