import { useMemo } from 'react';
import { calculateImprisonmentEligibility } from '@/app/utils/imprisonmentEngine';

const FINANCIAL_SPLIT_CLAIM_TYPES = new Set([
    'استحصال دين مالي',
    'استخلاص دين مالي',
    'مهر مؤجل',
    'حجة زواج - مهر معجل',
    'حجة زواج - مهر مؤجل',
    'حجة وصية',
    'حجة تخارج',
    'حجة مخالعة',
    'حجة إقرار بدين',
    'نفقة عدة',
    'تعويض عن طلاق تعسفي',
    'استيفاء دين من بيع عقار',
    'نفقة',
    'أثاث زوجية',
    'حجة نفقة اتفاقية',
]);

export function getFinancialSplitHint(
    claimType: string,
    allDebtors: Array<{ isSolidaryLiability?: boolean }>,
): string | null {
    if (!FINANCIAL_SPLIT_CLAIM_TYPES.has(claimType)) return null;
    if (allDebtors.length < 2) return null;
    if (allDebtors.every((d) => d.isSolidaryLiability)) return null;
    const nonSolidaryCount = allDebtors.filter((d) => !d.isSolidaryLiability).length;
    if (nonSolidaryCount === 0) return null;
    return 'أدخل مبلغ دين كل مدين مستقل يدوياً؛ الباقي يُسجَّل ذمة متضامنة بين الضامنين.';
}

export function useImprisonmentEligibility(
    claimType: string,
    totalAmount: string,
    allDebtors: Array<{ occupation: 'موظف' | 'كاسب'; isSolidaryLiability?: boolean }>,
) {
    const financialSplitHint = useMemo(
        () => getFinancialSplitHint(claimType, allDebtors),
        [claimType, allDebtors],
    );

    const imprisonmentStatus = useMemo(() => {
        const primaryDebtor = allDebtors[0];

        if (!primaryDebtor) {
            return {
                canRequestImprisonment: true,
                executionFee: 0,
                remainingBalance: 0,
                blockingReasons: []
            };
        }

        return calculateImprisonmentEligibility({
            debtorAge: '',
            debtorProfession: primaryDebtor.occupation,
            debtorKinship: '' as '' | 'أصل' | 'فرع' | 'زوج',
            claimType: claimType,
            debtAmount: totalAmount || '0'
        });
    }, [allDebtors, claimType, totalAmount]);

    return { imprisonmentStatus, financialSplitHint };
}
