import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    EXTRAORDINARY_APPEAL_LABELS,
    findCassationStageIndex,
    isDossierFinalized,
    isExtraordinaryTypeConsumed,
    resolveRetrialTargetStageIndex,
    shouldShowExtraordinaryLegalEntry,
} from '../extraordinaryAppealGateway';

describe('extraordinaryAppealGateway', () => {
    it('detects final dossier from status or stage decision', () => {
        expect(isDossierFinalized('مكتسبة الدرجة القطعية', [])).toBe(true);
        expect(isDossierFinalized('مصدق — اكتسب الدرجة القطعية', [])).toBe(true);
        expect(
            isDossierFinalized('', [
                { stageName: 'التمييز', finalDecision: 'مكتسبة الدرجة القطعية' } as CaseStage,
            ]),
        ).toBe(true);
        expect(
            isDossierFinalized('', [
                {
                    stageName: 'تمييز',
                    finalDecision: 'مصدق (القرار اكتسب الدرجة القطعية)',
                } as CaseStage,
            ]),
        ).toBe(true);
        expect(isDossierFinalized('نشطة', [{ stageName: 'البداءة' } as CaseStage])).toBe(false);
    });

    it('resolves retrial target to appeal when present, else first instance', () => {
        const withAppeal = [
            { stageName: 'البداءة', status: 'locked' },
            { stageName: 'الاستئناف', status: 'locked' },
            { stageName: 'التمييز', status: 'completed' },
        ] as CaseStage[];
        expect(resolveRetrialTargetStageIndex(withAppeal)).toBe(1);

        const firstOnly = [
            { stageName: 'البداءة', status: 'locked' },
            { stageName: 'التمييز', status: 'completed' },
        ] as CaseStage[];
        expect(resolveRetrialTargetStageIndex(firstOnly)).toBe(0);
        expect(findCassationStageIndex(firstOnly)).toBe(1);
    });

    it('resolves personal status retrial to أحوال شخصية not تمييز', () => {
        const stages = [
            { stageName: 'أحوال شخصية', status: 'locked' },
            { stageName: 'تمييز', status: 'completed' },
        ] as CaseStage[];
        expect(resolveRetrialTargetStageIndex(stages)).toBe(0);
        expect(findCassationStageIndex(stages)).toBe(1);
    });

    it('consumes cassation correction within the same cassation cycle', () => {
        const stages = [
            { stageName: 'التمييز', status: 'completed', finalDecision: 'تصديق الحكم' },
            { stageName: 'تصحيح قرار', status: 'completed' },
        ] as CaseStage[];

        expect(
            isExtraordinaryTypeConsumed(stages, EXTRAORDINARY_APPEAL_LABELS.cassation_correction),
        ).toBe(true);
    });

    it('allows cassation correction again after new cassation cycle', () => {
        const stages = [
            { stageName: 'البداءة', status: 'locked' },
            { stageName: 'الاستئناف', status: 'active', wasReopened: true },
            { stageName: 'التمييز', status: 'completed', finalDecision: 'منقوض (إعادة للمحاكمة)' },
            { stageName: 'تصحيح قرار', status: 'completed' },
            { stageName: 'التمييز', status: 'active' },
        ] as CaseStage[];

        expect(isExtraordinaryTypeConsumed(stages, EXTRAORDINARY_APPEAL_LABELS.cassation_correction)).toBe(
            false,
        );
    });

    it('hides consumed extraordinary paths', () => {
        const stages = [
            { stageName: 'الاستئناف', extraordinaryAppealType: 'إعادة المحاكمة' },
            { stageName: 'التمييز' },
        ] as CaseStage[];
        expect(
            isExtraordinaryTypeConsumed(stages, EXTRAORDINARY_APPEAL_LABELS.retrial),
        ).toBe(true);
        expect(
            isExtraordinaryTypeConsumed(stages, EXTRAORDINARY_APPEAL_LABELS.cassation_correction),
        ).toBe(false);
        expect(
            isExtraordinaryTypeConsumed(
                [{ stageName: 'التمييز' } as CaseStage],
                EXTRAORDINARY_APPEAL_LABELS.cassation_correction,
                'قيد نظر التصحيح التمييزي',
            ),
        ).toBe(true);
    });

    it('shows legal entry for archived final and for correction in progress', () => {
        const stages = [
            { stageName: 'أحوال شخصية', status: 'locked' },
            {
                stageName: 'تمييز',
                status: 'completed',
                finalDecision: 'مصدق (القرار اكتسب الدرجة القطعية)',
            },
        ] as CaseStage[];

        expect(
            shouldShowExtraordinaryLegalEntry({
                isViewingArchived: true,
                showWorkSurface: false,
                status: 'مكتسبة الدرجة القطعية',
                stages,
            }),
        ).toBe(true);

        expect(
            shouldShowExtraordinaryLegalEntry({
                isViewingArchived: false,
                showWorkSurface: false,
                status: 'قيد نظر التصحيح التمييزي',
                stages: [{ stageName: 'تمييز', status: 'active' } as CaseStage],
            }),
        ).toBe(true);

        expect(
            shouldShowExtraordinaryLegalEntry({
                isViewingArchived: false,
                showWorkSurface: false,
                status: 'نشطة',
                stages: [{ stageName: 'تمييز', status: 'active' } as CaseStage],
            }),
        ).toBe(false);

        expect(
            shouldShowExtraordinaryLegalEntry({
                isViewingArchived: true,
                showWorkSurface: true,
                status: 'مكتسبة الدرجة القطعية',
                stages,
            }),
        ).toBe(false);
    });
});
