import { useMemo } from 'react';
import { isPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';
import {
    isHeirSubstitutionAllowedForClaim,
    isPersonalStatusNoHeirExecution,
} from '@/app/utils/partyDeathClaimPolicy';
import {
    resolveAlimonyBeneficiaryProfile,
} from '@/app/utils/alimonyBeneficiaryDeathUtils';
import { hasOngoingAlimonyInExecution } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';

export function useDossierDeathStatus(
    executionData: any,
    debtors: any[],
    claimType?: string,
) {
    const isDebtorDeceasedForEvictionHeirs =
        executionData?.is_debtor_deceased === true ||
        isPartyDeathCaseForRole(executionData, 'debtor') ||
        Boolean(debtors[0] && (debtors[0] as { isDeceased?: boolean }).isDeceased);

    const creditorDeathMarked = useMemo(() => {
        const c0 = executionData?.creditors?.[0] as { isDeceased?: boolean } | undefined;
        return Boolean(executionData?.is_creditor_deceased || c0?.isDeceased);
    }, [executionData?.is_creditor_deceased, executionData?.creditors]);

    const debtorDeathMarked = useMemo(() => {
        const d0 = executionData?.debtors?.[0] as { isDeceased?: boolean } | undefined;
        return Boolean(executionData?.is_debtor_deceased || d0?.isDeceased);
    }, [executionData?.is_debtor_deceased, executionData?.debtors]);

    const heirSubstitutionAllowed = useMemo(
        () => isHeirSubstitutionAllowedForClaim(executionData, claimType),
        [executionData, claimType]
    );

    const ongoingAlimonyClaim = useMemo(
        () => hasOngoingAlimonyInExecution(executionData, claimType),
        [executionData, claimType]
    );

    const alimonyBeneficiaryProfile = useMemo(
        () => (ongoingAlimonyClaim ? resolveAlimonyBeneficiaryProfile(executionData) : null),
        [executionData, ongoingAlimonyClaim]
    );

    const creditorDeathMenuLabel = useMemo(() => {
        if (ongoingAlimonyClaim && alimonyBeneficiaryProfile?.anyBeneficiaryAlive) {
            return 'الإبلاغ عن وفاة مستحقي النفقة';
        }
        if (!heirSubstitutionAllowed || isPersonalStatusNoHeirExecution(executionData, claimType)) {
            return 'الإبلاغ عن وفاة الدائن';
        }
        return creditorDeathMarked
            ? 'طلب إحلال ورثة محل الدائن المتوفي'
            : 'الإبلاغ عن وفاة الدائن';
    }, [
        alimonyBeneficiaryProfile?.anyBeneficiaryAlive,
        claimType,
        creditorDeathMarked,
        executionData,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
    ]);

    const debtorDeathMenuLabel = useMemo(() => {
        if (!heirSubstitutionAllowed) {
            return 'الإبلاغ عن وفاة المدين';
        }
        return debtorDeathMarked
            ? 'طلب إحلال ورثة محل المدين المتوفي'
            : 'الإبلاغ عن وفاة المدين';
    }, [debtorDeathMarked, heirSubstitutionAllowed]);

    return {
        isDebtorDeceasedForEvictionHeirs,
        creditorDeathMarked,
        debtorDeathMarked,
        creditorDeathMenuLabel,
        debtorDeathMenuLabel,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
        alimonyBeneficiaryProfile,
    };
}
