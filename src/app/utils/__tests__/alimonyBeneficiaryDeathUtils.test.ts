import { describe, expect, it } from 'vitest';
import {
    buildAlimonyBeneficiaryDeathMerge,
    buildSoleSurvivorDeathInput,
    countAliveAlimonyBeneficiaries,
    resolveAlimonyBeneficiaryProfile,
    shouldShowAlimonyBeneficiaryDeathPicker,
    resolveOngoingAlimonyMonthlyDisplay,
    resolveSurvivorOngoingMonthlyAlimonyIqd,
    shouldSuppressOngoingAlimonyMonthlyUi,
} from '@/app/utils/alimonyBeneficiaryDeathUtils';

describe('alimonyBeneficiaryDeathUtils', () => {
    const baseFile = {
        claimType: 'نفقة',
        monthlyWifeAlimony: 200_000,
        monthlyChildrenAlimony: 50_000,
        childrenCount: 2,
        totalAmount: 1_000_000,
        alimony: {
            calculated: {
                wifeBaseAccumulation: 400_000,
                childrenBaseAccumulation: 200_000,
                baseAccumulation: 600_000,
                totalAccumulated: 1_000_000,
                pastWifeAccumulation: 0,
                pastChildrenAccumulation: 0,
            },
        },
    };

    it('resolves wife and children beneficiaries', () => {
        const p = resolveAlimonyBeneficiaryProfile(baseFile);
        expect(p?.wifeAlive).toBe(true);
        expect(p?.childrenAlive).toBe(2);
        expect(p?.anyBeneficiaryAlive).toBe(true);
    });

    it('reduces wife alimony and keeps dossier open when children remain', () => {
        const merge = buildAlimonyBeneficiaryDeathMerge(baseFile, { wifeDeceased: true });
        expect(merge?.monthlyWifeAlimony).toBe(0);
        expect(merge?.children_count).toBe(2);
        expect(merge?.dossier_lifecycle_status).toBeUndefined();
        expect(Number(merge?.totalAmount)).toBeLessThan(1_000_000);
    });

    it('closes dossier when all beneficiaries are deceased', () => {
        const merge = buildAlimonyBeneficiaryDeathMerge(baseFile, {
            wifeDeceased: true,
            childrenDiedCount: 2,
        });
        expect(merge?.dossier_lifecycle_status).toBe('finished');
        expect(merge?.is_creditor_deceased).toBe(true);
        expect(merge?.children_count).toBe(0);
    });

    it('partial child death keeps dossier open and reduces proportionally', () => {
        const merge = buildAlimonyBeneficiaryDeathMerge(baseFile, { childrenDiedCount: 1 });
        expect(merge?.dossier_lifecycle_status).toBeUndefined();
        expect(merge?.children_count).toBe(1);
        expect(merge?.monthlyAlimony).toBe(250_000);
        expect(Number(merge?.totalAmount)).toBe(900_000);
        const after = { ...baseFile, ...merge };
        expect(resolveSurvivorOngoingMonthlyAlimonyIqd(after)).toBe(250_000);
    });

    it('sequential reports: wife then both children closes dossier', () => {
        const afterWife = buildAlimonyBeneficiaryDeathMerge(baseFile, { wifeDeceased: true });
        const fileAfterWife = { ...baseFile, ...afterWife };
        expect(fileAfterWife.dossier_lifecycle_status).toBeUndefined();
        const afterChildren = buildAlimonyBeneficiaryDeathMerge(fileAfterWife, {
            childrenDiedCount: 2,
        });
        expect(afterChildren?.dossier_lifecycle_status).toBe('finished');
        expect(afterChildren?.children_count).toBe(0);
    });

    it('sequential reports: wife then one child keeps one beneficiary alive', () => {
        const afterWife = buildAlimonyBeneficiaryDeathMerge(baseFile, { wifeDeceased: true });
        const fileAfterWife = { ...baseFile, ...afterWife };
        const afterOneChild = buildAlimonyBeneficiaryDeathMerge(fileAfterWife, { childrenDiedCount: 1 });
        expect(afterOneChild?.dossier_lifecycle_status).toBeUndefined();
        expect(afterOneChild?.children_count).toBe(1);
    });

    it('children-only alimony: one child dies of three', () => {
        const childrenOnly = {
            claimType: 'نفقة',
            monthlyChildrenAlimony: 30_000,
            childrenCount: 3,
            totalAmount: 900_000,
            alimony: {
                beneficiary: 'أولاد فقط',
                calculated: {
                    wifeBaseAccumulation: 0,
                    childrenBaseAccumulation: 900_000,
                    baseAccumulation: 900_000,
                    totalAccumulated: 900_000,
                    pastWifeAccumulation: 0,
                    pastChildrenAccumulation: 0,
                },
            },
        };
        const merge = buildAlimonyBeneficiaryDeathMerge(childrenOnly, { childrenDiedCount: 1 });
        expect(merge?.children_count).toBe(2);
        expect(merge?.monthlyAlimony).toBe(60_000);
        expect(merge?.dossier_lifecycle_status).toBeUndefined();
        expect(Number(merge?.totalAmount)).toBe(600_000);
        const after = { ...childrenOnly, ...merge };
        expect(resolveSurvivorOngoingMonthlyAlimonyIqd(after)).toBe(60_000);
        const display = resolveOngoingAlimonyMonthlyDisplay(after);
        expect(display.detailLines.some((l) => l.includes('الزوجة'))).toBe(false);
    });

    it('children-only from lump monthlyAlimony: no wife in profile or display', () => {
        const childrenOnlyLump = {
            claimTypes: ['نفقة'],
            monthlyAlimony: 200_000,
            childrenCount: 2,
            alimony: {
                beneficiary: 'أولاد فقط',
                childrenCount: 2,
                calculated: { monthlyOngoing: 200_000, wifeBaseAccumulation: 0, childrenBaseAccumulation: 400_000 },
            },
        };
        const p = resolveAlimonyBeneficiaryProfile(childrenOnlyLump);
        expect(p?.hasWifeBenefit).toBe(false);
        expect(p?.childMonthly).toBe(100_000);
        expect(resolveSurvivorOngoingMonthlyAlimonyIqd(childrenOnlyLump)).toBe(200_000);

        const merge = buildAlimonyBeneficiaryDeathMerge(childrenOnlyLump, { childrenDiedCount: 1 });
        const after = { ...childrenOnlyLump, ...merge };
        expect(resolveSurvivorOngoingMonthlyAlimonyIqd(after)).toBe(100_000);
        expect(merge?.monthlyAlimony).toBe(100_000);
    });

    it('wife and one child: child death leaves wife monthly only (not full lump)', () => {
        const wifeAndChild = {
            claimTypes: ['نفقة'],
            monthlyWifeAlimony: 100_000,
            monthlyChildrenAlimony: 100_000,
            childrenCount: 1,
            monthlyAlimony: 200_000,
            alimony: {
                beneficiary: 'زوجة وأولاد',
                wifeMonthly: '100000',
                childrenMonthly: '100000',
                childrenCount: 1,
                calculated: { monthlyOngoing: 200_000 },
            },
        };
        expect(resolveSurvivorOngoingMonthlyAlimonyIqd(wifeAndChild)).toBe(200_000);
        const merge = buildAlimonyBeneficiaryDeathMerge(wifeAndChild, { childrenDiedCount: 1 });
        const after = { ...wifeAndChild, ...merge };
        expect(resolveSurvivorOngoingMonthlyAlimonyIqd(after)).toBe(100_000);
        expect(after.monthlyAlimony).toBe(100_000);
        const p = resolveAlimonyBeneficiaryProfile(after);
        expect(p?.childrenAlive).toBe(0);
        expect(p?.wifeAlive).toBe(true);
    });

    it('wife-only: no children lines in display', () => {
        const wifeOnly = {
            claimTypes: ['نفقة'],
            monthlyWifeAlimony: 250_000,
            alimony: { beneficiary: 'زوجة فقط', calculated: { monthlyOngoing: 250_000 } },
        };
        const display = resolveOngoingAlimonyMonthlyDisplay(wifeOnly);
        expect(display.total).toBe(250_000);
        expect(display.detailLines).toHaveLength(1);
        expect(display.detailLines[0]).toContain('الزوجة');
    });

    it('rejects empty report', () => {
        expect(buildAlimonyBeneficiaryDeathMerge(baseFile, {})).toBeNull();
    });

    it('resolves profile from ExecutionCreationView alimony blob (wifeMonthly strings)', () => {
        const intakeFile = {
            claimTypes: ['نفقة'],
            alimony: {
                beneficiary: 'زوجة وأولاد',
                wifeMonthly: '150000',
                childrenMonthly: '50000',
                childrenCount: 2,
                calculated: {
                    wifeBaseAccumulation: 300_000,
                    childrenBaseAccumulation: 200_000,
                    totalAccumulated: 500_000,
                    monthlyOngoing: 250_000,
                },
            },
            totalAmount: 500_000,
        };
        const p = resolveAlimonyBeneficiaryProfile(intakeFile);
        expect(p?.hasWifeBenefit).toBe(true);
        expect(p?.hasChildrenBenefit).toBe(true);
        expect(p?.childrenAlive).toBe(2);
        expect(p?.wifeMonthly).toBe(150_000);
        expect(p?.anyBeneficiaryAlive).toBe(true);
    });

    it('opens merge path for intake-style file after wife death', () => {
        const intakeFile = {
            claimTypes: ['نفقة'],
            alimony: {
                beneficiary: 'زوجة وأولاد',
                wifeMonthly: '100000',
                childrenMonthly: '40000',
                childrenCount: 3,
                calculated: {
                    wifeBaseAccumulation: 200_000,
                    childrenBaseAccumulation: 240_000,
                    baseAccumulation: 440_000,
                    totalAccumulated: 440_000,
                    pastWifeAccumulation: 0,
                    pastChildrenAccumulation: 0,
                },
            },
            monthlyWifeAlimony: 100_000,
            monthlyChildrenAlimony: 40_000,
            childrenCount: 3,
            totalAmount: 440_000,
        };
        const merge = buildAlimonyBeneficiaryDeathMerge(intakeFile, { wifeDeceased: true });
        expect(merge?.monthlyWifeAlimony).toBe(0);
        expect(merge?.children_count).toBe(3);
        expect(merge?.dossier_lifecycle_status).toBeUndefined();
    });

    describe('beneficiary death picker routing', () => {
        it('shows picker when more than one beneficiary is alive', () => {
            const p = resolveAlimonyBeneficiaryProfile(baseFile);
            expect(p).not.toBeNull();
            expect(countAliveAlimonyBeneficiaries(p!)).toBe(3);
            expect(shouldShowAlimonyBeneficiaryDeathPicker(p!)).toBe(true);
            expect(buildSoleSurvivorDeathInput(p!)).toBeNull();
        });

        it('auto-input when only one child remains alive', () => {
            const afterWife = buildAlimonyBeneficiaryDeathMerge(baseFile, { wifeDeceased: true });
            const fileAfterWife = { ...baseFile, ...afterWife };
            const p = resolveAlimonyBeneficiaryProfile(fileAfterWife);
            expect(p?.wifeAlive).toBe(false);
            expect(p?.childrenAlive).toBe(2);
            expect(shouldShowAlimonyBeneficiaryDeathPicker(p!)).toBe(true);

            const afterOneChild = buildAlimonyBeneficiaryDeathMerge(fileAfterWife, {
                childrenDiedCount: 1,
            });
            const fileOneChild = { ...fileAfterWife, ...afterOneChild };
            const sole = resolveAlimonyBeneficiaryProfile(fileOneChild);
            expect(sole?.childrenAlive).toBe(1);
            expect(shouldShowAlimonyBeneficiaryDeathPicker(sole!)).toBe(false);
            expect(buildSoleSurvivorDeathInput(sole!)).toEqual({
                wifeDeceased: false,
                childrenDiedCount: 1,
            });
        });

        it('auto-input for wife-only alimony', () => {
            const wifeOnly = {
                claimType: 'نفقة',
                monthlyWifeAlimony: 300_000,
                totalAmount: 600_000,
                alimony: {
                    calculated: {
                        wifeBaseAccumulation: 600_000,
                        childrenBaseAccumulation: 0,
                        baseAccumulation: 600_000,
                        totalAccumulated: 600_000,
                    },
                },
            };
            const p = resolveAlimonyBeneficiaryProfile(wifeOnly);
            expect(shouldShowAlimonyBeneficiaryDeathPicker(p!)).toBe(false);
            expect(buildSoleSurvivorDeathInput(p!)).toEqual({
                wifeDeceased: true,
                childrenDiedCount: 0,
            });
            const merge = buildAlimonyBeneficiaryDeathMerge(wifeOnly, buildSoleSurvivorDeathInput(p!)!);
            expect(merge?.dossier_lifecycle_status).toBe('finished');
        });
    });

    describe('shouldSuppressOngoingAlimonyMonthlyUi', () => {
        it('يُخفى عرض الحاوية حصراً عند وفاة المدين', () => {
            expect(shouldSuppressOngoingAlimonyMonthlyUi(true)).toBe(true);
            expect(shouldSuppressOngoingAlimonyMonthlyUi(false)).toBe(false);
        });
    });

    describe('مطالبات مركّبة (نفقة مستمرة + ماضية / مهر)', () => {
        const mixedPastMahr = {
            claimTypes: ['نفقة', 'نفقة ماضية', 'مهر مؤجل'],
            claimAmountsByType: { 'نفقة ماضية': '400000', 'مهر مؤجل': '500000' },
            monthlyWifeAlimony: 100_000,
            monthlyChildrenAlimony: 50_000,
            childrenCount: 2,
            totalAmount: 1_500_000,
            pastAlimonyClaim: { amount: 400_000 },
            alimony: {
                beneficiary: 'زوجة وأولاد',
                calculated: {
                    wifeBaseAccumulation: 350_000,
                    childrenBaseAccumulation: 250_000,
                    baseAccumulation: 600_000,
                    totalAccumulated: 600_000,
                    pastAccumulation: 0,
                },
            },
        };

        it('وفاة الزوجة تُنقص النفقة المستمرة فقط ولا تمس النفقة الماضية أو المهر', () => {
            const merge = buildAlimonyBeneficiaryDeathMerge(mixedPastMahr, { wifeDeceased: true });
            expect(merge?.dossier_lifecycle_status).toBeUndefined();
            expect(Number(merge?.totalAmount)).toBe(1_150_000);
            expect(merge?.monthlyWifeAlimony).toBe(0);
            expect(merge?.monthlyAlimony).toBe(100_000);
        });

        it('وفاة طفل واحد تُنقص حصة الأطفال المستمرة فقط', () => {
            const merge = buildAlimonyBeneficiaryDeathMerge(mixedPastMahr, { childrenDiedCount: 1 });
            expect(merge?.dossier_lifecycle_status).toBeUndefined();
            expect(Number(merge?.totalAmount)).toBe(1_375_000);
            expect(merge?.children_count).toBe(1);
            expect(merge?.monthlyAlimony).toBe(150_000);
        });

        it('استنفاد جميع المستحقين لا يُغلق الإضبارة إن بقيت نفقة ماضية أو مهر', () => {
            const merge = buildAlimonyBeneficiaryDeathMerge(mixedPastMahr, {
                wifeDeceased: true,
                childrenDiedCount: 2,
            });
            expect(merge?.dossier_lifecycle_status).toBeUndefined();
            expect(merge?.is_creditor_deceased).toBe(true);
            expect(Number(merge?.totalAmount)).toBe(900_000);
            expect(merge?.monthlyAlimony).toBe(0);
        });
    });

    it('derives childMonthly from lump when childrenMonthly missing in blob', () => {
        const file = {
            claimTypes: ['نفقة'],
            monthlyAlimony: 200_000,
            monthlyWifeAlimony: 120_000,
            childrenCount: 2,
            alimony: {
                beneficiary: 'زوجة وأولاد',
                wifeMonthly: '120000',
                childrenCount: 2,
                calculated: { monthlyOngoing: 200_000 },
            },
        };
        const p = resolveAlimonyBeneficiaryProfile(file);
        expect(p?.childMonthly).toBe(40_000);
        const display = resolveOngoingAlimonyMonthlyDisplay(file);
        expect(display.detailLines.some((l) => l.includes('أولاد') || l.includes('الطفل'))).toBe(
            true
        );
    });

    describe('resolveSurvivorOngoingMonthlyAlimonyIqd', () => {
        it('يبقي النفقة الشهرية بعد وفاة الزوجة فقط', () => {
            const afterWife = buildAlimonyBeneficiaryDeathMerge(baseFile, { wifeDeceased: true });
            const monthly = resolveSurvivorOngoingMonthlyAlimonyIqd({ ...baseFile, ...afterWife });
            expect(monthly).toBe(100_000);
        });

        it('يُصفّر عند وفاة جميع المستحقين', () => {
            const merge = buildAlimonyBeneficiaryDeathMerge(baseFile, {
                wifeDeceased: true,
                childrenDiedCount: 2,
            });
            expect(resolveSurvivorOngoingMonthlyAlimonyIqd({ ...baseFile, ...merge })).toBe(0);
        });

        it('يقرأ النفقة من بيانات الإنشاء (alimony blob)', () => {
            const intakeFile = {
                claimTypes: ['نفقة'],
                alimony: {
                    beneficiary: 'زوجة وأولاد',
                    wifeMonthly: '150000',
                    childrenMonthly: '50000',
                    childrenCount: 2,
                    calculated: { monthlyOngoing: 250_000 },
                },
            };
            expect(resolveSurvivorOngoingMonthlyAlimonyIqd(intakeFile)).toBe(250_000);
        });
    });
});
