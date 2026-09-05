import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../../LawyerShared';
import type { SmartFileParentData } from '../../../smartFile/parentDataInit';
import { ART172_SUSPENSION_REASON } from '../../../smartFile/art172AppealStay';
import { resolveSmartFileMainPanelFooterFlags } from '../resolveSmartFileMainPanelFooterFlags';

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
    { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
    { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
];

const MIXED = [
    { partyId: '2', form: 'حضوري' as const },
    { partyId: '3', form: 'غيابي' as const },
];

const REGISTERED_OBJECTION_LANES = [
    { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
    { partyId: '3', disposition: 'غيابي' as const, laneState: 'objection' as const },
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
        partyJudgmentDispositions: MIXED,
        partyChallengeLanes: REGISTERED_OBJECTION_LANES,
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

const parentData = {
    disputeIntegrity: 'indivisible',
    representedParty: 'المدعى عليه',
    parties: PARTIES,
} as SmartFileParentData;

function flagsFor(appeal: CaseStage, first = firstInstance()) {
    return resolveSmartFileMainPanelFooterFlags({
        status: 'نشطة',
        isViewingArchived: false,
        parentData,
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
}

describe('resolveSmartFileMainPanelFooterFlags — م/172', () => {
    it('في بداية الاستئناف يظهر الاستئخار وحده بلا ختام مرافعة', () => {
        const flags = flagsFor(appealStage());
        expect(flags.showArt172StayFooter).toBe(true);
        expect(flags.showArt172ResumeFooter).toBe(false);
        expect(flags.showPleadingCloseFooter).toBe(false);
        expect(flags.showRemainingOpponentChallenge).toBe(false);
        expect(flags.showFlowPauseFooter).toBe(false);
        expect(flags.isCaseFlowSuspended).toBe(false);
    });

    it('يظهر الاستئخار للنزاع غير القابل للتجزئة فقط — القابل للتجزئة بلا استئخار', () => {
        const first = firstInstance({ disputeIntegrity: 'severable' });
        const appeal = appealStage();
        const flags = resolveSmartFileMainPanelFooterFlags({
            status: 'نشطة',
            isViewingArchived: false,
            parentData: { ...parentData, disputeIntegrity: 'severable' },
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
        expect(flags.showArt172StayFooter).toBe(false);
    });

    it('يخفي ختام المرافعة ويعرض استئناف السير عند الاستئخار', () => {
        const flags = flagsFor(
            appealStage({
                isSuspended: true,
                suspensionReason: ART172_SUSPENSION_REASON,
            }),
        );
        expect(flags.showArt172StayFooter).toBe(false);
        expect(flags.showArt172ResumeFooter).toBe(true);
        expect(flags.showPleadingCloseFooter).toBe(false);
        expect(flags.quickActionsVariant).toBe('notes-only');
        expect(flags.showFlowPauseFooter).toBe(false);
        expect(flags.isCaseFlowSuspended).toBe(false);
    });

    it('لا يظهر الاستئخار بعد ترك الاعتراض الغيابي', () => {
        const first = firstInstance({
            judgmentForm: 'مختلط (تم ترك حق الاعتراض)',
            partyChallengeLanes: [
                { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
                { partyId: '3', disposition: 'غيابي' as const, laneState: 'waived' as const },
            ],
        });
        const flags = flagsFor(appealStage(), first);
        expect(flags.showArt172StayFooter).toBe(false);
    });

    it('يظهر مسار اعتراض الغائب المتبقي بعد hop (علم شريط المراحل)', () => {
        const first = firstInstance({
            partyChallengeLanes: [
                { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
                { partyId: '3', disposition: 'غيابي' as const, laneState: 'pending' as const },
            ],
        });
        const flags = resolveSmartFileMainPanelFooterFlags({
            status: 'نشطة',
            isViewingArchived: false,
            parentData: { ...parentData, representedParty: 'المدعي' },
            displayStage: appealStage(),
            currentStage: appealStage(),
            stages: [first, appealStage()],
            activeStageIndex: 1,
            viewingStageIndex: 1,
            isPaused: false,
            isInterrupted: false,
            displayStageLabel: 'الاستئناف',
            currentStageLabel: 'الاستئناف',
        });
        expect(flags.showRemainingOpponentChallenge).toBe(true);
        expect(flags.remainingOpponentChallengeLabel).toBe('قام الخصم بالطعن');
    });

    it('يبقي مسار اعتراض الغائب للمتبقي مع علامة الاستئخار بعد قيد اعتراض آخر', () => {
        const first = firstInstance({
            partyChallengeLanes: [
                { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
                { partyId: '3', disposition: 'غيابي' as const, laneState: 'objection' as const },
                { partyId: '4', disposition: 'غيابي' as const, laneState: 'pending' as const },
            ],
            partyJudgmentDispositions: [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
                { partyId: '4', form: 'غيابي' },
            ],
            parties: [
                ...PARTIES,
                { id: 4, name: 'نادر', role: 'مدعى عليه', isClient: false },
            ],
        });
        const flags = resolveSmartFileMainPanelFooterFlags({
            status: 'نشطة',
            isViewingArchived: false,
            parentData: { ...parentData, representedParty: 'المدعي' },
            displayStage: appealStage(),
            currentStage: appealStage(),
            stages: [first, appealStage()],
            activeStageIndex: 1,
            viewingStageIndex: 1,
            isPaused: false,
            isInterrupted: false,
            displayStageLabel: 'الاستئناف',
            currentStageLabel: 'الاستئناف',
        });
        expect(flags.showArt172StayFooter).toBe(true);
        expect(flags.showRemainingOpponentChallenge).toBe(true);
        expect(flags.showPleadingCloseFooter).toBe(false);
    });

    it('جزئي + الخصم سبق بالطعن: يظهر إنشاء طعن مستقل للموكل المستأنف عليه', () => {
        const first = firstInstance({
            clientStageOutcome: 'PARTIAL',
            finalDecision: 'محسومة جزئياً - يحق للطرفين الطعن فيما حُسم عليه',
            partyChallengeLanes: [
                { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
                { partyId: '3', disposition: 'غيابي' as const, laneState: 'pending' as const },
            ],
        });
        const flags = flagsFor(
            appealStage({
                appealMetadata: {
                    appellantPartyIds: ['2'],
                    appelleePartyIds: ['1', '3'],
                    priorStageOutcome: 'PARTIAL',
                    priorJudgmentForm: 'MIXED',
                },
            }),
            first,
        );
        expect(flags.showIndependentClientChallenge).toBe(true);
    });

    it('رد بحق مدعى عليه + إلزام آخر: تذييل جزئي لا زر خصم وحدها', () => {
        const stage = {
            id: 's0',
            name: 'بداءة بدرجة أولى',
            stageName: 'بداءة بدرجة أولى',
            status: 'active',
            isPleadingsClosed: true,
            awaitingOpponentAppeal: true,
            finalDecision: 'محسومة لصالح الموكل - بانتظار الطعن',
            clientStageOutcome: 'WIN' as const,
            partyJudgmentDispositions: [
                { partyId: '2', form: 'حضوري' as const, operative: 'bound' as const },
                { partyId: '3', form: 'حضوري' as const, operative: 'released' as const },
            ],
            parties: [
                { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
                { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
                { id: 3, name: 'نورا', role: 'مدعى عليه', isClient: false },
            ],
        } as CaseStage;
        const flags = resolveSmartFileMainPanelFooterFlags({
            status: 'بانتظار الطعن',
            isViewingArchived: false,
            parentData: {
                ...parentData,
                representedParty: 'المدعي',
                parties: stage.parties,
            },
            displayStage: stage,
            currentStage: stage,
            stages: [stage],
            activeStageIndex: 0,
            viewingStageIndex: 0,
            isPaused: false,
            isInterrupted: false,
            displayStageLabel: 'بداءة بدرجة أولى',
            currentStageLabel: 'بداءة بدرجة أولى',
        });
        expect(flags.showOpponentAppealBtnEffective).toBe(false);
        expect(flags.showPostJudgmentAppealFooter).toBe(true);
    });

    it('يظهر علامة الاستئخار بعد ربح البداءة إذا بقي اعتراض غيابي', () => {
        const flags = flagsFor(
            appealStage({
                awaitingOpponentAppeal: true,
                lastJudgmentType: 'إجابة الدعوى بالكامل',
                appealMetadata: {
                    appellantPartyIds: ['2'],
                    appelleePartyIds: ['1', '3'],
                    priorStageOutcome: 'WIN',
                    priorJudgmentForm: 'MIXED',
                },
            }),
        );
        expect(flags.showArt172StayFooter).toBe(true);
        expect(flags.showPleadingCloseFooter).toBe(false);
    });
});
