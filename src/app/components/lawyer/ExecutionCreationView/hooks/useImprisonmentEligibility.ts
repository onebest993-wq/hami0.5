import { useMemo } from 'react';
import { calculateImprisonmentEligibility } from '@/app/utils/imprisonmentEngine';

export function useImprisonmentEligibility(
    claimType: string,
    totalAmount: string,
    allDebtors: Array<{ occupation: 'موظف' | 'كاسب'; isSolidaryLiability?: boolean }>,
) {
    const financialSplitHint = useMemo(() => {
        if (
            claimType !== 'استحصال دين مالي' &&
            claimType !== 'استخلاص دين مالي' &&
            claimType !== 'مهر مؤجل' &&
            claimType !== 'حجة زواج - مهر معجل' &&
            claimType !== 'حجة زواج - مهر مؤجل' &&
            claimType !== 'حجة وصية' &&
            claimType !== 'حجة تخارج' &&
            claimType !== 'حجة مخالعة' &&
            claimType !== 'حجة إقرار بدين' &&
            claimType !== 'نفقة عدة' &&
            claimType !== 'تعويض عن طلاق تعسفي' &&
            claimType !== 'استيفاء دين من بيع عقار' &&
            claimType !== 'نفقة' &&
            claimType !== 'أثاث زوجية' &&
            claimType !== 'حجة نفقة اتفاقية'
        ) return null;
        if (allDebtors.length < 2) return null;
        if (allDebtors.every((d) => d.isSolidaryLiability)) return null;
        const nonSolidaryCount = allDebtors.filter((d) => !d.isSolidaryLiability).length;
        if (nonSolidaryCount === 0) return null;
        return `أدخل مبلغ دين كل مدين مستقل يدوياً؛ الباقي يُسجَّل ذمة متضامنة بين الضامنين.`;
    }, [claimType, allDebtors]);

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
