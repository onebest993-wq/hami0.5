import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { CaseStage, Party } from '../../../../LawyerShared';
import type { SmartFileParentData } from '../../../smartFile/parentDataInit';
import { applyWaitAppealScenarios } from '../judgmentConfirm/scenarioWaitAppeal';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from '../judgmentConfirm/judgmentConfirmTypes';
import { applyJudgmentConfirm } from '../judgmentConfirm/applyJudgmentConfirm';
import type { UseSmartFileJudgmentActionsOptions } from '../judgmentHookTypes';
import {
    applyArt172AppealResume,
    applyArt172AppealStay,
    ART172_SUSPENSION_REASON,
    canOfferArt172AppealResume,
    canOfferArt172AppealStay,
} from '../../../smartFile/art172AppealStay';
import { applyAppealStageTransition } from '../../../smartFile/appealStageTransitionApply';
import { applyUnifyObjectionAppealIntoExisting } from '../../../smartFile/unifyObjectionAppealIntoExisting';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';
import { getDisplayTimelineFromStage } from '../../../smartFile/stageInit';
import {
    resolveArt172ResumeWarning,
    resolveObjectionAppealGuidanceNotices,
} from '../../../smartFile/objectionAppealGuidance';
import { resolveSmartFileMainPanelFooterFlags } from '../../../layout/mainPanel/resolveSmartFileMainPanelFooterFlags';
import { resolveCrossAppealEligibility } from '../../../smartFile/crossAppealEngine';
import { SmartFileStatusBanners } from '../../../layout/mainPanel/SmartFileStatusBanners';
import { SmartJudgmentModal } from '../../../SmartJudgmentModal';
import { SmartFileModalThemeProvider } from '../../../smartFile/smartFileModalTheme';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../../smartFile/civilLawsuitTestIds';
import {
    ART172_STAY_CAUSE_LIFTED,
    ART172_VOID_EXTENDS_TO_PRESENT_NOTICE,
    OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE,
    OBJECTOR_UPHOLD_ORIGINAL_APPEAL_NOTICE,
    UNIFIED_APPEALS_TIMELINE_TITLE,
} from '@/app/domain/lawsuit/objectionAppealConsequence';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

afterEach(() => {
    cleanup();
});

const FI_PARTIES: Party[] = [
    { id: 1, name: 'أحمد علي', role: 'مدعي', isClient: true, side: 'right' },
    { id: 2, name: 'سامي كاظم', role: 'مدعى عليه', isClient: false, side: 'left' },
    { id: 3, name: 'كريم حسن', role: 'مدعى عليه', isClient: false, side: 'left' },
];

const OBJ_PARTIES_PLAINTIFF: Party[] = [
    {
        id: 1,
        name: 'أحمد علي',
        role: 'المعترض عليه بالحكم الغيابي (المدعي)',
        isClient: true,
        side: 'left',
    },
    {
        id: 2,
        name: 'سامي كاظم',
        role: 'مدعى عليه',
        isClient: false,
        side: 'right',
    },
    {
        id: 3,
        name: 'كريم حسن',
        role: 'المعترض على الحكم الغيابي (المدعى عليه)',
        isClient: false,
        side: 'right',
    },
];

function parent(overrides: Partial<SmartFileParentData> = {}): SmartFileParentData {
    return {
        id: 1,
        originalParties: FI_PARTIES,
        parties: FI_PARTIES,
        feesTotal: 0,
        feesPaid: 0,
        docType: 'مطالبة بدين',
        createdDate: '2026-08-04',
        representedParty: 'المدعي',
        disputeIntegrity: 'indivisible',
        ...overrides,
    };
}

function runWait(params: {
    stages: CaseStage[];
    activeIndex: number;
    judgmentType: string;
    judgmentForm: string;
    dispositions?: Array<{ partyId: string; form: 'حضوري' | 'غيابي' }>;
    parties?: Party[];
}): CaseStage[] {
    const currentStage = params.stages[params.activeIndex]!;
    const updatedStages = params.stages.map((stage) => ({ ...stage }));
    const scope: JudgmentConfirmScope = {
        stages: params.stages,
        currentStage,
        activeStageIndex: params.activeIndex,
        parentData: parent({ parties: params.parties ?? currentStage.parties }),
        setStatus: vi.fn(),
        setActiveStageIndex: vi.fn(),
    };
    const rt: JudgmentConfirmRuntime = {
        judgmentData: {
            action: 'waiting_for_appeal',
            partyJudgmentDispositions: params.dispositions,
        },
        action: 'waiting_for_appeal',
        judgmentType: params.judgmentType,
        judgmentForm: params.judgmentForm,
        judgmentDate: '2026-08-04',
        notes: '',
        nextStage: '',
        now: new Date('2026-08-04T00:00:00'),
        stageName: String(currentStage.stageName ?? currentStage.name ?? ''),
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
    return rt.updatedStages;
}

function footerFlags(stages: CaseStage[], index: number, representedParty = 'المدعي') {
    const display = stages[index]!;
    return resolveSmartFileMainPanelFooterFlags({
        status: 'نشطة',
        isViewingArchived: false,
        parentData: parent({ representedParty }),
        displayStage: display,
        currentStage: display,
        stages,
        activeStageIndex: index,
        viewingStageIndex: index,
        isPaused: false,
        isInterrupted: false,
        displayStageLabel: String(display.stageName ?? ''),
        currentStageLabel: String(display.stageName ?? ''),
    });
}

describe('محاكاة مسار الاعتراض → الاستئناف', () => {
    it('حكم مختلط: الحفظ والعرض يذكران الأسماء ولا يكتبان مختلط', () => {
        const stages = runWait({
            stages: [
                {
                    id: 's0',
                    name: 'بداءة بدرجة أولى',
                    stageName: 'بداءة بدرجة أولى',
                    status: 'active',
                    parties: FI_PARTIES,
                    timeline: [
                        {
                            id: 'old',
                            type: 'decision',
                            date: '2026-08-01',
                            title: 'حكم بـ إجابة الدعوى بالكامل',
                            details: 'المنطوق: إجابة الدعوى بالكامل الشكل: مختلط النتيجة للموكل: كسبتم الدعوى',
                        },
                    ],
                } as CaseStage,
            ],
            activeIndex: 0,
            judgmentType: 'إجابة الدعوى بالكامل',
            judgmentForm: 'مختلط',
            dispositions: [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
            ],
        });
        const saved = stages[0]!;
        expect(saved.judgmentForm).toBe('مختلط');
        expect(String(saved.timeline?.[0]?.details ?? '')).toContain('سامي كاظم — حضوري — إلزام');
        expect(String(saved.timeline?.[0]?.details ?? '')).toContain('كريم حسن — غيابي — إلزام');
        expect(String(saved.timeline?.[0]?.details ?? '')).not.toContain('مختلط');
        expect(String(saved.timeline?.[0]?.details ?? '')).not.toContain('النتيجة للموكل');

        const { displayTimeline } = getDisplayTimelineFromStage(saved);
        const judgmentEvent = displayTimeline.find((event) =>
            String(event.details ?? '').includes('المنطوق: إجابة الدعوى بالكامل'),
        );
        expect(String(judgmentEvent?.details ?? '')).not.toContain('مختلط');
        expect(String(judgmentEvent?.details ?? '')).not.toContain('النتيجة للموكل');
        expect(String(judgmentEvent?.details ?? '')).toContain('سامي كاظم — حضوري — إلزام');
    });

    it('استئخار → تأييد الاعتراض → زوال السبب → توحيد طعن المعترض مع الاستئناف القائم', () => {
        const firstInstance = runWait({
            stages: [
                {
                    id: 's0',
                    name: 'بداءة بدرجة أولى',
                    stageName: 'بداءة بدرجة أولى',
                    status: 'active',
                    parties: FI_PARTIES,
                } as CaseStage,
            ],
            activeIndex: 0,
            judgmentType: 'إجابة الدعوى بالكامل',
            judgmentForm: 'مختلط',
            dispositions: [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
            ],
        })[0]!;

        const appealOpened: CaseStage = {
            id: 's1',
            name: 'الاستئناف',
            stageName: 'الاستئناف',
            status: 'active',
            caseNo: 'است/10',
            parties: [
                { ...FI_PARTIES[1], role: 'المستأنف (المدعى عليه)', side: 'right', isClient: false },
                { ...FI_PARTIES[0], role: 'المستأنف عليه (المدعي)', side: 'left', isClient: true },
                { ...FI_PARTIES[2], role: 'مدعى عليه', side: 'right', isClient: false },
            ],
            appealMetadata: {
                appealType: 'استئناف',
                appellant: 'المدعى عليه',
                appellantPartyIds: ['2'],
                appelleePartyIds: ['1', '3'],
                priorStageOutcome: 'LOSS',
            },
            timeline: [],
            clientStageOutcome: 'LOSS',
        } as CaseStage;

        const objectionOpen: CaseStage = {
            id: 's2',
            name: 'الاعتراض على الحكم الغيابي',
            stageName: 'الاعتراض على الحكم الغيابي',
            status: 'active',
            parties: OBJ_PARTIES_PLAINTIFF,
            timeline: [],
        } as CaseStage;

        let stages: CaseStage[] = [
            { ...firstInstance, status: 'locked' },
            appealOpened,
            objectionOpen,
        ];

        expect(canOfferArt172AppealStay({ currentStage: stages[1], stages })).toBe(true);
        expect(footerFlags(stages, 1).showPleadingCloseFooter).toBe(false);

        stages = [
            stages[0]!,
            { ...stages[1]!, ...applyArt172AppealStay(stages[1]!, '2026-08-20') },
            stages[2]!,
        ];
        expect(stages[1]?.suspensionReason).toBe(ART172_SUSPENSION_REASON);
        expect(canOfferArt172AppealResume(stages[1])).toBe(true);
        expect(footerFlags(stages, 1).showArt172ResumeFooter).toBe(true);
        expect(footerFlags(stages, 1).showPleadingCloseFooter).toBe(false);

        stages = runWait({
            stages,
            activeIndex: 2,
            judgmentType: 'إجابة الدعوى بالكامل',
            judgmentForm: 'حضوري',
            parties: OBJ_PARTIES_PLAINTIFF,
        });
        expect(stages[2]?.finalDecision).toBe('تأييد الحكم الغيابي — بانتظار طعن المعترض');

        const notices = resolveObjectionAppealGuidanceNotices({
            displayStage: stages[1],
            stages,
            parentIntegrity: 'indivisible',
        });
        expect(notices).toContain(ART172_STAY_CAUSE_LIFTED);
        expect(notices).not.toContain(OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE);

        render(
            <SmartFileStatusBanners
                displayStage={stages[1]!}
                status="نشطة"
                stages={stages}
                parentIntegrity="indivisible"
            />,
        );
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.art172StayBadge)).toBeNull();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.objectionAppealGuidance)).toBeNull();
        expect(screen.queryByText(ART172_STAY_CAUSE_LIFTED)).toBeNull();
        expect(screen.queryByText(/لا تكتفِ بفك الاستئخار/)).toBeNull();
        expect(screen.queryByText(/امتد أثر إبطال الحكم الغيابي/)).toBeNull();

        const hop = applyAppealStageTransition(stages, 2, stages[2]!, {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-09-02',
            newCaseNumber: 'است/88',
            includedAppellantPartyIds: [3],
            includedOpponentPartyIds: [1],
            priorStageOutcome: 'LOSS',
        });
        expect(hop.independentRequired).toBe(true);
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages,
                sourceStage: stages[2],
                appealType: 'استئناف',
            }),
        ).toBe(true);

        const unified = applyUnifyObjectionAppealIntoExisting({
            stages,
            sourceIndex: 2,
            sourceStage: stages[2]!,
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-09-02',
            newCaseNumber: 'است/88',
            includedAppellantPartyIds: [3],
            includedOpponentPartyIds: [1],
        });
        expect(unified).not.toBeNull();
        expect(unified!.updatedStages).toHaveLength(3);
        expect(unified!.newActiveIndex).toBe(1);
        expect(unified!.updatedStages[1]?.timeline?.[0]?.title).toBe(UNIFIED_APPEALS_TIMELINE_TITLE);
        expect(unified!.updatedStages[1]?.appealMetadata?.appellantPartyIds).toEqual(
            expect.arrayContaining(['2', '3']),
        );
        expect(unified!.updatedStages[2]?.status).toBe('locked');
        expect(unified!.updatedStages[1]?.isSuspended).toBe(true);

        const resumed = {
            ...unified!.updatedStages[1]!,
            ...applyArt172AppealResume(unified!.updatedStages[1]!, '2026-09-03'),
        };
        expect(resumed.isSuspended).toBe(false);
        expect(resolveArt172ResumeWarning({ stages: unified!.updatedStages })).toBeNull();
    });

    it('إبطال كلي لوكيل المدعي: شارة العريضة الجديدة وتحذير فك الاستئخار', () => {
        const stages: CaseStage[] = [
            {
                id: 's0',
                name: 'بداءة بدرجة أولى',
                stageName: 'بداءة بدرجة أولى',
                status: 'locked',
                judgmentForm: 'مختلط',
                disputeIntegrity: 'indivisible',
                partyJudgmentDispositions: [
                    { partyId: '2', form: 'حضوري' },
                    { partyId: '3', form: 'غيابي' },
                ],
                parties: FI_PARTIES,
            } as CaseStage,
            {
                id: 's1',
                name: 'الاستئناف',
                stageName: 'الاستئناف',
                status: 'active',
                isSuspended: true,
                suspensionReason: ART172_SUSPENSION_REASON,
                parties: [
                    { ...FI_PARTIES[1], role: 'المستأنف (المدعى عليه)', isClient: false },
                    { ...FI_PARTIES[0], role: 'المستأنف عليه (المدعي)', isClient: true },
                ],
                appealMetadata: { appellantPartyIds: ['2'], priorStageOutcome: 'LOSS' },
            } as CaseStage,
            {
                id: 's2',
                name: 'الاعتراض على الحكم الغيابي',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
                parties: OBJ_PARTIES_PLAINTIFF,
                finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن',
            } as CaseStage,
        ];

        const notices = resolveObjectionAppealGuidanceNotices({
            displayStage: stages[1],
            stages,
            parentIntegrity: 'indivisible',
        });
        expect(notices).toEqual([
            ART172_STAY_CAUSE_LIFTED,
            OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE,
        ]);
        expect(resolveArt172ResumeWarning({ stages })).toBe(OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE);
    });

    it('إبطال كلي للحاضر المستأنف: امتداد م/172 دون عريضة المدعي', () => {
        const presentParties: Party[] = OBJ_PARTIES_PLAINTIFF.map((party) => ({
            ...party,
            isClient: party.id === 2,
        }));
        const stages: CaseStage[] = [
            {
                id: 's0',
                name: 'بداءة بدرجة أولى',
                stageName: 'بداءة بدرجة أولى',
                status: 'locked',
                judgmentForm: 'مختلط',
                disputeIntegrity: 'indivisible',
                partyJudgmentDispositions: [
                    { partyId: '2', form: 'حضوري' },
                    { partyId: '3', form: 'غيابي' },
                ],
                parties: FI_PARTIES.map((party) => ({ ...party, isClient: party.id === 2 })),
            } as CaseStage,
            {
                id: 's1',
                name: 'الاستئناف',
                stageName: 'الاستئناف',
                status: 'active',
                isSuspended: true,
                suspensionReason: ART172_SUSPENSION_REASON,
                parties: [
                    { ...FI_PARTIES[1], role: 'المستأنف (المدعى عليه)', isClient: true },
                    { ...FI_PARTIES[0], role: 'المستأنف عليه (المدعي)', isClient: false },
                ],
                appealMetadata: { appellantPartyIds: ['2'], priorStageOutcome: 'LOSS' },
            } as CaseStage,
            {
                id: 's2',
                name: 'الاعتراض على الحكم الغيابي',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
                parties: presentParties,
                finalDecision: 'تعديل الحكم الغيابي — بانتظار طعن المعترض عليه',
            } as CaseStage,
        ];

        const notices = resolveObjectionAppealGuidanceNotices({
            displayStage: stages[1],
            stages,
            parentIntegrity: 'indivisible',
        });
        expect(notices).toContain(ART172_STAY_CAUSE_LIFTED);
        expect(notices).toContain(ART172_VOID_EXTENDS_TO_PRESENT_NOTICE);
        expect(notices).not.toContain(OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE);
        expect(notices).not.toContain(OBJECTOR_UPHOLD_ORIGINAL_APPEAL_NOTICE);
    });

    it('أُلغي سطح الاستئناف المتقابل — لا مرشحين ولا زر', () => {
        const result = resolveCrossAppealEligibility({
            appealStage: {
                id: 's1',
                stageName: 'الاستئناف',
                parties: [
                    { ...FI_PARTIES[1], role: 'المستأنف (المدعى عليه)', side: 'right' },
                    { ...FI_PARTIES[0], role: 'المستأنف عليه (المدعي)', side: 'left' },
                    { ...FI_PARTIES[2], role: 'المستأنف عليه (المدعى عليه)', side: 'left' },
                ],
                appealMetadata: {
                    appellant: 'المدعى عليه',
                    priorJudgmentType: 'رد الدعوى جزئياً',
                    initialAppellantPartyIds: [2],
                },
            } as CaseStage,
            stages: [
                {
                    id: 's0',
                    stageName: 'بداءة بدرجة أولى',
                    finalDecision: 'رد الدعوى جزئياً',
                    parties: FI_PARTIES,
                } as CaseStage,
            ],
            appealStageIndex: 1,
        });
        expect(result.showButton).toBe(false);
        expect(result.canFileCrossAppeal).toBe(false);
        expect(result.pendingCrossAppellants).toEqual([]);
    });

    it('نافذة الحكم تعرض رد الاعتراض شكلاً وتحفظ القطعية بحق المعترض', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const stages: CaseStage[] = [
            {
                id: 's0',
                name: 'بداءة بدرجة أولى',
                stageName: 'بداءة بدرجة أولى',
                status: 'locked',
                parties: OBJ_PARTIES_PLAINTIFF,
            } as CaseStage,
            {
                id: 's-obj',
                name: 'الاعتراض على الحكم الغيابي',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
                parties: OBJ_PARTIES_PLAINTIFF,
            } as CaseStage,
        ];
        const setStages = vi.fn();
        const options: UseSmartFileJudgmentActionsOptions = {
            stages,
            setStages,
            activeStageIndex: 1,
            setActiveStageIndex: vi.fn(),
            setViewingStageIndex: vi.fn(),
            currentStage: stages[1]!,
            parentData: parent({ parties: OBJ_PARTIES_PLAINTIFF, representedParty: 'المدعي' }),
            saveToCloud: vi.fn(),
            setStatus: vi.fn(),
            tempJudgmentData: null,
            setTempJudgmentData: vi.fn(),
            setShowAppealTransitionModal: vi.fn(),
            setShowAppealModal: vi.fn(),
            setShowObjectionRegistrationModal: vi.fn(),
            setShowJudgmentModal: vi.fn(),
            setShowCrossAppealModal: vi.fn(),
            status: 'نشطة',
        };

        render(
            <SmartFileModalThemeProvider variant="civil">
                <SmartJudgmentModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={(data) => applyJudgmentConfirm(data, options)}
                    currentParties={OBJ_PARTIES_PLAINTIFF}
                    currentStage="الاعتراض على الحكم الغيابي"
                    representedParty="المدعي"
                    stages={stages}
                    activeStageIndex={1}
                />
            </SmartFileModalThemeProvider>,
        );

        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker));
        const option = screen.getByRole('option', { name: /رد الاعتراض شكلاً أو إبطاله للغياب/ });
        fireEvent.pointerDown(option);
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker));
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker).textContent ?? '').toContain(
            'رد الاعتراض شكلاً',
        );

        fireEvent.change(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDate), {
            target: { value: '2026-08-04' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'حفظ القرار' }));

        expect(setStages).toHaveBeenCalled();
        const saved = setStages.mock.calls[0][0][1] as CaseStage;
        expect(saved.finalDecision).toBe(
            'رد الاعتراض شكلاً — اكتسب الحكم الغيابي القطعية بحق المعترض',
        );
        expect(saved.awaitingOpponentAppeal).toBe(false);
    });
});
