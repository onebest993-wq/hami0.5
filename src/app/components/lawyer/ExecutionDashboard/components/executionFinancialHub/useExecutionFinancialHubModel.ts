import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildGhuramaaCreditorRows } from '@/app/utils/creditorPaymentProRata';
import { buildDebtorAgentSeizedItems } from '@/app/slices/financial/specialtyPublic';
import { resolveFinancialHubExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubPortalUtils';
import { resolveExecutionFinancialHubPrincipalAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/resolveExecutionFinancialHubPrincipal';
import type { ExecutionFinancialHubPortalProps } from './ExecutionFinancialHubPortalProps';

export function useExecutionFinancialHubModel(props: ExecutionFinancialHubPortalProps) {
    const {
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        onCloseFinancialHub,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        realEstateSeizureRegistryAssets,
        movableSeizureRegistryAssets,
        salarySeizureRegistryAssets,
        thirdPartySeizureRegistryAssets,
        standaloneExecutionMarks,
        executionData,
        executionId,
        principalDebtAmount,
        decisionsStorageExecutionId,
        claimType,
        totalOwed,
        activeDebtorIsDeceased = false,
    } = props;

    const closeFinancialHub = useCallback(() => {
        setFinancialHubAutoOpenMode(null);
        setFinancialHubSeizedMovableId(null);
        setFinancialHubSeizedPropertyId(null);
        if (onCloseFinancialHub) {
            onCloseFinancialHub();
            return;
        }
        setShowExecutionFinancialHub?.(false);
    }, [
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setShowExecutionFinancialHub,
        onCloseFinancialHub,
    ]);

    useEffect(() => {
        if (!showExecutionFinancialHub) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeFinancialHub();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [showExecutionFinancialHub, closeFinancialHub]);

    const debtors = executionData?.debtors || [];
    const firstDebtor = debtors[0] || {};
    const hubDebtorIsDeceased =
        activeDebtorIsDeceased ||
        Boolean(executionData?.is_debtor_deceased) ||
        Boolean(firstDebtor?.isDeceased);
    const debtorJob = firstDebtor?.occupation || 'كاسب';
    const debtorEmploymentType = firstDebtor?.employmentType;
    const debtorKinship = firstDebtor?.kinship || '';
    const creditors = executionData?.creditors || [];
    const additionalCreditorsPm = executionData?.party_multiplicity?.additionalCreditors ?? [];
    const creditorsCount =
        (Array.isArray(creditors) ? creditors.length : 0) +
        (Array.isArray(additionalCreditorsPm) ? additionalCreditorsPm.length : 0);

    const debtorAgentSeizedItems = useMemo(
        () =>
            buildDebtorAgentSeizedItems({
                realEstate: realEstateSeizureRegistryAssets,
                movable: movableSeizureRegistryAssets,
                salary: salarySeizureRegistryAssets,
                thirdParty: thirdPartySeizureRegistryAssets,
                marks: standaloneExecutionMarks,
            }),
        [
            realEstateSeizureRegistryAssets,
            movableSeizureRegistryAssets,
            salarySeizureRegistryAssets,
            thirdPartySeizureRegistryAssets,
            standaloneExecutionMarks,
        ]
    );

    const hubExecutionId = resolveFinancialHubExecutionId(executionData, executionId);

    const [hubStorageRevision, setHubStorageRevision] = useState(0);
    useEffect(() => {
        if (!showExecutionFinancialHub) return;
        setHubStorageRevision((n) => n + 1);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hami-unified-ledger-updated'));
        }
    }, [showExecutionFinancialHub]);

    useEffect(() => {
        if (!showExecutionFinancialHub) return;
        const bump = () => setHubStorageRevision((n) => n + 1);
        window.addEventListener('hami-unified-ledger-updated', bump);
        return () => window.removeEventListener('hami-unified-ledger-updated', bump);
    }, [showExecutionFinancialHub]);

    const hubPrincipalAmount = useMemo(
        () =>
            resolveExecutionFinancialHubPrincipalAmount({
                principalDebtAmount,
                executionData,
                executionId: hubExecutionId ?? executionId,
                decisionsStorageExecutionId,
                claimType,
            }),
        [
            principalDebtAmount,
            executionData,
            hubExecutionId,
            executionId,
            decisionsStorageExecutionId,
            claimType,
            hubStorageRevision,
        ],
    );

    const ghuramaaCreditors = useMemo(() => {
        const claimFallback = Math.max(
            0,
            Number(executionData?.totalAmount ?? executionData?.debtAmount ?? 0) || 0,
            Number(hubPrincipalAmount ?? 0) || 0,
            Number(totalOwed ?? 0) || 0
        );
        return buildGhuramaaCreditorRows(
            {
                ...(executionData ?? {}),
                creditors,
                party_multiplicity: {
                    ...(executionData?.party_multiplicity ?? {}),
                    additionalCreditors: additionalCreditorsPm,
                },
            },
            claimFallback
        );
    }, [executionData, creditors, additionalCreditorsPm, hubPrincipalAmount, totalOwed]);

    return {
        closeFinancialHub,
        debtors,
        firstDebtor,
        hubDebtorIsDeceased,
        debtorJob,
        debtorEmploymentType,
        debtorKinship,
        creditors,
        additionalCreditorsPm,
        creditorsCount,
        debtorAgentSeizedItems,
        hubExecutionId,
        hubStorageRevision,
        hubPrincipalAmount,
        ghuramaaCreditors,
    };
}
