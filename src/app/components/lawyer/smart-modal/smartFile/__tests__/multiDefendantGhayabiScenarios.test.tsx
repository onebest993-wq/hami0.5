import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CaseStage } from '../../../LawyerShared';
import {
    blocksCivilDossierFinality,
    canOfferArt172AppealStay,
    isAbsentClientCoveredByCoDefendantAppeal,
    isGhayabiObjectionPending,
    shouldStayIndivisibleExecution,
} from '../art172AppealStay';
import {
    canOfferAbsentObjectionToDefendant,
    isAbsentJudgmentForm,
    shouldShowAbsentJudgmentFooter,
    shouldShowAbsentJudgmentNotificationAction,
} from '../absentJudgmentFlow';
import { computeLawsuitSmartStatus } from '../../../ArchivePortal/lawsuitArchiveSmartStatus';
import { SmartFileStatusBanners } from '../../layout/mainPanel/SmartFileStatusBanners';
import { CIVIL_LAWSUIT_TEST_IDS } from '../civilLawsuitTestIds';
import { resolveSmartFileMainPanelFooterFlags } from '../../layout/mainPanel/resolveSmartFileMainPanelFooterFlags';
import type { SmartFileParentData } from '../parentDataInit';
import { applyWaitAppealScenarios } from '../../hooks/judgment/judgmentConfirm/scenarioWaitAppeal';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from '../../hooks/judgment/judgmentConfirm/judgmentConfirmTypes';
import { computeFirstInstanceAppealDeadline } from '../appealDeadlineEngine';

type PartyRow = {
    id: number | string;
    name: string;
    role: string;
    isClient?: boolean;
};

const TWO_PLAINTIFFS_FOUR_DEFENDANTS: PartyRow[] = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
    { id: 10, name: 'باسم', role: 'مدعي', isClient: false },
    { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
    { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
    { id: 4, name: 'نادر', role: 'مدعى عليه', isClient: false },
    { id: 5, name: 'هيثم', role: 'مدعى عليه', isClient: false },
];

const MIXED_FOUR = [
    { partyId: '2', form: 'حضوري' as const },
    { partyId: '3', form: 'غيابي' as const },
    { partyId: '4', form: 'حضوري' as const },
    { partyId: '5', form: 'غيابي' as const },
];

const ALL_GHAYABI_FOUR = MIXED_FOUR.map((row) => ({ ...row, form: 'غيابي' as const }));
const ALL_HADARI_FOUR = MIXED_FOUR.map((row) => ({ ...row, form: 'حضوري' as const }));
const REGISTERED_OBJECTION_LANES_FOUR = MIXED_FOUR.map((row) => ({
    partyId: row.partyId,
    disposition: row.form,
    laneState: row.form === 'غيابي' ? ('objection' as const) : ('appeal' as const),
}));

function firstInstance(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'locked',
        isPleadingsClosed: true,
        judgmentForm: 'مختلط',
        disputeIntegrity: 'indivisible',
        partyJudgmentDispositions: MIXED_FOUR,
        parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
        finalDecision: 'إجابة الدعوى بالكامل',
        ...overrides,
    } as CaseStage;
}

function appealStage(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's1',
        name: 'الاستئناف',
        stageName: 'الاستئناف',
        status: 'active',
        parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
        appealMetadata: {
            appellantPartyIds: ['2'],
            appelleePartyIds: ['1', '10', '3', '4', '5'],
            priorStageOutcome: 'LOSS',
            priorJudgmentForm: 'MIXED',
        },
        ...overrides,
    } as CaseStage;
}

function waitAppeal(form: string, dispositions: typeof MIXED_FOUR, parties = TWO_PLAINTIFFS_FOUR_DEFENDANTS) {
    const stages = [
        {
            id: 's0',
            name: 'بداءة بدرجة أولى',
            stageName: 'بداءة بدرجة أولى',
            status: 'active',
            parties,
        } as CaseStage,
    ];
    const updatedStages = stages.map((s) => ({ ...s }));
    const scope: JudgmentConfirmScope = {
        stages,
        currentStage: stages[0],
        activeStageIndex: 0,
        parentData: {
            id: 1,
            originalParties: parties,
            parties,
            feesTotal: 0,
            feesPaid: 0,
            docType: 'إزالة شيوع',
            createdDate: '2026-08-04',
            representedParty: 'المدعي',
        },
        setStatus: vi.fn(),
        setActiveStageIndex: vi.fn(),
    };
    const rt: JudgmentConfirmRuntime = {
        judgmentData: { action: 'waiting_for_appeal', partyJudgmentDispositions: dispositions },
        action: 'waiting_for_appeal',
        judgmentType: 'إجابة الدعوى بالكامل',
        judgmentForm: form,
        judgmentDate: '2026-08-04',
        notes: '',
        nextStage: '',
        now: new Date('2026-08-04T00:00:00'),
        stageName: 'بداءة بدرجة أولى',
        addDays: (date, days) => {
            const d = new Date(date);
            d.setDate(d.getDate() + days);
            return d.toISOString().slice(0, 10);
        },
        updatedStages,
        handled: false,
        successToast: '',
        openAppealModalAfterSave: false,
        openObjectionModalAfterSave: false,
        remandNewActiveIndex: null,
    };
    applyWaitAppealScenarios(scope, rt);
    return rt.updatedStages[0];
}

describe('سيناريوهات مكثفة — تعدد المدعى عليهم والحكم الغيابي', () => {
    describe('الحكم المختلط لأربعة مدعى عليهم', () => {
        it('يفتح التبليغ ومهلة الاستئناف معاً ولا يُعامل كغيابي موحّد', () => {
            const saved = waitAppeal('مختلط', MIXED_FOUR);
            expect(saved.judgmentForm).toBe('مختلط');
            expect(saved.lastJudgmentType).toBeUndefined();
            expect(saved.awaitingAbsentJudgmentNotification).toBe(true);
            expect(saved.appealDeadline).toBe(computeFirstInstanceAppealDeadline('2026-08-04'));
            expect(saved.finalDecision).toBe('بانتظار التبليغ والطعن');
            expect(isAbsentJudgmentForm(saved.judgmentForm, saved.lastJudgmentType)).toBe(false);
        });

        it('الكل غيابي: تبليغ دون مهلة حضوري — الكل حضوري: مهلة دون تبليغ', () => {
            const ghayabi = waitAppeal('غيابي', ALL_GHAYABI_FOUR);
            expect(ghayabi.awaitingAbsentJudgmentNotification).toBe(true);
            expect(ghayabi.appealDeadline).toBeUndefined();
            expect(ghayabi.finalDecision).toContain('حكم غيابي');

            const hadari = waitAppeal('حضوري', ALL_HADARI_FOUR);
            expect(hadari.awaitingAbsentJudgmentNotification).toBeFalsy();
            expect(hadari.appealDeadline).toBe(computeFirstInstanceAppealDeadline('2026-08-04'));
        });
    });

    describe('اعتراض الغيابي والتبليغ حسب الموكل', () => {
        const mixedStage = {
            stageName: 'بداءة بدرجة أولى',
            judgmentForm: 'مختلط',
            isPleadingsClosed: true,
            finalDecision: 'إجابة الدعوى بالكامل',
            partyJudgmentDispositions: MIXED_FOUR,
            parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
        };

        it('التبليغ يظهر لأي جانب ما دام في الحكم غائب', () => {
            expect(shouldShowAbsentJudgmentNotificationAction(mixedStage)).toBe(true);
            expect(
                shouldShowAbsentJudgmentNotificationAction({
                    ...mixedStage,
                    partyJudgmentDispositions: ALL_HADARI_FOUR,
                    judgmentForm: 'حضوري',
                }),
            ).toBe(false);
        });

        it('زر الاعتراض للموكل الغائب فقط — لا للحاضر ولا لوكيل المدعي', () => {
            expect(
                shouldShowAbsentJudgmentFooter(mixedStage, [{ stageName: 'بداءة بدرجة أولى' }], 'المدعى عليه'),
            ).toBe(true);
            expect(
                canOfferAbsentObjectionToDefendant({
                    currentStage: 'بداءة بدرجة أولى',
                    stages: [{ stageName: 'بداءة بدرجة أولى' }],
                    judgmentForm: 'مختلط',
                    finalDecision: 'إجابة الدعوى بالكامل',
                    representedParty: 'المدعى عليه',
                    partyJudgmentDispositions: MIXED_FOUR,
                    parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                }),
            ).toBe(true);

            const clientPresent = TWO_PLAINTIFFS_FOUR_DEFENDANTS.map((p) =>
                p.id === 3 ? { ...p, isClient: false } : p.id === 2 ? { ...p, isClient: true } : p,
            );
            expect(
                shouldShowAbsentJudgmentFooter(
                    { ...mixedStage, parties: clientPresent },
                    [{ stageName: 'بداءة بدرجة أولى' }],
                    'المدعى عليه',
                ),
            ).toBe(false);
            expect(
                shouldShowAbsentJudgmentFooter(mixedStage, [{ stageName: 'بداءة بدرجة أولى' }], 'المدعي'),
            ).toBe(false);
        });

        it('تسجيل طعن الخصم يفتح الاعتراض المختلط ولو كان الموكل حاضراً', () => {
            expect(
                canOfferAbsentObjectionToDefendant({
                    currentStage: 'بداءة بدرجة أولى',
                    stages: [{ stageName: 'بداءة بدرجة أولى' }],
                    judgmentForm: 'مختلط',
                    finalDecision: 'إجابة الدعوى بالكامل',
                    representedParty: 'المدعي',
                    opponentRegistration: true,
                    partyJudgmentDispositions: MIXED_FOUR,
                    parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                }),
            ).toBe(true);
        });
    });

    describe('المادتان 172 و191 مع أربعة مدعى عليهم ومدعيين', () => {
        it('تغطية الغائب بطعن الشريك الحاضر — معرف رقمي أو نصي', () => {
            const stages = [firstInstance(), appealStage({ appealMetadata: {
                appellantPartyIds: [2 as unknown as string],
                appelleePartyIds: ['1', '3'],
                priorStageOutcome: 'LOSS',
                priorJudgmentForm: 'HADORI',
            } })];
            expect(
                isAbsentClientCoveredByCoDefendantAppeal({
                    stages,
                    parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                }),
            ).toBe(true);
        });

        it('طعن مدعى عليه غائب آخر يغطي الموكل الغائب غير الطاعن', () => {
            expect(
                isAbsentClientCoveredByCoDefendantAppeal({
                    stages: [
                        firstInstance(),
                        appealStage({
                            appealMetadata: {
                                appellantPartyIds: ['5'],
                                appelleePartyIds: ['1', '2', '3', '4'],
                                priorStageOutcome: 'LOSS',
                                priorJudgmentForm: 'GHAYABI',
                            },
                        }),
                    ],
                    parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                }),
            ).toBe(true);
        });

        it('طعن المدعيين معاً لا يغطي الغائب', () => {
            expect(
                isAbsentClientCoveredByCoDefendantAppeal({
                    stages: [
                        firstInstance(),
                        appealStage({
                            appealMetadata: {
                                appellantPartyIds: ['1', '10'],
                                appelleePartyIds: ['2', '3', '4', '5'],
                                priorStageOutcome: 'LOSS',
                                priorJudgmentForm: 'HADORI',
                            },
                        }),
                    ],
                    parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                }),
            ).toBe(false);
        });

        it('استئناف بلا metadata يُقرأ من صفة المستأنف', () => {
            const appealParties = [
                { id: 2, name: 'سامي', role: 'المستأنف (المدعى عليه)', isClient: false },
                { id: 3, name: 'كريم', role: 'المستأنف عليه (المدعى عليه)', isClient: true },
                { id: 1, name: 'أحمد', role: 'المستأنف عليه (المدعي)', isClient: false },
            ];
            expect(
                isAbsentClientCoveredByCoDefendantAppeal({
                    stages: [
                        firstInstance(),
                        appealStage({
                            appealMetadata: undefined,
                            parties: appealParties,
                        }),
                    ],
                    parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                }),
            ).toBe(true);
        });

        it('وحدة النزاع من الملف لا من المرحلة تكفي للاستئخار والتنفيذ', () => {
            const first = firstInstance({
                disputeIntegrity: undefined,
                partyChallengeLanes: REGISTERED_OBJECTION_LANES_FOUR,
            });
            const appeal = appealStage();
            expect(
                canOfferArt172AppealStay({
                    currentStage: appeal,
                    stages: [first, appeal],
                    parentIntegrity: 'indivisible',
                }),
            ).toBe(true);
            expect(
                shouldStayIndivisibleExecution({
                    stages: [first, appeal],
                    parentIntegrity: 'غير قابل للتجزئة',
                }),
            ).toBe(true);
        });

        it('الكل غيابي غير مختلط: لا استئخار 172 ولو كان غير قابل للتجزئة', () => {
            const first = firstInstance({
                judgmentForm: 'غيابي',
                partyJudgmentDispositions: ALL_GHAYABI_FOUR,
            });
            const appeal = appealStage();
            expect(canOfferArt172AppealStay({ currentStage: appeal, stages: [first, appeal] })).toBe(false);
            expect(shouldStayIndivisibleExecution({ stages: [first, appeal] })).toBe(false);
            expect(isGhayabiObjectionPending({ stages: [first, appeal], source: first })).toBe(true);
        });

        it('الكل حضوري: لا تغطية ولا 191', () => {
            const first = firstInstance({
                judgmentForm: 'حضوري',
                partyJudgmentDispositions: ALL_HADARI_FOUR,
            });
            const appeal = appealStage();
            expect(
                isAbsentClientCoveredByCoDefendantAppeal({
                    stages: [first, appeal],
                    parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                }),
            ).toBe(false);
            expect(shouldStayIndivisibleExecution({ stages: [first, appeal] })).toBe(false);
            expect(blocksCivilDossierFinality({ stages: [first, appeal], parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS })).toBe(
                false,
            );
        });

        it('وكيل المدعي: لا تغطية 172 ومع ذلك 191 يحجب القطعية أثناء الطعن المختلط', () => {
            const plaintiffClient = TWO_PLAINTIFFS_FOUR_DEFENDANTS.map((p) => ({
                ...p,
                isClient: p.id === 1,
            }));
            const stages = [firstInstance({ parties: plaintiffClient }), appealStage({ parties: plaintiffClient })];
            expect(
                isAbsentClientCoveredByCoDefendantAppeal({
                    stages,
                    parties: plaintiffClient,
                }),
            ).toBe(false);
            expect(shouldStayIndivisibleExecution({ stages })).toBe(true);
            expect(blocksCivilDossierFinality({ stages, parties: plaintiffClient })).toBe(true);
        });

        it('الموكل الحاضر المستأنف لا يُغطى — ويُحجب التنفيذ ما دام الاستئناف قائماً', () => {
            const presentClient = TWO_PLAINTIFFS_FOUR_DEFENDANTS.map((p) => ({
                ...p,
                isClient: p.id === 2,
            }));
            const stages = [
                firstInstance({ parties: presentClient }),
                appealStage({
                    parties: presentClient,
                    appealMetadata: {
                        appellantPartyIds: ['2'],
                        appelleePartyIds: ['1', '3', '4', '5'],
                        priorStageOutcome: 'LOSS',
                        priorJudgmentForm: 'HADORI',
                    },
                }),
            ];
            expect(
                isAbsentClientCoveredByCoDefendantAppeal({
                    stages,
                    parties: presentClient,
                }),
            ).toBe(false);
            expect(shouldStayIndivisibleExecution({ stages })).toBe(true);
        });
    });

    describe('الأرشيف والبانرات والتذييل', () => {
        it('الأرشيف لا يختم قطعي لأربعة مدعى عليهم مختلط غير قابل للتجزئة', () => {
            const status = computeLawsuitSmartStatus({
                status: 'مكتسبة الدرجة القطعية',
                disputeIntegrity: 'indivisible',
                parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                stages: [firstInstance(), appealStage()],
                activeStageIndex: 1,
            } as never);
            expect(status.type).not.toBe('final');
        });

        it('لا يعرض بانر تغطية 172 التعليمي ولا وقف تنفيذ 191', () => {
            render(
                <SmartFileStatusBanners
                    displayStage={appealStage()}
                    status="نشطة"
                    stages={[firstInstance(), appealStage()]}
                    parentIntegrity="indivisible"
                />,
            );
            expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.art172Coverage)).toBeNull();
            expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.art191ExecutionStay)).toBeNull();
        });

        it('يقدّم استئخار 172 في التذييل لأربعة مدعى عليهم', () => {
            const appeal = appealStage();
            const first = firstInstance({ partyChallengeLanes: REGISTERED_OBJECTION_LANES_FOUR });
            const flags = resolveSmartFileMainPanelFooterFlags({
                status: 'نشطة',
                isViewingArchived: false,
                parentData: {
                    disputeIntegrity: 'indivisible',
                    representedParty: 'المدعى عليه',
                    parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                } as SmartFileParentData,
                displayStage: appeal,
                currentStage: appeal,
                stages: [first, appeal],
                activeStageIndex: 1,
                viewingStageIndex: 1,
                isPaused: false,
                isInterrupted: false,
                displayStageLabel: 'الاستئناف',
                currentStageLabel: 'الاستئناف',
            });
            expect(flags.showArt172StayFooter).toBe(true);
            expect(flags.showAbsentJudgmentFooter).toBe(false);
            expect(flags.showAbsentJudgmentNotificationAction).toBe(false);
        });

        it('في البداءة المختلطة: تبليغ ظاهر واعتراض للموكل الغائب فقط', () => {
            const first = firstInstance({ status: 'active' });
            const parent = {
                disputeIntegrity: 'indivisible',
                representedParty: 'المدعى عليه',
                parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
            } as SmartFileParentData;
            const defendantFlags = resolveSmartFileMainPanelFooterFlags({
                status: 'نشطة',
                isViewingArchived: false,
                parentData: parent,
                displayStage: first,
                currentStage: first,
                stages: [first],
                activeStageIndex: 0,
                viewingStageIndex: 0,
                isPaused: false,
                isInterrupted: false,
                displayStageLabel: 'بداءة بدرجة أولى',
                currentStageLabel: 'بداءة بدرجة أولى',
            });
            expect(defendantFlags.showAbsentJudgmentNotificationAction).toBe(true);
            expect(defendantFlags.showAbsentJudgmentFooter).toBe(true);

            const plaintiffFlags = resolveSmartFileMainPanelFooterFlags({
                status: 'نشطة',
                isViewingArchived: false,
                parentData: { ...parent, representedParty: 'المدعي' },
                displayStage: first,
                currentStage: first,
                stages: [first],
                activeStageIndex: 0,
                viewingStageIndex: 0,
                isPaused: false,
                isInterrupted: false,
                displayStageLabel: 'بداءة بدرجة أولى',
                currentStageLabel: 'بداءة بدرجة أولى',
            });
            expect(plaintiffFlags.showAbsentJudgmentNotificationAction).toBe(true);
            expect(plaintiffFlags.showAbsentJudgmentFooter).toBe(false);
        });

        it('يبقي زر التبليغ على البداءة المقفولة إذا بقي غائب غير مبلَّغ ولو كان الاستئناف نشطاً', () => {
            const first = firstInstance({ status: 'locked' });
            const appeal = appealStage();
            const flags = resolveSmartFileMainPanelFooterFlags({
                status: 'نشطة',
                isViewingArchived: true,
                parentData: {
                    disputeIntegrity: 'indivisible',
                    representedParty: 'المدعي',
                    parties: TWO_PLAINTIFFS_FOUR_DEFENDANTS,
                } as SmartFileParentData,
                displayStage: first,
                currentStage: appeal,
                stages: [first, appeal],
                activeStageIndex: 1,
                viewingStageIndex: 0,
                isPaused: false,
                isInterrupted: false,
                displayStageLabel: 'بداءة بدرجة أولى',
                currentStageLabel: 'الاستئناف',
            });
            expect(flags.showAbsentJudgmentNotificationAction).toBe(true);
        });
    });
});
