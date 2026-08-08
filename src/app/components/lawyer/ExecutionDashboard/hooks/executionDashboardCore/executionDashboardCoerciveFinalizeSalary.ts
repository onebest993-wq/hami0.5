import { coalesceDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import {
    buildNextSeizedAssets,
    commitCoerciveFinalize,
    resolveFinalizeIdentity,
} from './executionDashboardCoerciveFinalizeShared';
import {
    buildSalarySeizureDescriptionTextLite,
    resolveSalarySeizureSubjectLite,
} from './executionDashboardSalarySubjectLite';
import type { FinalizeCoerciveSeizureInput } from './executionDashboardCoerciveFinalizeTypes';

export function finalizeCoerciveSalarySeizure(input: FinalizeCoerciveSeizureInput): void {
    const { decisionRowId, assetId } = resolveFinalizeIdentity(input);
    const dedRaw = String((input.details as any).monthlyDeductionIqd || '').trim();
    const parsedDeductionEarly = Number(dedRaw.replace(/,/g, ''));
    const resolvedSubject = resolveSalarySeizureSubjectLite(
        {
            details: {
                ...input.details,
                decisionRowId: String(decisionRowId),
            },
        },
        input.executionData ?? null,
        coalesceDecisionsStorageExecutionId({
            decisionsStorageExecutionId: input.decisionsStorageExecutionId,
            executionId: input.executionId,
            executionData: input.executionData as Record<string, unknown> | null,
        }),
    );
    const mergedDesc =
        String(input.details.description || '').trim() ||
        buildSalarySeizureDescriptionTextLite({
            employerName: String(input.details.employerName || ''),
            salaryAmount: String(input.details.salaryAmount || ''),
            monthlyDeductionIqd:
                Number.isFinite(parsedDeductionEarly) && parsedDeductionEarly > 0
                    ? Math.trunc(parsedDeductionEarly)
                    : undefined,
            activeDebtorIsDeceased: input.activeDebtorIsDeceased,
            subject: resolvedSubject,
        });

    const nextAssets = buildNextSeizedAssets({
        seizedAssets: input.seizedAssets,
        assetId,
        baseAssetType: 'salary',
        actionType: input.actionType,
        decisionRowId,
        details: {
            ...input.details,
            seizureTarget: String(input.details.seizureTarget || '').trim() || 'debtor',
            subjectRole: resolvedSubject.roleLabel,
            subjectName: resolvedSubject.personName,
        },
        mergedDesc,
    });

    const persistPatch: Record<string, unknown> = {};
    const parsedSalary = Number(String(input.details.salaryAmount || '').replace(/,/g, '').trim());
    if (Number.isFinite(parsedSalary) && parsedSalary > 0) {
        const garnishment = parsedSalary / 5;
        if (input.activeWorkspaceDebtorForFollowup?.isPrimary) {
            persistPatch.employeeSalary = parsedSalary;
            persistPatch.garnishmentAmount = garnishment;
        } else if (input.activeWorkspaceDebtorForFollowup?.key) {
            const debtorKey = String(input.activeWorkspaceDebtorForFollowup.key);
            persistPatch.perDebtorSalaries = {
                ...(input.executionData?.perDebtorSalaries || {}),
                [debtorKey]: String(parsedSalary),
            };
            persistPatch.perDebtorGarnishments = {
                ...(input.executionData?.perDebtorGarnishments || {}),
                [debtorKey]: String(garnishment),
            };
        }
    }
    if (Number.isFinite(parsedDeductionEarly) && parsedDeductionEarly > 0) {
        persistPatch.seizedAssets = nextAssets.map((a) => {
            if (a.id !== assetId) return a;
            const prevDetails =
                typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                    ? (a.details as Record<string, unknown>)
                    : {};
            return {
                ...a,
                details: {
                    ...prevDetails,
                    monthlyDeductionIqd: Math.trunc(parsedDeductionEarly),
                },
            };
        });
    }

    commitCoerciveFinalize({
        source: input,
        decisionRowId,
        assetId,
        mergedDesc,
        nextAssets: (persistPatch.seizedAssets as typeof nextAssets) ?? nextAssets,
        persistPatch,
    });
}
