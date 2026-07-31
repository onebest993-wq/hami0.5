import { useEffect, useMemo, useRef, useState } from 'react';
import { isPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';
import {
    isHeirSubstitutionAllowedClaimLite,
    isLikelyAlimonyClaimLite,
    isPersonalStatusNoHeirClaim,
} from '@/app/utils/partyDeathClaimPolicyLite';
import { resolveAlimonyBeneficiaryProfile } from '@/app/utils/alimonyBeneficiaryDeathUtils';

type DossierDeathStatusHeavyResult = {
    heirSubstitutionAllowed: boolean;
    ongoingAlimonyClaim: boolean;
    alimonyBeneficiaryProfile: {
        hasWifeBenefit?: boolean;
        childrenAlive?: number;
        anyBeneficiaryAlive?: boolean;
    } | null;
    needsCreditorHeirsEntry: boolean;
    needsDebtorHeirsEntry: boolean;
    creditorDeathMenuLabel: string;
    debtorDeathMenuLabel: string;
};

function resolveClaimForLite(claimType: string | undefined, executionData: any): string {
    if (claimType && String(claimType).trim()) return String(claimType);
    const direct = String(executionData?.claimType ?? '').trim();
    if (direct) return direct;
    const types = executionData?.claimTypes;
    if (Array.isArray(types)) {
        const hit = types.find((t: unknown) => typeof t === 'string' && String(t).trim());
        if (hit) return String(hit);
    }
    return '';
}

/**
 * علامات وفاة خفيفة فورية + إثراء سياسة/تسميات بعد إطار (dynamic import).
 * يُبقي مسار cold-open بلا partyDeathClaimPolicy / نفقة / طابور قرارات ثقيل.
 */
export function useDossierDeathStatus(
    executionData: any,
    debtors: any[],
    claimType?: string,
    decisionsStorageExecutionId?: string,
    decisionsReloadEpoch?: number,
) {
    const executionDataRef = useRef(executionData);
    executionDataRef.current = executionData;

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

    const claimForLite = resolveClaimForLite(claimType, executionData);
    const heirAllowedLite = isHeirSubstitutionAllowedClaimLite(claimForLite);
    const alimonyLite = isLikelyAlimonyClaimLite(claimForLite);
    const personalNoHeirLite = isPersonalStatusNoHeirClaim(claimForLite);

    const liteAlimonyBeneficiaryProfile = useMemo(() => {
        if (!alimonyLite) return null;
        try {
            return resolveAlimonyBeneficiaryProfile(executionData);
        } catch {
            return null;
        }
    }, [alimonyLite, executionData]);

    const liteCreditorDeathMenuLabel = useMemo(() => {
        if (alimonyLite) return 'الإبلاغ عن وفاة مستحقي النفقة';
        if (!heirAllowedLite || personalNoHeirLite) return 'الإبلاغ عن وفاة الدائن';
        return creditorDeathMarked
            ? 'طلب إحلال ورثة محل الدائن المتوفي'
            : 'الإبلاغ عن وفاة الدائن';
    }, [alimonyLite, creditorDeathMarked, heirAllowedLite, personalNoHeirLite]);

    const liteDebtorDeathMenuLabel = useMemo(() => {
        if (!heirAllowedLite) return 'الإبلاغ عن وفاة المدين';
        return debtorDeathMarked
            ? 'طلب إحلال ورثة محل المدين المتوفي'
            : 'الإبلاغ عن وفاة المدين';
    }, [debtorDeathMarked, heirAllowedLite]);

    const [heavy, setHeavy] = useState<DossierDeathStatusHeavyResult | null>(null);

    const alimonySourceKey = useMemo(() => {
        try {
            return JSON.stringify({
                claimTypes: executionData?.claimTypes,
                alimony: executionData?.alimony,
                death: executionData?.alimony_beneficiary_death,
                w: executionData?.monthlyWifeAlimony,
                c: executionData?.monthlyChildrenAlimony,
                n: executionData?.childrenCount ?? executionData?.children_count,
                ic: executionData?.is_creditor_deceased,
                id: executionData?.is_debtor_deceased,
            });
        } catch {
            return String(claimType ?? '');
        }
    }, [executionData, claimType]);

    useEffect(() => {
        let alive = true;
        void import('@/app/utils/dossierDeathStatusHeavy')
            .then(({ computeDossierDeathStatusHeavy }) => {
                if (!alive) return;
                setHeavy(
                    computeDossierDeathStatusHeavy({
                        executionData: executionDataRef.current,
                        claimType,
                        decisionsStorageExecutionId,
                        creditorDeathMarked,
                        debtorDeathMarked,
                    }),
                );
            })
            .catch(() => {
                /* الإبقاء على القيم الخفيفة */
            });
        return () => {
            alive = false;
        };
    }, [
        alimonySourceKey,
        claimType,
        creditorDeathMarked,
        debtorDeathMarked,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
    ]);

    return {
        isDebtorDeceasedForEvictionHeirs,
        creditorDeathMarked,
        debtorDeathMarked,
        creditorDeathMenuLabel: heavy?.creditorDeathMenuLabel ?? liteCreditorDeathMenuLabel,
        debtorDeathMenuLabel: heavy?.debtorDeathMenuLabel ?? liteDebtorDeathMenuLabel,
        heirSubstitutionAllowed: heavy?.heirSubstitutionAllowed ?? heirAllowedLite,
        ongoingAlimonyClaim: heavy?.ongoingAlimonyClaim ?? alimonyLite,
        alimonyBeneficiaryProfile: heavy?.alimonyBeneficiaryProfile ?? liteAlimonyBeneficiaryProfile,
        needsCreditorHeirsEntry: heavy?.needsCreditorHeirsEntry ?? false,
        needsDebtorHeirsEntry: heavy?.needsDebtorHeirsEntry ?? false,
        /** اكتمل إثراء السياسة الثقيلة (نفقة / قرارات إحلال) */
        deathStatusEnriched: heavy != null,
    };
}
