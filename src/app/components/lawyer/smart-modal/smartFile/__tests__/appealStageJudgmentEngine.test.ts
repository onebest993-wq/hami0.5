import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    resolveAppealStageClientOutcome,
    resolveCassationClientOutcome,
    resolveClientAppealRole,
    resolveCorrectionAcceptedClientOutcome,
    resolveCorrectionRejectedClientOutcome,
    resolvePriorAppealJudgmentForCassation,
    buildAppealArchiveTimelineTitle,
    buildCassationRemandTimelineTitle,
} from '../appealStageJudgmentEngine';

describe('appealStageJudgmentEngine', () => {
    const appelleeClient = [
        {
            id: 1,
            name: 'موكل',
            role: 'المستأنف عليه (المدعي)',
            isClient: true,
        },
        {
            id: 2,
            name: 'خصم',
            role: 'المستأنف (المدعى عليه)',
            isClient: false,
        },
    ];

    it('resolves client as appellee from appeal-integrated role', () => {
        expect(resolveClientAppealRole(appelleeClient)).toBe('appellee');
    });

    it('appellee loses when appeal court quashes first-instance judgment', () => {
        expect(
            resolveAppealStageClientOutcome('فسخ الحكم البدائي كلياً', 'appellee'),
        ).toBe('loss');
        expect(
            resolveAppealStageClientOutcome('فسخ الحكم البدائي كلياً', 'appellant'),
        ).toBe('win');
    });

    it('cassation ratification after appeal loss is loss for appellee', () => {
        expect(
            resolveCassationClientOutcome(
                'تصديق الحكم',
                'appellee',
                'فسخ الحكم البدائي كلياً',
            ),
        ).toBe('loss');
    });

    it('cassation ratification after appeal win is win for appellee', () => {
        expect(
            resolveCassationClientOutcome(
                'تصديق الحكم',
                'appellee',
                'تأييد الحكم البدائي ورد الاستئناف',
            ),
        ).toBe('win');
    });

    it('reads prior appeal judgment from cassation metadata', () => {
        const stages = [
            {
                stageName: 'الاستئناف',
                status: 'locked',
                finalDecision: 'محسومة ضد الموكل — انتقال لمرحلة تمييز',
            } as CaseStage,
            {
                stageName: 'التمييز',
                status: 'active',
                appealMetadata: { priorJudgmentType: 'فسخ الحكم البدائي كلياً' },
            } as CaseStage,
        ];
        expect(resolvePriorAppealJudgmentForCassation(stages, 1)).toBe(
            'فسخ الحكم البدائي كلياً',
        );
    });

    it('builds loss timeline title when appellee transitions to cassation after quash', () => {
        expect(
            buildAppealArchiveTimelineTitle(
                'فسخ الحكم البدائي كلياً',
                'appellee',
                true,
            ),
        ).toContain('خسارة مرحلة الاستئناف');
    });

    it('correction rejected is loss when cassation ratified adverse appeal judgment', () => {
        const stages = [
            {
                stageName: 'الاستئناف',
                status: 'locked',
                finalDecision: 'فسخ الحكم البدائي كلياً',
            } as CaseStage,
            {
                stageName: 'التمييز',
                status: 'completed',
                finalDecision: 'مكتسبة الدرجة القطعية',
                timeline: [
                    {
                        id: 'cass_final',
                        type: 'milestone',
                        date: '2026-01-01',
                        title: 'تصديق الحكم — اكتسب الدرجة القطعية (حكم نهائي ضد الموكل)',
                    },
                ],
            } as CaseStage,
            {
                stageName: 'تصحيح قرار',
                status: 'active',
            } as CaseStage,
        ];
        expect(
            resolveCorrectionRejectedClientOutcome(stages, 2, 'appellee'),
        ).toBe('loss');
    });

    it('correction rejected is win when cassation ratified favorable appeal judgment', () => {
        const stages = [
            {
                stageName: 'الاستئناف',
                status: 'locked',
                finalDecision: 'تأييد الحكم البدائي ورد الاستئناف',
            } as CaseStage,
            {
                stageName: 'التمييز',
                status: 'completed',
                finalDecision: 'مكتسبة الدرجة القطعية',
                timeline: [
                    {
                        id: 'cass_final',
                        type: 'milestone',
                        date: '2026-01-01',
                        title: 'تم تصديق الحكم واكتساب الدعوى الدرجة القطعية',
                    },
                ],
            } as CaseStage,
            {
                stageName: 'تصحيح قرار',
                status: 'active',
            } as CaseStage,
        ];
        expect(
            resolveCorrectionRejectedClientOutcome(stages, 2, 'appellee'),
        ).toBe('win');
    });

    it('correction accepted flips adverse cassation standing to win for client', () => {
        const stages = [
            {
                stageName: 'الاستئناف',
                status: 'locked',
                finalDecision: 'فسخ الحكم البدائي كلياً',
            } as CaseStage,
            {
                stageName: 'التمييز',
                status: 'completed',
                finalDecision: 'مكتسبة الدرجة القطعية',
                timeline: [
                    {
                        id: 'cass_final',
                        type: 'milestone',
                        date: '2026-01-01',
                        title: 'تصديق الحكم — اكتسب الدرجة القطعية (حكم نهائي ضد الموكل)',
                    },
                ],
            } as CaseStage,
            {
                stageName: 'تصحيح قرار',
                status: 'active',
            } as CaseStage,
        ];
        expect(
            resolveCorrectionAcceptedClientOutcome(stages, 2, 'appellee'),
        ).toBe('win');
    });

    it('partial appeal quash maps cassation ratification to appellant win', () => {
        expect(
            resolveCassationClientOutcome(
                'تصديق الحكم',
                'appellant',
                'فسخ الحكم البدائي جزئياً',
            ),
        ).toBe('win');
        expect(
            resolveCassationClientOutcome(
                'تصديق الحكم',
                'appellee',
                'فسخ الحكم البدائي جزئياً',
            ),
        ).toBe('loss');
    });

    it('builds remand title favorable when appeal loss reversed at cassation', () => {
        expect(
            buildCassationRemandTimelineTitle(
                'نقض الحكم وإعادة الإضبارة',
                'appellee',
                'فسخ الحكم البدائي كلياً',
            ),
        ).toContain('لصالح الموكل');
    });
});
