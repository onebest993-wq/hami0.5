import { useMemo } from 'react';
import { isPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';

export function useDossierDeathStatus(
    executionData: any,
    debtors: any[],
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

    const creditorDeathMenuLabel = useMemo(
        () =>
            creditorDeathMarked
                ? 'طلب إحلال ورثة محل الدائن المتوفي'
                : 'الإبلاغ عن وفاة الدائن',
        [creditorDeathMarked]
    );

    const debtorDeathMenuLabel = useMemo(
        () =>
            debtorDeathMarked
                ? 'طلب إحلال ورثة محل المدين المتوفي'
                : 'الإبلاغ عن وفاة المدين',
        [debtorDeathMarked]
    );

    return { isDebtorDeceasedForEvictionHeirs, creditorDeathMarked, debtorDeathMarked, creditorDeathMenuLabel, debtorDeathMenuLabel };
}
