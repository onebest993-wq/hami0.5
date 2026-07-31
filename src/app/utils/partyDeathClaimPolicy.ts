import {
    hasOngoingAlimonyInExecution,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { shouldCloseDossierAfterAllAlimonyBeneficiariesDeceased } from '@/app/utils/alimonyBeneficiaryDeathUtils';
import { isCustodyRemovalClaim } from '@/app/utils/executionModuleStrategies';
import { isMatwaaClaim, isVisitationClaim } from '@/app/utils/followupSpecializationVisibility';
import { resolvePrimaryExecutionClaimType } from '@/app/utils/executionClaimIsolation';

export type PartyDeathRole = 'creditor' | 'debtor';

/** مطالبات أحوال شخصية — لا إحلال ورثة ولا أثر وراثي في التنفيذ */
export function isPersonalStatusNoHeirClaim(claimType: string | undefined | null): boolean {
    const c = String(claimType || '').trim();
    return isVisitationClaim(c) || isCustodyRemovalClaim(c) || isMatwaaClaim(c);
}

export function isPersonalStatusNoHeirExecution(
    executionData: Record<string, unknown> | null | undefined,
    fallbackClaimType?: string
): boolean {
    if (hasOngoingAlimonyInExecution(executionData, fallbackClaimType)) return true;
    const claim = resolveExecutionClaimForDeathPolicy(executionData, fallbackClaimType);
    return isPersonalStatusNoHeirClaim(claim);
}

export function resolveExecutionClaimForDeathPolicy(
    executionData: Record<string, unknown> | null | undefined,
    fallbackClaimType?: string
): string {
    return resolvePrimaryExecutionClaimType(executionData as never, fallbackClaimType);
}

export function isHeirSubstitutionAllowedForClaim(
    executionData: Record<string, unknown> | null | undefined,
    fallbackClaimType?: string,
    _deceasedParty?: PartyDeathRole
): boolean {
    return !isPersonalStatusNoHeirExecution(executionData, fallbackClaimType);
}

/** إغلاق الإضبارة تلقائياً عند إبلاغ الوفاة (دون مسار ورثة) */
export function shouldAutoFinishDossierOnDeathReport(
    executionData: Record<string, unknown> | null | undefined,
    fallbackClaimType: string | undefined,
    deceasedParty: PartyDeathRole,
    opts?: { allAlimonyBeneficiariesDeceased?: boolean; survivingTotalAmount?: number }
): boolean {
    const survivingTotal =
        opts?.survivingTotalAmount ??
        Math.max(0, Math.round(Number(executionData?.totalAmount) || 0));

    if (deceasedParty === 'creditor') {
        if (hasOngoingAlimonyInExecution(executionData, fallbackClaimType)) {
            if (opts?.allAlimonyBeneficiariesDeceased !== true) return false;
            return shouldCloseDossierAfterAllAlimonyBeneficiariesDeceased(
                executionData,
                survivingTotal
            );
        }
        const claim = resolveExecutionClaimForDeathPolicy(executionData, fallbackClaimType);
        if (isPersonalStatusNoHeirClaim(claim)) return true;
        if (opts?.allAlimonyBeneficiariesDeceased) {
            return shouldCloseDossierAfterAllAlimonyBeneficiariesDeceased(
                executionData,
                survivingTotal
            );
        }
    }
    if (deceasedParty === 'debtor') {
        const claim = resolveExecutionClaimForDeathPolicy(executionData, fallbackClaimType);
        if (isVisitationClaim(claim) || isCustodyRemovalClaim(claim) || isMatwaaClaim(claim)) {
            return true;
        }
        if (opts?.allAlimonyBeneficiariesDeceased) {
            return shouldCloseDossierAfterAllAlimonyBeneficiariesDeceased(
                executionData,
                survivingTotal
            );
        }
    }
    return false;
}

export function buildDossierAutoFinishPatch(reason: string): Record<string, unknown> {
    const now = new Date().toISOString();
    return {
        dossier_lifecycle_status: 'finished' as const,
        dossier_status_reason: reason,
        dossier_status_date: now.slice(0, 10),
    };
}

/** طبقة متابعة — إخفاء التنفيذ الجبري الشخصي عند وفاة المدين (أي مطالبة) */
export function applyDebtorDeathFollowupOverlay<T extends Record<string, unknown>>(
    flags: T,
    activeDebtorIsDeceased: boolean
): T {
    if (!activeDebtorIsDeceased) return flags;
    return {
        ...flags,
        hidePersonalCoerciveFollowupTab: true,
        suppressHiddenPersonalCoerciveRequests: true,
        hidePersonalForcedBringActivation: true,
        hidePersonalJudgePresentation: true,
    };
}
