import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    ART172_COVERAGE_NOTICE,
    ART172_RESUME_LABEL,
    ART172_STAY_BADGE,
    ART172_STAY_LABEL,
    ART172_SUSPENSION_REASON,
    applyArt172AppealResume,
    applyArt172AppealStay,
    blocksCivilDossierFinality,
    canOfferArt172AppealResume,
    canOfferArt172AppealStay,
    isAbsentClientCoveredByCoDefendantAppeal,
    isArt172AppealStayActive,
    isGhayabiObjectionPending,
    ART172_STAY_TEACHING_HINT,
    resolvePriorFirstInstanceJudgmentSource,
    findPriorFirstInstanceJudgmentIndex,
    shouldStayIndivisibleExecution,
} from '../art172AppealStay';

const MIXED_DISPOSITIONS = [
    { partyId: '2', form: 'حضوري' as const },
    { partyId: '3', form: 'غيابي' as const },
];

const REGISTERED_OBJECTION_LANES = [
    { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
    { partyId: '3', disposition: 'غيابي' as const, laneState: 'objection' as const },
];

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
    { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
    { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
];

function firstInstance(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'locked',
        isPleadingsClosed: true,
        judgmentForm: 'مختلط',
        disputeIntegrity: 'indivisible',
        partyJudgmentDispositions: MIXED_DISPOSITIONS,
        parties: PARTIES,
        ...overrides,
    } as CaseStage;
}

function appealStage(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's1',
        name: 'الاستئناف',
        stageName: 'الاستئناف',
        status: 'active',
        parties: PARTIES,
        appealMetadata: {
            appellantPartyIds: ['2'],
            appelleePartyIds: ['1', '3'],
            priorStageOutcome: 'LOSS',
            priorJudgmentForm: 'MIXED',
        },
        ...overrides,
    } as CaseStage;
}

describe('art172AppealStay — وحدة النزاع', () => {
    it('لا يقدّم الاستئخار لطرف واحد أو لنزاع قابل للتجزئة', () => {
        expect(
            canOfferArt172AppealStay({
                currentStage: appealStage(),
                stages: [
                    firstInstance({
                        judgmentForm: 'غيابي',
                        partyJudgmentDispositions: [{ partyId: '2', form: 'غيابي' }],
                    }),
                    appealStage(),
                ],
            }),
        ).toBe(false);
        expect(
            canOfferArt172AppealStay({
                currentStage: appealStage(),
                stages: [firstInstance({ disputeIntegrity: 'severable' }), appealStage()],
            }),
        ).toBe(false);
        expect(
            canOfferArt172AppealStay({
                currentStage: appealStage(),
                stages: [firstInstance({ disputeIntegrity: undefined }), appealStage()],
            }),
        ).toBe(false);
    });

    it('لا يقدّم الاستئخار قبل تسجيل اعتراض في إحدى البطاقات', () => {
        const appeal = appealStage();
        expect(
            canOfferArt172AppealStay({
                currentStage: appeal,
                stages: [firstInstance(), appeal],
            }),
        ).toBe(false);
    });

    it('لا يقدّم الاستئخار للنزاع القابل للتجزئة حتى مع اعتراض غيابي معلّق (م/172)', () => {
        const appeal = appealStage();
        expect(
            canOfferArt172AppealStay({
                currentStage: appeal,
                stages: [
                    firstInstance({
                        disputeIntegrity: 'severable',
                        partyChallengeLanes: REGISTERED_OBJECTION_LANES,
                    }),
                    appeal,
                ],
            }),
        ).toBe(false);
    });

    it('يقدّم الاستئخار بعد ربح المدعي أو الخسارة الجزئية إذا بقي اعتراض غيابي', () => {
        expect(ART172_STAY_TEACHING_HINT).toContain('استئخار');
        const winAppeal = appealStage({
            awaitingOpponentAppeal: true,
            lastJudgmentType: 'إجابة الدعوى بالكامل',
            clientStageOutcome: 'WIN',
            appealMetadata: {
                appellantPartyIds: ['2'],
                appelleePartyIds: ['1', '3'],
                priorStageOutcome: 'WIN',
                priorJudgmentForm: 'MIXED',
            },
        });
        const pendingObjection = {
            id: 'obj',
            name: 'اعتراض على الحكم الغيابي (بداءة)',
            stageName: 'اعتراض على الحكم الغيابي (بداءة)',
            status: 'active',
            lastJudgmentType: 'إجابة الدعوى بالكامل',
        } as CaseStage;
        const winStages = [
            firstInstance({
                lastJudgmentType: 'إجابة الدعوى بالكامل',
                partyChallengeLanes: REGISTERED_OBJECTION_LANES,
            }),
            winAppeal,
            pendingObjection,
        ];
        expect(canOfferArt172AppealStay({ currentStage: winAppeal, stages: winStages })).toBe(true);
        expect(isGhayabiObjectionPending({ stages: winStages })).toBe(true);

        const partialAppeal = appealStage({
            lastJudgmentType: 'رد الدعوى جزئياً',
            clientStageOutcome: 'PARTIAL',
            appealMetadata: {
                appellantPartyIds: ['2'],
                appelleePartyIds: ['1', '3'],
                priorStageOutcome: 'PARTIAL',
                priorJudgmentForm: 'MIXED',
            },
        });
        expect(
            canOfferArt172AppealStay({
                currentStage: partialAppeal,
                stages: [
                    firstInstance({
                        lastJudgmentType: 'رد الدعوى جزئياً',
                        partyChallengeLanes: REGISTERED_OBJECTION_LANES,
                    }),
                    partialAppeal,
                ],
            }),
        ).toBe(true);
    });

    it('يقدّم الاستئخار في الاستئناف إذا سُجّل اعتراض غيابي', () => {
        const appeal = appealStage();
        expect(
            canOfferArt172AppealStay({
                currentStage: appeal,
                stages: [firstInstance({ partyChallengeLanes: REGISTERED_OBJECTION_LANES }), appeal],
            }),
        ).toBe(true);
        expect(canOfferArt172AppealResume(appeal)).toBe(false);
    });

    it('يكتب الاستئخار والاستئناف على المرحلة دون تغيير ملف الوقف العام', () => {
        const appeal = appealStage();
        const stayed = { ...appeal, ...applyArt172AppealStay(appeal, '2026-09-01') };
        expect(stayed.isSuspended).toBe(true);
        expect(stayed.suspensionReason).toBe(ART172_SUSPENSION_REASON);
        expect(isArt172AppealStayActive(stayed)).toBe(true);
        expect(canOfferArt172AppealStay({ currentStage: stayed, stages: [firstInstance(), stayed] })).toBe(
            false,
        );
        expect(canOfferArt172AppealResume(stayed)).toBe(true);
        expect(stayed.timeline?.[0]?.title).toBe(ART172_STAY_LABEL);
        expect(stayed.timeline?.[0]?.details).toBe(ART172_STAY_BADGE);

        const resumed = { ...stayed, ...applyArt172AppealResume(stayed, '2026-09-02') };
        expect(resumed.isSuspended).toBe(false);
        expect(isArt172AppealStayActive(resumed)).toBe(false);
        expect(resumed.timeline?.[0]?.title).toBe(ART172_RESUME_LABEL);
    });

    it('الموكل الغائب مشمول بطعن الشريك الحاضر في النزاع غير القابل للتجزئة', () => {
        const stages = [firstInstance(), appealStage()];
        expect(
            isAbsentClientCoveredByCoDefendantAppeal({
                stages,
                parties: PARTIES,
            }),
        ).toBe(true);
        expect(ART172_COVERAGE_NOTICE).toContain('172');
    });

    it('لا تغطية إذا اكتسب التمييز الدرجة القطعية', () => {
        expect(
            isAbsentClientCoveredByCoDefendantAppeal({
                stages: [
                    firstInstance(),
                    appealStage(),
                    {
                        id: 's2',
                        name: 'التمييز',
                        stageName: 'التمييز',
                        status: 'locked',
                        finalDecision: 'مكتسبة الدرجة القطعية',
                    } as CaseStage,
                ],
                parties: PARTIES,
            }),
        ).toBe(false);
    });

    it('لا يقدّم الاستئخار بعد تسجيل حكم الاستئناف أو على مرحلة البداءة', () => {
        expect(
            canOfferArt172AppealStay({
                currentStage: firstInstance({ status: 'active' }),
                stages: [firstInstance({ status: 'active' })],
            }),
        ).toBe(false);
        expect(
            canOfferArt172AppealStay({
                currentStage: appealStage({ finalDecision: 'تأييد الحكم البدائي ورد الاستئناف' }),
                stages: [
                    firstInstance(),
                    appealStage({ finalDecision: 'تأييد الحكم البدائي ورد الاستئناف' }),
                ],
            }),
        ).toBe(false);
    });

    it('لا تغطية إذا كان الموكل هو من استأنف أو كان النزاع قابلاً للتجزئة', () => {
        expect(
            isAbsentClientCoveredByCoDefendantAppeal({
                stages: [
                    firstInstance(),
                    appealStage({
                        appealMetadata: {
                            appellantPartyIds: ['3'],
                            appelleePartyIds: ['1'],
                            priorStageOutcome: 'LOSS',
                            priorJudgmentForm: 'HADORI',
                        },
                    }),
                ],
                parties: PARTIES,
            }),
        ).toBe(false);
        expect(
            isAbsentClientCoveredByCoDefendantAppeal({
                stages: [firstInstance({ disputeIntegrity: 'severable' }), appealStage()],
                parties: PARTIES,
            }),
        ).toBe(false);
        expect(
            isAbsentClientCoveredByCoDefendantAppeal({
                stages: [firstInstance()],
                parties: PARTIES,
            }),
        ).toBe(false);
    });

    it('لا تغطية إذا كان المستأنف هو المدعي لا شريكاً مدعى عليه', () => {
        expect(
            isAbsentClientCoveredByCoDefendantAppeal({
                stages: [
                    firstInstance(),
                    appealStage({
                        appealMetadata: {
                            appellantPartyIds: ['1'],
                            appelleePartyIds: ['2', '3'],
                            priorStageOutcome: 'LOSS',
                            priorJudgmentForm: 'HADORI',
                        },
                    }),
                ],
                parties: PARTIES,
            }),
        ).toBe(false);
    });

    it('لا استئخار بعد ترك الاعتراض أو بعد حسم مرحلة الاعتراض', () => {
        const appeal = appealStage();
        expect(
            canOfferArt172AppealStay({
                currentStage: appeal,
                stages: [
                    firstInstance({ judgmentForm: 'مختلط (تم ترك حق الاعتراض)' }),
                    appeal,
                ],
            }),
        ).toBe(false);
        expect(
            canOfferArt172AppealStay({
                currentStage: appeal,
                stages: [
                    firstInstance(),
                    {
                        id: 'obj',
                        name: 'الاعتراض على الحكم الغيابي',
                        stageName: 'الاعتراض على الحكم الغيابي',
                        status: 'locked',
                        finalDecision: 'تأييد الحكم الغيابي',
                    } as CaseStage,
                    appeal,
                ],
            }),
        ).toBe(false);
    });

    it('يحجب تنفيذ الحكم المختلط غير القابل للتجزئة ما دام الطعن قائماً', () => {
        expect(
            shouldStayIndivisibleExecution({
                stages: [firstInstance(), appealStage()],
            }),
        ).toBe(true);
        expect(
            shouldStayIndivisibleExecution({
                stages: [firstInstance({ disputeIntegrity: 'severable' }), appealStage()],
            }),
        ).toBe(false);
        expect(
            shouldStayIndivisibleExecution({
                stages: [
                    firstInstance(),
                    appealStage(),
                    {
                        id: 's2',
                        name: 'التمييز',
                        stageName: 'التمييز',
                        status: 'locked',
                        finalDecision: 'مكتسبة الدرجة القطعية',
                    } as CaseStage,
                ],
            }),
        ).toBe(false);
        expect(
            shouldStayIndivisibleExecution({
                stages: [
                    firstInstance(),
                    appealStage({
                        finalDecision: 'تأييد الحكم البدائي ورد الاستئناف',
                    }),
                ],
            }),
        ).toBe(false);
    });

    it('لا يتخذ مرحلة الاعتراض مصدراً للحكم البدائي', () => {
        const source = resolvePriorFirstInstanceJudgmentSource([
            firstInstance({
                judgmentForm: 'حضوري',
                disputeIntegrity: 'severable',
                partyJudgmentDispositions: [],
            }),
            {
                id: 'obj',
                name: 'الاعتراض على الحكم الغيابي',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
                judgmentForm: 'مختلط',
                disputeIntegrity: 'indivisible',
                partyJudgmentDispositions: MIXED_DISPOSITIONS,
            } as CaseStage,
            appealStage(),
        ]);
        expect(source?.judgmentForm).toBe('حضوري');
        expect(
            findPriorFirstInstanceJudgmentIndex([
                firstInstance({
                    judgmentForm: 'حضوري',
                    disputeIntegrity: 'severable',
                    partyJudgmentDispositions: [],
                }),
                {
                    id: 'obj',
                    name: 'الاعتراض على الحكم الغيابي',
                    stageName: 'الاعتراض على الحكم الغيابي',
                    status: 'active',
                    judgmentForm: 'مختلط',
                    disputeIntegrity: 'indivisible',
                    partyJudgmentDispositions: MIXED_DISPOSITIONS,
                } as CaseStage,
                appealStage(),
            ]),
        ).toBe(0);
    });

    it('لا تغطية ولا قطعية كاذبة بعد حسم الاستئناف — ويُحجب التنفيذ قبل الطعن', () => {
        expect(
            isAbsentClientCoveredByCoDefendantAppeal({
                stages: [
                    firstInstance(),
                    appealStage({
                        status: 'completed',
                        finalDecision: 'تأييد الحكم البدائي ورد الاستئناف',
                    }),
                ],
                parties: PARTIES,
            }),
        ).toBe(false);
        expect(
            blocksCivilDossierFinality({
                stages: [firstInstance()],
                parties: PARTIES,
            }),
        ).toBe(true);
        expect(
            blocksCivilDossierFinality({
                stages: [
                    firstInstance(),
                    appealStage({
                        status: 'completed',
                        finalDecision: 'تأييد الحكم البدائي ورد الاستئناف',
                    }),
                ],
                parties: PARTIES,
            }),
        ).toBe(false);
    });
});
