import { describe, expect, it } from 'vitest';
import { resolveFollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';
import {
    applyDebtorDeathFollowupOverlay,
    buildDossierAutoFinishPatch,
    isHeirSubstitutionAllowedForClaim,
    shouldAutoFinishDossierOnDeathReport,
} from '@/app/utils/partyDeathClaimPolicy';

/** يحاكي showPersonalCoerciveFollowupTab في ExecutionDashboard */
function resolveShowPersonalCoerciveTab(
    claimType: string,
    isEmployee: boolean,
    activeDebtorIsDeceased: boolean
) {
    const base = resolveFollowupSpecializationVisibility(claimType, isEmployee, {
        docType: 'قرارات وأحكام المحاكم',
        classification: 'شرعي',
    });
    const effective = applyDebtorDeathFollowupOverlay(base, activeDebtorIsDeceased);
    return !effective.hidePersonalCoerciveFollowupTab;
}

describe('partyDeathClaimPolicy — سيناريوهات كاملة', () => {
    describe('إخفاء التنفيذ الجبري الشخصي عند وفاة المدين', () => {
        const claimTypes = [
            'نفقة',
            'تسليم ولد',
            'مشاهدة',
            'مطاوعة',
            'استحصال دين مالي',
            'مبلغ نقدي',
            'أثاث زوجية',
        ];

        for (const claim of claimTypes) {
            it(`يُخفى التبويب الشخصي عند وفاة المدين — ${claim}`, () => {
                expect(resolveShowPersonalCoerciveTab(claim, false, true)).toBe(false);
                expect(resolveShowPersonalCoerciveTab(claim, true, true)).toBe(false);
            });
        }

        it('يظهر التبويب الشخصي لنزع الحضانة + موظف عندما المدين حي', () => {
            expect(resolveShowPersonalCoerciveTab('تسليم ولد', true, false)).toBe(true);
        });

        it('يظهر التبويب الشخصي للكاسب في دين مالي عندما المدين حي', () => {
            expect(resolveShowPersonalCoerciveTab('استحصال دين مالي', false, false)).toBe(true);
        });
    });

    describe('منع إحلال الورثة', () => {
        const noHeir = [
            { claimType: 'مشاهدة' },
            { claimType: 'تسليم ولد' },
            { claimType: 'مطاوعة' },
            { claimTypes: ['نفقة'] },
            { claimTypes: ['نفقة', 'نفقة ماضية'] },
            { claimType: 'حجة نفقة اتفاقية' },
        ];
        for (const data of noHeir) {
            const label = 'claimTypes' in data ? data.claimTypes!.join('+') : data.claimType!;
            it(`لا إحلال ورثة — ${label}`, () => {
                expect(isHeirSubstitutionAllowedForClaim(data, label)).toBe(false);
            });
        }

        const withHeir = ['استحصال دين مالي', 'مبلغ نقدي', 'نفقة ماضية', 'أثاث زوجية'];
        for (const claim of withHeir) {
            it(`يُسمح بإحلال الورثة — ${claim}`, () => {
                expect(isHeirSubstitutionAllowedForClaim({ claimType: claim }, claim)).toBe(true);
            });
        }
    });

    describe('إغلاق الإضبارة تلقائياً — وفاة الدائن', () => {
        const autoClose = ['مشاهدة', 'تسليم ولد', 'مطاوعة'];
        for (const claim of autoClose) {
            it(`إغلاق عند إبلاغ وفاة الدائن — ${claim}`, () => {
                expect(
                    shouldAutoFinishDossierOnDeathReport({ claimType: claim }, claim, 'creditor')
                ).toBe(true);
            });
        }

        it('لا إغلاق عند وفاة الدائن في نفقة مستمرة دون استنفاد المستحقين', () => {
            expect(
                shouldAutoFinishDossierOnDeathReport({ claimType: 'نفقة' }, 'نفقة', 'creditor')
            ).toBe(false);
            expect(
                shouldAutoFinishDossierOnDeathReport(
                    { claimTypes: ['نفقة', 'نفقة ماضية'] },
                    'نفقة',
                    'creditor'
                )
            ).toBe(false);
        });

        it('لا إغلاق تلقائي عند وفاة الدائن في دين مالي', () => {
            expect(
                shouldAutoFinishDossierOnDeathReport(
                    { claimType: 'استحصال دين مالي' },
                    'استحصال دين مالي',
                    'creditor'
                )
            ).toBe(false);
        });

        it('إغلاق عند وفاة جميع مستحقي النفقة — نفقة مستمرة فقط', () => {
            expect(
                shouldAutoFinishDossierOnDeathReport(
                    { claimTypes: ['نفقة'] },
                    'نفقة',
                    'creditor',
                    { allAlimonyBeneficiariesDeceased: true, survivingTotalAmount: 0 }
                )
            ).toBe(true);
        });

        it('لا إغلاق عند استنفاد المستحقين إن بقيت مطالبة مهر أو نفقة ماضية', () => {
            expect(
                shouldAutoFinishDossierOnDeathReport(
                    {
                        claimTypes: ['نفقة', 'نفقة ماضية', 'مهر مؤجل'],
                        totalAmount: 900_000,
                    },
                    'نفقة',
                    'creditor',
                    { allAlimonyBeneficiariesDeceased: true, survivingTotalAmount: 900_000 }
                )
            ).toBe(false);
        });
    });

    describe('إغلاق الإضبارة تلقائياً — وفاة المدين', () => {
        const autoClose = ['مشاهدة', 'تسليم ولد', 'مطاوعة'];
        for (const claim of autoClose) {
            it(`إغلاق عند إبلاغ وفاة المدين — ${claim}`, () => {
                expect(
                    shouldAutoFinishDossierOnDeathReport({ claimType: claim }, claim, 'debtor')
                ).toBe(true);
            });
        }

        it('لا إغلاق عند وفاة المدين في نفقة مستمرة مركّبة مع مهر', () => {
            expect(
                shouldAutoFinishDossierOnDeathReport(
                    { claimTypes: ['نفقة', 'مهر مؤجل'] },
                    'نفقة',
                    'debtor'
                )
            ).toBe(false);
        });

        it('لا إغلاق عند وفاة المدين في نفقة مستمرة (دون استنفاد المستحقين)', () => {
            expect(
                shouldAutoFinishDossierOnDeathReport({ claimTypes: ['نفقة'] }, 'نفقة', 'debtor')
            ).toBe(false);
        });

        it('لا إغلاق عند وفاة المدين في دين مالي', () => {
            expect(
                shouldAutoFinishDossierOnDeathReport(
                    { claimType: 'استحصال دين مالي' },
                    'استحصال دين مالي',
                    'debtor'
                )
            ).toBe(false);
        });
    });

    describe('buildDossierAutoFinishPatch', () => {
        it('يضبط حالة انتهاء الإضبارة', () => {
            const p = buildDossierAutoFinishPatch('سبب اختبار');
            expect(p.dossier_lifecycle_status).toBe('finished');
            expect(p.dossier_status_reason).toBe('سبب اختبار');
            expect(String(p.dossier_status_date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});
