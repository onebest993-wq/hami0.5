import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDossierDeathStatus } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDossierDeathStatus';

describe('useDossierDeathStatus — تسميات القائمة والسياسة', () => {
    it('نفقة مستمرة: إبلاغ مستحقي النفقة دون إحلال ورثة', () => {
        const { result } = renderHook(() =>
            useDossierDeathStatus(
                {
                    claimTypes: ['نفقة'],
                    monthlyWifeAlimony: 100_000,
                    monthlyChildrenAlimony: 50_000,
                    childrenCount: 2,
                },
                [],
                'نفقة'
            )
        );
        expect(result.current.heirSubstitutionAllowed).toBe(false);
        expect(result.current.ongoingAlimonyClaim).toBe(true);
        expect(result.current.creditorDeathMenuLabel).toBe('الإبلاغ عن وفاة مستحقي النفقة');
        expect(result.current.debtorDeathMenuLabel).toBe('الإبلاغ عن وفاة المدين');
    });

    it('نزع حضانة: إبلاغ وفاة فقط للطرفين', () => {
        const { result } = renderHook(() =>
            useDossierDeathStatus({ claimType: 'تسليم ولد' }, [], 'تسليم ولد')
        );
        expect(result.current.heirSubstitutionAllowed).toBe(false);
        expect(result.current.creditorDeathMenuLabel).toBe('الإبلاغ عن وفاة الدائن');
        expect(result.current.debtorDeathMenuLabel).toBe('الإبلاغ عن وفاة المدين');
    });

    it('دين مالي: إحلال ورثة بعد تسجيل الوفاة', () => {
        const { result } = renderHook(() =>
            useDossierDeathStatus(
                {
                    claimType: 'استحصال دين مالي',
                    is_creditor_deceased: true,
                    creditors: [{ isDeceased: true }],
                },
                [],
                'استحصال دين مالي'
            )
        );
        expect(result.current.heirSubstitutionAllowed).toBe(true);
        expect(result.current.creditorDeathMenuLabel).toBe('طلب إحلال ورثة محل الدائن المتوفي');
        expect(result.current.debtorDeathMenuLabel).toBe('الإبلاغ عن وفاة المدين');
    });

    it('نفقة: بعد وفاة الزوجة وجميع الأولاد لا يبقى مستحق حي', () => {
        const { result } = renderHook(() =>
            useDossierDeathStatus(
                {
                    claimTypes: ['نفقة'],
                    monthlyWifeAlimony: 100_000,
                    monthlyChildrenAlimony: 50_000,
                    childrenCount: 0,
                    children_count: 0,
                    alimony_beneficiary_death: { wife_deceased: true, children_deceased_count: 2 },
                },
                [],
                'نفقة'
            )
        );
        expect(result.current.alimonyBeneficiaryProfile?.anyBeneficiaryAlive).toBe(false);
    });

    it('نفقة من بيانات الإنشاء (alimony blob): تفعيل حاوية المستحقين', () => {
        const { result } = renderHook(() =>
            useDossierDeathStatus(
                {
                    claimTypes: ['نفقة'],
                    alimony: {
                        beneficiary: 'زوجة وأولاد',
                        wifeMonthly: '120000',
                        childrenMonthly: '30000',
                        childrenCount: 2,
                    },
                },
                [],
                'نفقة'
            )
        );
        expect(result.current.alimonyBeneficiaryProfile?.hasWifeBenefit).toBe(true);
        expect(result.current.alimonyBeneficiaryProfile?.childrenAlive).toBe(2);
        expect(result.current.creditorDeathMenuLabel).toBe('الإبلاغ عن وفاة مستحقي النفقة');
    });

    it('نفقة + مهر + نفقة ماضية: مسار مستحقين دون إحلال ورثة', () => {
        const { result } = renderHook(() =>
            useDossierDeathStatus(
                {
                    claimTypes: ['نفقة', 'نفقة ماضية', 'مهر مؤجل'],
                    monthlyWifeAlimony: 100_000,
                    monthlyChildrenAlimony: 50_000,
                    childrenCount: 2,
                    alimony: { beneficiary: 'زوجة وأولاد', childrenCount: 2 },
                },
                [],
                'نفقة'
            )
        );
        expect(result.current.ongoingAlimonyClaim).toBe(true);
        expect(result.current.heirSubstitutionAllowed).toBe(false);
        expect(result.current.creditorDeathMenuLabel).toBe('الإبلاغ عن وفاة مستحقي النفقة');
    });

    it('نفقة أطفال فقط: يبقى مسار الإبلاغ', () => {
        const { result } = renderHook(() =>
            useDossierDeathStatus(
                {
                    claimTypes: ['نفقة'],
                    monthlyChildrenAlimony: 40_000,
                    childrenCount: 3,
                },
                [],
                'نفقة'
            )
        );
        expect(result.current.alimonyBeneficiaryProfile?.hasWifeBenefit).toBe(false);
        expect(result.current.alimonyBeneficiaryProfile?.childrenAlive).toBe(3);
        expect(result.current.creditorDeathMenuLabel).toBe('الإبلاغ عن وفاة مستحقي النفقة');
    });
});
