import { useMemo } from 'react';
import { calculateImprisonmentEligibility } from '@/app/utils/imprisonmentEngine';

export function useImprisonmentEligibility(
    claimType: string,
    totalAmount: string,
    isSolidaryLiability: boolean,
    additionalDebtorsFormLength: number,
    debtors: Array<{ occupation: 'موظف' | 'كاسب' }>
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
        if (isSolidaryLiability) return null;
        const n = 1 + additionalDebtorsFormLength;
        if (n < 2) return null;
        return `عند الحفظ يُوزَّع إجمالي المطالبة بالتساوي تلقائياً على ${n} مديناً (أساسي + إضافي) في حقل «حصة الدين» لكل منهم.`;
    }, [claimType, isSolidaryLiability, additionalDebtorsFormLength]);

    const imprisonmentStatus = useMemo(() => {
        const primaryDebtor = debtors[0];

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
    }, [debtors, claimType, totalAmount]);

    return { imprisonmentStatus, financialSplitHint };
}
