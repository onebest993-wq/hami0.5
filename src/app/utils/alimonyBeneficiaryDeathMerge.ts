import type { ExecutionFile } from '@/app/types/execution';
import {
    getEffectiveClaimTypes,
    hasCompositeNonOngoingClaimTypes,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { resolveAlimonyFinancialBreakdown } from '@/app/utils/alimonyFinancialBreakdown';
import type {
    AlimonyBeneficiaryDeathInput,
    AlimonyBeneficiaryDeathState,
} from '@/app/utils/alimonyBeneficiaryDeathTypes';
import { readMoney } from '@/app/utils/alimonyBeneficiaryDeathProfileHelpers';
import { resolveAlimonyBeneficiaryProfile } from '@/app/utils/alimonyBeneficiaryDeathProfile';

/** إغلاق الإضبارة بعد استنفاد مستحقي النفقة — ما لم تبقَ مطالبات مركّبة بمبلغ متبقٍ */
export function shouldCloseDossierAfterAllAlimonyBeneficiariesDeceased(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined,
    survivingTotalAmount: number,
): boolean {
    if (!hasCompositeNonOngoingClaimTypes(executionData as Record<string, unknown>)) {
        return true;
    }
    return Math.max(0, Math.round(Number(survivingTotalAmount) || 0)) <= 0;
}

export function buildAlimonyBeneficiaryDeathMerge(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined,
    input: AlimonyBeneficiaryDeathInput,
): Record<string, unknown> | null {
    const profile = resolveAlimonyBeneficiaryProfile(executionData);
    if (!profile) return null;

    const wifeDeceased = Boolean(input.wifeDeceased) && profile.wifeAlive;
    const childrenDied = Math.max(
        0,
        Math.min(Math.trunc(Number(input.childrenDiedCount) || 0), profile.childrenAlive),
    );
    if (!wifeDeceased && childrenDied <= 0) return null;

    const prev = profile.deathState;
    const nextDeathState: AlimonyBeneficiaryDeathState = {
        wife_deceased: prev.wife_deceased || wifeDeceased,
        children_deceased_count: (prev.children_deceased_count ?? 0) + childrenDied,
        last_report_at: new Date().toISOString(),
    };

    const ed = executionData as Record<string, unknown>;
    const pastSeparate = getEffectiveClaimTypes(ed).includes('نفقة ماضية');
    const breakdown = resolveAlimonyFinancialBreakdown(executionData as ExecutionFile);
    let reduction = 0;
    if (wifeDeceased && breakdown) {
        reduction += breakdown.wifeBaseAccumulation;
        if (!pastSeparate) {
            reduction += breakdown.pastWifeAccumulation;
        }
    }
    if (childrenDied > 0 && breakdown && profile.childrenCount > 0) {
        const ongoingPerChild = breakdown.childrenBaseAccumulation / profile.childrenCount;
        const pastPerChild = pastSeparate
            ? 0
            : (breakdown.pastChildrenAccumulation || 0) / profile.childrenCount;
        reduction += (ongoingPerChild + pastPerChild) * childrenDied;
    }

    const nextChildrenCount = Math.max(0, profile.childrenAlive - childrenDied);
    const nextWifeMonthly =
        profile.hasWifeBenefit && !nextDeathState.wife_deceased ? profile.wifeMonthly : 0;
    const nextChildMonthly =
        profile.hasChildrenBenefit && nextChildrenCount > 0 ? profile.childMonthly : 0;

    const calc = (ed.alimony as { calculated?: Record<string, unknown> } | undefined)?.calculated;
    const nextCalculated = calc
        ? {
              ...calc,
              wifeBaseAccumulation: nextDeathState.wife_deceased
                  ? 0
                  : calc.wifeBaseAccumulation,
              childrenBaseAccumulation:
                  nextChildrenCount <= 0
                      ? 0
                      : Math.max(
                            0,
                            Math.round(
                                (Number(calc.childrenBaseAccumulation) || 0) -
                                    (childrenDied > 0 && profile.childrenCount > 0
                                        ? ((Number(calc.childrenBaseAccumulation) || 0) /
                                              profile.childrenCount) *
                                          childrenDied
                                        : 0),
                            ),
                        ),
              baseAccumulation: Math.max(
                  0,
                  Math.round((Number(calc.baseAccumulation) || 0) - reduction),
              ),
              totalAccumulated: pastSeparate
                  ? Math.max(
                        0,
                        Math.round((Number(calc.baseAccumulation) || 0) - reduction),
                    )
                  : Math.max(
                        0,
                        Math.round((Number(calc.totalAccumulated) || 0) - reduction),
                    ),
          }
        : undefined;

    const prevTotal = readMoney(ed.totalAmount);
    const nextTotal = Math.max(0, prevTotal - reduction);

    const wifeAliveAfter = profile.hasWifeBenefit && !nextDeathState.wife_deceased;
    const childrenAliveAfter = profile.hasChildrenBenefit ? nextChildrenCount : 0;
    const nextMonthlyOngoing =
        (wifeAliveAfter ? nextWifeMonthly : 0) +
        (childrenAliveAfter > 0 ? nextChildMonthly * childrenAliveAfter : 0);
    const allDeceased = !wifeAliveAfter && childrenAliveAfter <= 0;

    const prevAlimony =
        typeof ed.alimony === 'object' && ed.alimony ? (ed.alimony as Record<string, unknown>) : {};
    const nextCalculatedWithOngoing = nextCalculated
        ? { ...nextCalculated, monthlyOngoing: nextMonthlyOngoing }
        : nextMonthlyOngoing > 0
          ? { monthlyOngoing: nextMonthlyOngoing }
          : undefined;

    const merge: Record<string, unknown> = {
        alimony_beneficiary_death: nextDeathState,
        monthlyWifeAlimony: nextWifeMonthly,
        monthly_wife_alimony: nextWifeMonthly,
        monthlyChildrenAlimony: nextChildMonthly,
        monthly_children_alimony: nextChildMonthly,
        monthlyAlimony: nextMonthlyOngoing,
        childrenCount: nextChildrenCount,
        children_count: nextChildrenCount,
        alimonyChildrenCount: String(nextChildrenCount),
        totalAmount: nextTotal,
        alimony: {
            ...prevAlimony,
            ...(profile.beneficiaryKind ? { beneficiary: profile.beneficiaryKind } : {}),
            wifeMonthly: nextWifeMonthly > 0 ? String(nextWifeMonthly) : '0',
            childrenMonthly: nextChildMonthly > 0 ? String(nextChildMonthly) : '0',
            childrenCount: nextChildrenCount,
            ...(nextCalculatedWithOngoing ? { calculated: nextCalculatedWithOngoing } : {}),
        },
    };

    if (allDeceased) {
        merge.is_creditor_deceased = true;
        if (shouldCloseDossierAfterAllAlimonyBeneficiariesDeceased(ed, nextTotal)) {
            Object.assign(merge, {
                dossier_lifecycle_status: 'finished',
                dossier_status_reason: 'وفاة جميع مستحقي النفقة — إغلاق الإضبارة',
                dossier_status_date: new Date().toISOString().slice(0, 10),
            });
        }
    }

    return merge;
}
