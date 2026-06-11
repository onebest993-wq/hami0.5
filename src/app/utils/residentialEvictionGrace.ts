import type { ExecutionFile } from '@/app/types/execution';
import { isVacateDeadlinePassed } from '@/app/utils/executionModuleStrategies';

export const HAMI_RESIDENTIAL_GRACE_CLEARED = 'hami-residential-grace-cleared';

export function isResidentialGraceYmd(value: string | null | undefined): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** مهلة سكنية مسجّلة وسارية — بداية ونهاية صالحتان ولم تُنهَ يدوياً أو تقويمياً */
export function hasActiveResidentialEvictionGrace(input: {
    premisesUse: string | null | undefined;
    gracePeriodStart: string | null | undefined;
    vacateDeadline: string | null | undefined;
    manuallyEndedAt?: string | null | undefined;
}): boolean {
    if (input.premisesUse !== 'residential') return false;
    if (!isResidentialGraceYmd(input.gracePeriodStart) || !isResidentialGraceYmd(input.vacateDeadline)) {
        return false;
    }
    if (input.manuallyEndedAt && String(input.manuallyEndedAt).trim()) return false;
    if (isVacateDeadlinePassed(input.vacateDeadline)) return false;
    return true;
}

/** دمج تصفير المهلة السكنية بعد موافقة المنفذ على «إنهاء المهلة» */
export function buildResidentialGraceEarlyEndApprovalMerge(
    executionData: ExecutionFile | null | undefined
): Record<string, unknown> {
    const pending = executionData?.caseTasksPending ?? [];
    return {
        eviction_vacate_deadline: null,
        eviction_residential_grace_period_start: null,
        eviction_executor_vacate_grant_approved: false,
        eviction_residential_grace_manually_ended_at: null,
        caseTasksPending: pending.filter((t) => !String(t.id).startsWith('eviction-residential-grace-')),
    };
}

export function dispatchResidentialGraceCleared(executionId: string): void {
    const id = String(executionId || '').trim();
    if (!id) return;
    try {
        window.dispatchEvent(
            new CustomEvent(HAMI_RESIDENTIAL_GRACE_CLEARED, {
                detail: { executionId: id },
            })
        );
    } catch {
        /* ignore */
    }
}
