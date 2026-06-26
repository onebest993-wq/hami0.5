import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';
import type { SalarySeizureDetailsPatch } from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import {
    buildSalarySeizureDescriptionText,
    resolveSalarySeizureSubject,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureDisplayUtils';

export function applySalarySeizureAssetDetailsPatch(
    seizedAssets: SeizedAsset[],
    assetId: string,
    patch: SalarySeizureDetailsPatch,
    opts: {
        activeDebtorIsDeceased: boolean;
        executionData: ExecutionFile | null | undefined;
        storageExecutionId: string | undefined;
    },
): SeizedAsset[] {
    const target = seizedAssets.find((a) => a.id === assetId);
    const prevDetails =
        typeof target?.details === 'object' && target.details && !Array.isArray(target.details)
            ? (target.details as Record<string, unknown>)
            : {};

    const mergedDesc = buildSalarySeizureDescriptionText({
        employerName: String(patch.employerName ?? prevDetails.employerName ?? ''),
        salaryAmount: patch.salaryAmount,
        monthlyDeductionIqd: patch.monthlyDeductionIqd > 0 ? patch.monthlyDeductionIqd : undefined,
        activeDebtorIsDeceased: opts.activeDebtorIsDeceased,
        subject: resolveSalarySeizureSubject(
            (target as Record<string, unknown>) ?? { details: { salaryAmount: patch.salaryAmount } },
            opts.executionData ?? null,
            opts.storageExecutionId,
        ),
    });

    return seizedAssets.map((a) => {
        if (a.id !== assetId) return a;
        return {
            ...a,
            description: mergedDesc || a.description,
            details: {
                ...prevDetails,
                salaryAmount: patch.salaryAmount,
                ...(patch.employerName != null
                    ? { employerName: String(patch.employerName).trim() }
                    : {}),
                ...(patch.monthlyDeductionIqd > 0
                    ? { monthlyDeductionIqd: Math.trunc(patch.monthlyDeductionIqd) }
                    : {}),
            },
        };
    });
}
