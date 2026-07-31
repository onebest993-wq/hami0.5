import {
    isHeirSubstitutionAllowedForClaim,
    isPersonalStatusNoHeirExecution,
} from '@/app/utils/partyDeathClaimPolicy';
import {
    resolveAlimonyBeneficiaryProfile,
    type AlimonyBeneficiaryProfile,
} from '@/app/utils/alimonyBeneficiaryDeathUtils';
import { hasOngoingAlimonyInExecution } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { findLatestHeirSubstitutionDecisionNeedingEntry } from '@/app/utils/executorSeizureDecisionQueue';

export type DossierDeathStatusHeavyInput = {
    executionData: Record<string, unknown> | null | undefined;
    claimType?: string;
    decisionsStorageExecutionId?: string;
    creditorDeathMarked: boolean;
    debtorDeathMarked: boolean;
};

export type DossierDeathStatusHeavyResult = {
    heirSubstitutionAllowed: boolean;
    ongoingAlimonyClaim: boolean;
    alimonyBeneficiaryProfile: AlimonyBeneficiaryProfile | null;
    needsCreditorHeirsEntry: boolean;
    needsDebtorHeirsEntry: boolean;
    creditorDeathMenuLabel: string;
    debtorDeathMenuLabel: string;
};

/** حساب تسميات/سياسة الوفاة الثقيلة — يُحمَّل بعد أول إطار للمسار البارد */
export function computeDossierDeathStatusHeavy(
    input: DossierDeathStatusHeavyInput,
): DossierDeathStatusHeavyResult {
    const {
        executionData,
        claimType,
        decisionsStorageExecutionId,
        creditorDeathMarked,
        debtorDeathMarked,
    } = input;

    const heirSubstitutionAllowed = isHeirSubstitutionAllowedForClaim(executionData, claimType);
    const ongoingAlimonyClaim = hasOngoingAlimonyInExecution(executionData, claimType);
    // حتى عند انعدام مستحق حي نحتاج الملف الشخصي لتسمية/قرار الإغلاق
    const claimLooksAlimony =
        ongoingAlimonyClaim ||
        String(claimType || '').includes('نفقة') ||
        (Array.isArray((executionData as { claimTypes?: unknown })?.claimTypes) &&
            (executionData as { claimTypes: unknown[] }).claimTypes.some((t) =>
                String(t || '').includes('نفقة'),
            ));
    const alimonyBeneficiaryProfile = claimLooksAlimony
        ? resolveAlimonyBeneficiaryProfile(executionData)
        : null;

    const needsCreditorHeirsEntry = Boolean(
        decisionsStorageExecutionId &&
            findLatestHeirSubstitutionDecisionNeedingEntry(decisionsStorageExecutionId, 'creditor'),
    );
    const needsDebtorHeirsEntry = Boolean(
        decisionsStorageExecutionId &&
            findLatestHeirSubstitutionDecisionNeedingEntry(decisionsStorageExecutionId, 'debtor'),
    );

    let creditorDeathMenuLabel = 'الإبلاغ عن وفاة الدائن';
    if (ongoingAlimonyClaim && alimonyBeneficiaryProfile?.anyBeneficiaryAlive) {
        creditorDeathMenuLabel = 'الإبلاغ عن وفاة مستحقي النفقة';
    } else if (
        !heirSubstitutionAllowed ||
        isPersonalStatusNoHeirExecution(executionData, claimType)
    ) {
        creditorDeathMenuLabel = creditorDeathMarked
            ? 'تم تسجيل وفاة الدائن'
            : 'الإبلاغ عن وفاة الدائن';
    } else if (needsCreditorHeirsEntry) {
        creditorDeathMenuLabel = 'إدخال بيانات ورثة الدائن';
    } else if (creditorDeathMarked) {
        creditorDeathMenuLabel = 'طلب إحلال ورثة محل الدائن المتوفي';
    }

    let debtorDeathMenuLabel = 'الإبلاغ عن وفاة المدين';
    if (!heirSubstitutionAllowed) {
        debtorDeathMenuLabel = debtorDeathMarked
            ? 'تم تسجيل وفاة المدين'
            : 'الإبلاغ عن وفاة المدين';
    } else if (needsDebtorHeirsEntry) {
        debtorDeathMenuLabel = 'إدخال بيانات ورثة المدين';
    } else if (debtorDeathMarked) {
        debtorDeathMenuLabel = 'طلب إحلال ورثة محل المدين المتوفي';
    }

    return {
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
        alimonyBeneficiaryProfile,
        needsCreditorHeirsEntry,
        needsDebtorHeirsEntry,
        creditorDeathMenuLabel,
        debtorDeathMenuLabel,
    };
}
