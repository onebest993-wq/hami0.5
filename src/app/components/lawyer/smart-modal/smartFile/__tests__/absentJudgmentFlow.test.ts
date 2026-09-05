import { describe, expect, it } from 'vitest';
import {
    ABSENT_JUDGMENT_OBJECTION_DAYS,
    absentObjectionJudgmentOptions,
    absentObjectionJudgmentOptionsForClient,
    canOfferAbsentObjectionToDefendant,
    computeAbsentObjectionDeadline,
    daysRemainingUntil,
    hasAbsentObjectionStageInDossier,
    isAbsentGhayabiWorkflowStage,
    isAbsentObjectionStageName,
    isAwaitingAbsentJudgmentNotification,
    isAbsentJudgmentForm,
    isDefendantAdverseAbsentOutcome,
    resolveAbsentObjectionClientRole,
    resolveLawyerOriginalSideInAbsentObjection,
    shouldShowAbsentJudgmentFooter,
    shouldShowAbsentJudgmentNotificationAction,
} from '../absentJudgmentFlow';
import { resolveAbsentObjectionAppealRights, resolveAbsentObjectionWaitDecisionText } from '../absentJudgmentAppealRights';
import { resolveAllowedOpponentAppealMethods } from '../judgmentTypes';

describe('absentJudgmentFlow', () => {
    it('detects absent judgment form', () => {
        expect(isAbsentJudgmentForm('غيابي')).toBe(true);
        expect(isAbsentJudgmentForm('حضوري')).toBe(false);
        expect(isAbsentJudgmentForm('مختلط')).toBe(false);
    });

    it('computes objection deadline 10 days after notification', () => {
        expect(computeAbsentObjectionDeadline('2026-06-01')).toBe('2026-06-11');
        expect(ABSENT_JUDGMENT_OBJECTION_DAYS).toBe(10);
    });

    it('detects awaiting notification state', () => {
        expect(
            isAwaitingAbsentJudgmentNotification({
                stageName: 'البداءة',
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
                finalDecision: 'حكم غيابي — بانتظار التبليغ والاعتراض',
            }),
        ).toBe(true);
        expect(
            isAwaitingAbsentJudgmentNotification({
                stageName: 'البداءة',
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
                absentJudgmentNotificationDate: '2026-06-01',
                finalDecision: 'حكم غيابي',
            }),
        ).toBe(false);
    });

    it('يبقى التبليغ ظاهراً حتى يُبلَّغ كل الغائبين ويختفي على المرحلة اللاحقة', () => {
        const first = {
            id: 's0',
            stageName: 'بداءة بدرجة أولى',
            isPleadingsClosed: true,
            judgmentForm: 'غيابي',
            finalDecision: 'حكم غيابي — بانتظار التبليغ والاعتراض',
            parties: [
                { id: 1, name: 'أحمد', role: 'مدعي' },
                { id: 2, name: 'سامي', role: 'مدعى عليه' },
                { id: 3, name: 'كريم', role: 'مدعى عليه' },
            ],
            partyChallengeLanes: [
                { partyId: '2', disposition: 'غيابي' as const, laneState: 'pending' as const, servedAt: '2026-08-10' },
                { partyId: '3', disposition: 'غيابي' as const, laneState: 'pending' as const },
            ],
            absentJudgmentNotificationDate: '2026-08-10',
        };
        const appeal = {
            id: 's1',
            stageName: 'الاستئناف',
            isPleadingsClosed: false,
        };
        const objection = {
            id: 's2',
            stageName: 'الاعتراض على الحكم الغيابي',
            isPleadingsClosed: false,
        };
        expect(shouldShowAbsentJudgmentNotificationAction(first, [first])).toBe(true);
        expect(shouldShowAbsentJudgmentNotificationAction(first, [first, appeal])).toBe(true);
        expect(shouldShowAbsentJudgmentNotificationAction(appeal, [first, appeal])).toBe(false);
        expect(shouldShowAbsentJudgmentNotificationAction(objection, [first, objection])).toBe(false);
        const allServed = {
            ...first,
            partyChallengeLanes: [
                { partyId: '2', disposition: 'غيابي' as const, laneState: 'pending' as const, servedAt: '2026-08-10' },
                { partyId: '3', disposition: 'غيابي' as const, laneState: 'pending' as const, servedAt: '2026-08-12' },
            ],
        };
        expect(shouldShowAbsentJudgmentNotificationAction(allServed, [allServed])).toBe(false);
    });

    it('calculates days remaining', () => {
        const remaining = daysRemainingUntil('2099-01-01', new Date('2098-12-20'));
        expect(remaining).toBeGreaterThan(0);
    });

    it('detects absent objection stage name', () => {
        expect(isAbsentObjectionStageName('الاعتراض على الحكم الغيابي')).toBe(true);
        expect(isAbsentObjectionStageName('بداءة بدرجة أولى (اعتراض غيابي)')).toBe(true);
        expect(isAbsentObjectionStageName('بداءة بدرجة أولى')).toBe(false);
    });

    it('exposes objection-stage judgment labels without إبطال', () => {
        const options = absentObjectionJudgmentOptions();
        const labels = options.map((o) => o.label).join(' ');
        expect(labels).toContain('تأييد الحكم الغيابي');
        expect(labels).toContain('تعديل الحكم الغيابي بالكامل');
        expect(options.some((o) => o.value === 'إبطال')).toBe(false);
        expect(options.some((o) => o.value === 'رد الاعتراض شكلاً')).toBe(true);
    });

    it('allows absent objection only once per dossier', () => {
        const stages = [
            { stageName: 'البداءة' },
            { stageName: 'البداءة (اعتراض غيابي)' },
        ];
        expect(hasAbsentObjectionStageInDossier(stages)).toBe(true);
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'البداءة',
                stages,
                judgmentForm: 'غيابي',
            }),
        ).toBe(false);
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'البداءة (اعتراض غيابي)',
                stages,
                judgmentForm: 'غيابي',
            }),
        ).toBe(false);
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'البداءة',
                stages: [{ stageName: 'البداءة' }],
                judgmentForm: 'غيابي',
            }),
        ).toBe(true);
    });

    it('resolves absent objection appeal rights from objector/objected roles', () => {
        const objectedClient = [
            {
                id: 1,
                name: 'موكل',
                role: 'المعترض عليه بالحكم الغيابي (المدعي)',
                isClient: true,
            },
        ];
        const objectorClient = [
            {
                id: 2,
                name: 'موكل',
                role: 'المعترض على الحكم الغيابي (المدعى عليه)',
                isClient: true,
            },
        ];

        expect(resolveAbsentObjectionClientRole(objectedClient)).toBe('objected');
        expect(resolveAbsentObjectionClientRole(objectorClient)).toBe('objector');

        expect(
            resolveAbsentObjectionAppealRights('إجابة الدعوى بالكامل', objectedClient).action,
        ).toBe('wait_opponent');
        expect(
            resolveAbsentObjectionAppealRights('إجابة الدعوى بالكامل', objectorClient).action,
        ).toBe('self_appeal');

        expect(
            resolveAbsentObjectionAppealRights('رد الدعوى كلياً', objectorClient).action,
        ).toBe('wait_opponent');
        expect(
            resolveAbsentObjectionAppealRights('رد الدعوى كلياً', objectedClient).action,
        ).toBe('self_appeal');

        expect(resolveAbsentObjectionWaitDecisionText('إجابة الدعوى بالكامل', 'wait_opponent')).toBe(
            'تأييد الحكم الغيابي — بانتظار طعن المعترض',
        );
        expect(resolveAbsentObjectionWaitDecisionText('رد الدعوى كلياً', 'wait_opponent')).toBe(
            'تعديل الحكم الغيابي — بانتظار طعن المعترض عليه',
        );
        expect(resolveAbsentObjectionWaitDecisionText('إجابة الدعوى بالكامل', 'self_appeal')).toBe(
            'تأييد الحكم الغيابي — يحق لموكلك الطعن',
        );
        expect(resolveAbsentObjectionWaitDecisionText('رد الدعوى كلياً', 'self_appeal')).toBe(
            'تعديل الحكم الغيابي — يحق لموكلك الطعن',
        );
        expect(
            resolveAbsentObjectionAppealRights('رد الاعتراض شكلاً', objectedClient).action,
        ).toBe('wait_opponent');
        expect(
            resolveAbsentObjectionAppealRights('رد الاعتراض شكلاً', objectorClient).action,
        ).toBe('none');
        expect(resolveAbsentObjectionWaitDecisionText('رد الاعتراض شكلاً', 'wait_opponent')).toContain(
            'رد الاعتراض شكلاً',
        );
    });

    it('labels objection options relative to marked client', () => {
        const options = absentObjectionJudgmentOptionsForClient([
            {
                id: 1,
                name: 'موكل',
                role: 'المعترض عليه بالحكم الغيابي (المدعي)',
                isClient: true,
            },
        ]);
        expect(options[0]?.label).toContain('موكلك ربح الاعتراض');
        expect(options[0]?.hint).toContain('موكلك: المعترض عليه');
    });

    it('resolves lawyer original side from objection roles', () => {
        expect(
            resolveLawyerOriginalSideInAbsentObjection([
                {
                    id: 1,
                    name: 'موكل',
                    role: 'المعترض عليه بالحكم الغيابي (المدعي)',
                    isClient: true,
                },
            ]),
        ).toBe('المدعي');
        expect(
            resolveLawyerOriginalSideInAbsentObjection([
                {
                    id: 2,
                    name: 'موكل',
                    role: 'المعترض على الحكم الغيابي (المدعى عليه)',
                    isClient: true,
                },
            ]),
        ).toBe('المدعى عليه');
    });

    it('restricts absent ghayabi workflow to beginning pleading stages only', () => {
        expect(isAbsentGhayabiWorkflowStage('البداءة')).toBe(true);
        expect(isAbsentGhayabiWorkflowStage('بداءة بدرجة أولى')).toBe(true);
        expect(isAbsentGhayabiWorkflowStage('الاعتراض على الحكم الغيابي')).toBe(true);
        expect(isAbsentGhayabiWorkflowStage('الاستئناف')).toBe(false);
        expect(isAbsentGhayabiWorkflowStage('التمييز')).toBe(false);
        expect(isAbsentGhayabiWorkflowStage('تصحيح قرار')).toBe(false);
    });

    it('allows absent objection only when absent judgment favors plaintiff', () => {
        expect(isDefendantAdverseAbsentOutcome('إجابة الدعوى بالكامل')).toBe(true);
        expect(isDefendantAdverseAbsentOutcome('محسومة لصالح الموكل - بانتظار الطعن')).toBe(true);
        expect(isDefendantAdverseAbsentOutcome('حكم غيابي')).toBe(true);
        expect(isDefendantAdverseAbsentOutcome('رد الدعوى كلياً')).toBe(false);
        expect(isDefendantAdverseAbsentOutcome('ضد الموكل (المدعى عليه)')).toBe(false);
    });

    it('keeps absent objection in opponent registration for ghayabi personal status', () => {
        expect(
            resolveAllowedOpponentAppealMethods({
                judgmentForm: 'غيابي',
                stageName: 'أحوال شخصية',
                finalDecision: 'محسومة لصالح الموكل - بانتظار الطعن',
                stages: [{ stageName: 'أحوال شخصية' }],
                file: { lawsuitJurisdiction: 'personal' },
            }),
        ).toEqual(['اعتراض غيابي', 'تمييز']);
    });

    it('blocks absent objection on appeal stage even with غيابي judgment form', () => {
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'الاستئناف',
                stages: [{ stageName: 'البداءة' }, { stageName: 'الاستئناف' }],
                judgmentForm: 'غيابي',
                lastJudgmentType: 'غيابي',
                finalDecision: 'إجابة الدعوى بالكامل',
                representedParty: 'المدعى عليه',
            }),
        ).toBe(false);
        expect(
            shouldShowAbsentJudgmentFooter({
                stageName: 'الاستئناف',
                judgmentForm: 'غيابي',
                lastJudgmentType: 'غيابي',
                isPleadingsClosed: true,
                finalDecision: 'إجابة الدعوى بالكامل',
            }, undefined, 'المدعى عليه'),
        ).toBe(false);
    });

    it('allows absent objection for defendant counsel on personal status core stage', () => {
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'أحوال شخصية',
                stages: [{ stageName: 'أحوال شخصية' }],
                judgmentForm: 'غيابي',
                finalDecision: 'إجابة الدعوى بالكامل',
                representedParty: 'المدعى عليه',
            }),
        ).toBe(true);
        expect(
            shouldShowAbsentJudgmentFooter({
                stageName: 'أحوال شخصية',
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
                finalDecision: 'إجابة الدعوى بالكامل',
            }, undefined, 'المدعى عليه'),
        ).toBe(true);
        expect(
            shouldShowAbsentJudgmentFooter({
                stageName: 'أحوال شخصية',
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
                finalDecision: 'إجابة الدعوى بالكامل',
            }, undefined, 'المدعي'),
        ).toBe(false);
    });

    it('blocks absent objection when defendant won absent judgment (رد الدعوى)', () => {
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'البداءة',
                stages: [{ stageName: 'البداءة' }],
                judgmentForm: 'غيابي',
                finalDecision: 'رد الدعوى كلياً',
                representedParty: 'المدعى عليه',
            }),
        ).toBe(false);
        expect(
            shouldShowAbsentJudgmentFooter({
                stageName: 'البداءة',
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
                finalDecision: 'رد الدعوى كلياً',
            }, undefined, 'المدعى عليه'),
        ).toBe(false);
    });

    it('blocks absent judgment footer after objection stage exists in dossier', () => {
        const stages = [
            {
                stageName: 'البداءة',
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
                finalDecision: 'إجابة الدعوى بالكامل',
            },
            { stageName: 'البداءة (اعتراض غيابي)' },
        ];
        expect(
            shouldShowAbsentJudgmentFooter(
                {
                    stageName: 'البداءة',
                    judgmentForm: 'غيابي',
                    isPleadingsClosed: true,
                    finalDecision: 'إجابة الدعوى بالكامل',
                },
                stages,
            ),
        ).toBe(false);
    });

    it('offers absent objection on personal status subject-matter stage for defendant counsel', () => {
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'أحوال شخصية',
                judgmentForm: 'غيابي',
                finalDecision: 'إجابة الدعوى بالكامل',
                representedParty: 'وكيل المدعى عليه',
            }),
        ).toBe(true);
    });

    it('الحكم المختلط: اعتراض الغيابي فقط إذا كان الموكل مدعى عليه غائباً', () => {
        const mixed = [
            { partyId: '2', form: 'حضوري' as const },
            { partyId: '3', form: 'غيابي' as const },
        ];
        const partiesPresentClient = [
            { id: 1, role: 'مدعي', isClient: false },
            { id: 2, role: 'مدعى عليه', isClient: true },
            { id: 3, role: 'مدعى عليه', isClient: false },
        ];
        const partiesAbsentClient = [
            { id: 1, role: 'مدعي', isClient: false },
            { id: 2, role: 'مدعى عليه', isClient: false },
            { id: 3, role: 'مدعى عليه', isClient: true },
        ];
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'بداءة بدرجة أولى',
                stages: [{ stageName: 'بداءة بدرجة أولى' }],
                judgmentForm: 'مختلط',
                finalDecision: 'إجابة الدعوى بالكامل',
                representedParty: 'المدعى عليه',
                partyJudgmentDispositions: mixed,
                parties: partiesPresentClient,
            }),
        ).toBe(false);
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'بداءة بدرجة أولى',
                stages: [{ stageName: 'بداءة بدرجة أولى' }],
                judgmentForm: 'مختلط',
                finalDecision: 'إجابة الدعوى بالكامل',
                representedParty: 'المدعى عليه',
                partyJudgmentDispositions: mixed,
                parties: partiesAbsentClient,
            }),
        ).toBe(true);
        expect(
            canOfferAbsentObjectionToDefendant({
                currentStage: 'بداءة بدرجة أولى',
                stages: [{ stageName: 'بداءة بدرجة أولى' }],
                judgmentForm: 'غيابي',
                finalDecision: 'إجابة الدعوى بالكامل',
                representedParty: 'المدعى عليه',
            }),
        ).toBe(true);
        expect(
            shouldShowAbsentJudgmentFooter(
                {
                    stageName: 'بداءة بدرجة أولى',
                    judgmentForm: 'مختلط',
                    isPleadingsClosed: true,
                    finalDecision: 'حكم مختلط — بانتظار التبليغ والطعن',
                    partyJudgmentDispositions: mixed,
                    parties: partiesAbsentClient,
                },
                [{ stageName: 'بداءة بدرجة أولى' }],
                'المدعى عليه',
            ),
        ).toBe(true);
        expect(
            shouldShowAbsentJudgmentFooter(
                {
                    stageName: 'بداءة بدرجة أولى',
                    judgmentForm: 'مختلط',
                    isPleadingsClosed: true,
                    finalDecision: 'حكم مختلط — بانتظار التبليغ والطعن',
                    partyJudgmentDispositions: mixed,
                    parties: partiesPresentClient,
                },
                [{ stageName: 'بداءة بدرجة أولى' }],
                'المدعى عليه',
            ),
        ).toBe(false);
        expect(
            isAwaitingAbsentJudgmentNotification({
                stageName: 'بداءة بدرجة أولى',
                judgmentForm: 'مختلط',
                isPleadingsClosed: true,
                finalDecision: 'حكم مختلط — بانتظار التبليغ والطعن',
                partyJudgmentDispositions: mixed,
            }),
        ).toBe(true);
    });
});
