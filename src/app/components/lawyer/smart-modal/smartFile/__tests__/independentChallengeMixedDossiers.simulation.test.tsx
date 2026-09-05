import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import type { CaseStage, FileData, Party } from '../../../LawyerShared';
import type { SmartFileParentData } from '../parentDataInit';
import { applyAppealStageTransition } from '../appealStageTransitionApply';
import { openAbsentObjectionStage } from '../absentObjectionStageOpen';
import { applyArt172AppealStay, canOfferArt172AppealResume } from '../art172AppealStay';
import { applyWaitAppealScenarios } from '../../hooks/judgment/judgmentConfirm/scenarioWaitAppeal';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from '../../hooks/judgment/judgmentConfirm/judgmentConfirmTypes';
import { inferAppellantSideFromLawyer, defaultIncludedAppellantIds } from '../appealPartyEngine';
import { resolveSelectedOpponentPartyIds } from '../appealPartyListHelpers';
import { buildIndependentChallengeSpawnInput } from '../independentChallengeSpawnApply';
import {
    applyIndependentChallengeSpawn,
    shouldSpawnIndependentChallengeDossier,
} from '@/app/domain/lawsuit/independentChallengeDossier';
import { inferJudgmentTypeFromStage } from '../inferStageJudgmentType';
import { resolveSmartFileMainPanelFooterFlags } from '../../layout/mainPanel/resolveSmartFileMainPanelFooterFlags';
import {
    buildSmartFileMainPanelFooterPanels,
    type SmartFileMainPanelFooterPanelsInput,
} from '../../layout/mainPanel/buildSmartFileMainPanelFooterPanels';
import { CIVIL_LAWSUIT_TEST_IDS } from '../civilLawsuitTestIds';
import { isAppellantAppealRole, isAppelleeAppealRole } from '../partyRoleClassification';
import {
    listConsolidationCandidates,
    mergeLawsuitFilesForConsolidation,
} from '../caseConsolidationLinking';

afterEach(() => {
    cleanup();
});

const FI_PARTIES: Party[] = [
    { id: 1, name: 'أحمد', role: 'المدعي', isClient: true, side: 'right' },
    { id: 2, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 3, name: 'باسم', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 4, name: 'كريم', role: 'المدعى عليه', isClient: false, side: 'left' },
];

function parent(): SmartFileParentData {
    return {
        id: 11,
        originalParties: FI_PARTIES,
        parties: FI_PARTIES,
        feesTotal: 0,
        feesPaid: 0,
        docType: 'مطالبة بدين',
        createdDate: '2026-01-01',
        representedParty: 'المدعي',
        disputeIntegrity: 'indivisible',
        caseNo: '100/2026',
        court: 'بداءة الرصافة',
    };
}

function footerInput(
    overrides: Partial<SmartFileMainPanelFooterPanelsInput>,
): SmartFileMainPanelFooterPanelsInput {
    return {
        parentData: parent(),
        showAbsentJudgmentFooter: false,
        showAbsentJudgmentNotificationAction: false,
        showOpponentAppealBtnEffective: false,
        showAppealStageFooter: false,
        appealStageFooter: { show: false, kind: undefined } as SmartFileMainPanelFooterPanelsInput['appealStageFooter'],
        showPetitionVoidFooter: false,
        showPostJudgmentAppealFooter: false,
        showFlowStatusFooter: false,
        showFlowAbandonmentFooter: false,
        showFlowPauseFooter: false,
        showRemainingOpponentChallenge: false,
        remainingOpponentChallengeLabel: '',
        showIndependentClientChallenge: false,
        showJoinCoObjectorFooter: false,
        joinCoObjectorCandidates: [],
        handleOpenDefendantCassationAppeal: vi.fn(),
        setShowAppealModal: vi.fn(),
        setShowResumeInterruptionModal: vi.fn(),
        setShowAbandonmentRenewalModal: vi.fn(),
        setShowPauseResumeModal: vi.fn(),
        handlePetitionVoidAppeal: vi.fn(),
        handlePetitionVoidOutcome: vi.fn(),
        handleOpponentAppealWaived: vi.fn(),
        handleReopenPleadings: vi.fn(),
        handleJoinCoObjector: vi.fn(),
        onAbsentJudgmentNotification: vi.fn(),
        ...overrides,
    } as SmartFileMainPanelFooterPanelsInput;
}

function runWait(stages: CaseStage[], judgmentType: string): CaseStage[] {
    const activeIndex = stages.length - 1;
    const currentStage = stages[activeIndex]!;
    const updatedStages = stages.map((stage) => ({ ...stage }));
    const scope: JudgmentConfirmScope = {
        stages,
        currentStage,
        activeStageIndex: activeIndex,
        parentData: parent(),
        setStatus: vi.fn(),
        setActiveStageIndex: vi.fn(),
    };
    const rt: JudgmentConfirmRuntime = {
        judgmentData: { action: 'waiting_for_appeal' },
        action: 'waiting_for_appeal',
        judgmentType,
        judgmentForm: 'حضوري',
        judgmentDate: '2026-09-20',
        notes: '',
        nextStage: '',
        now: new Date('2026-09-20T00:00:00'),
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

function buildMixedDossier(): { stages: CaseStage[]; sourceFile: FileData } {
    const fi: CaseStage = {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'active',
        parties: FI_PARTIES,
        caseNo: '100/2026',
        court: 'بداءة الرصافة',
        clientStageOutcome: 'WIN',
        disputeIntegrity: 'indivisible',
        judgmentForm: 'مختلط',
        partyJudgmentDispositions: [
            { partyId: '2', form: 'حضوري' },
            { partyId: '3', form: 'حضوري' },
            { partyId: '4', form: 'غيابي' },
        ],
    } as CaseStage;

    const firstAppeal = applyAppealStageTransition([fi], 0, fi, {
        appealType: 'استئناف',
        appellant: 'المدعى عليه',
        filingDate: '2026-09-01',
        newCaseNumber: 'است/10',
        newCourt: 'استئناف بغداد',
        includedAppellantPartyIds: [2, 3],
        includedOpponentPartyIds: [1],
        priorStageOutcome: 'WIN',
    });
    expect(firstAppeal.independentRequired).toBeFalsy();
    let stages = firstAppeal.updatedStages;
    stages[1] = { ...stages[1]!, ...applyArt172AppealStay(stages[1]!, '2026-09-01') };

    const objection = openAbsentObjectionStage({
        stages,
        activeStageIndex: 1,
        currentStage: stages[1]!,
        filingDate: '2026-09-10',
        archiveTimelineEvent: {
            id: 'obj_open',
            type: 'milestone',
            date: '2026-09-10',
            title: 'اعتراض',
            details: 'اعترض الغائب',
            isNew: true,
        },
        objectorPartyIds: [4],
    });
    stages = runWait(objection.updatedStages, 'رد الدعوى كلياً');

    const sourceFile = {
        id: 11,
        type: 'lawsuit',
        status: 'active',
        caseNo: '100/2026',
        court: 'بداءة الرصافة',
        parties: FI_PARTIES,
        representedParty: 'المدعي',
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
        disputeIntegrity: 'indivisible',
        lawsuitJurisdiction: 'civil',
        stages,
        activeStageIndex: stages.length - 1,
    } as FileData;

    return { stages, sourceFile };
}

describe('إضبارة مستقلة ذكية — مدعي واحد وثلاثة مدعى عليهم', () => {
    it('ينشق استئناف المدعي بعد ربح الغائب دون لمس رول الحاضرين', () => {
        const { stages, sourceFile } = buildMixedDossier();
        const objection = stages[stages.length - 1]!;
        const extracted = stages[1]!;

        expect(extracted.caseNo).toBe('است/10');
        expect(extracted.isSuspended).toBe(true);
        expect(extracted.parties?.filter((p) => isAppellantAppealRole(String(p.role))).map((p) => p.id).sort()).toEqual(
            [2, 3],
        );
        expect(extracted.parties?.find((p) => p.id === 1)?.role).toContain('المستأنف عليه');
        expect(canOfferArt172AppealResume(extracted)).toBe(true);

        expect(objection.parties?.map((p) => p.id).sort()).toEqual([1, 4]);
        expect(objection.finalDecision).toBe('تعديل الحكم الغيابي — يحق لموكلك الطعن');
        expect(inferJudgmentTypeFromStage(objection)).toBe('رد الدعوى كلياً');

        expect(
            shouldSpawnIndependentChallengeDossier({
                stages,
                sourceStage: objection,
                appealType: 'استئناف',
            }),
        ).toBe(true);

        const flags = resolveSmartFileMainPanelFooterFlags({
            status: 'نشطة',
            isViewingArchived: false,
            parentData: parent(),
            displayStage: objection,
            currentStage: objection,
            stages,
            activeStageIndex: stages.length - 1,
            viewingStageIndex: stages.length - 1,
            isPaused: false,
            isInterrupted: false,
            displayStageLabel: String(objection.stageName),
            currentStageLabel: String(objection.stageName),
        });
        expect(flags.showPostJudgmentAppealFooter).toBe(true);
        expect(flags.showArt172ResumeFooter).toBe(false);

        const panels = buildSmartFileMainPanelFooterPanels(
            footerInput({
                displayStage: objection,
                currentStage: objection,
                stages,
                file: sourceFile,
                lawsuitFiles: [sourceFile],
                showPostJudgmentAppealFooter: true,
            }),
        );

        render(<div>{panels.postJudgmentAppealFooterPanel}</div>);
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.independentChallengeSpawn)).toHaveTextContent(
            'إنشاء طعن استئنافي مستقل',
        );

        const appellantSide = inferAppellantSideFromLawyer('المدعي', objection.parties);
        expect(appellantSide).toBe('المدعي');
        const appellantIds = defaultIncludedAppellantIds(objection.parties ?? [], appellantSide);
        const opponentIds = resolveSelectedOpponentPartyIds(
            objection.parties,
            appellantIds,
            undefined,
            objection.incidentalCases,
        );
        expect(appellantIds).toEqual([1]);
        expect(opponentIds).toEqual([4]);

        const spawn = buildIndependentChallengeSpawnInput({
            sourceFileId: 11,
            stages,
            sourceStageIndex: stages.length - 1,
            sourceStage: objection,
            hop: {
                appealType: 'استئناف',
                appellant: appellantSide,
                filingDate: '2026-09-21',
                newCaseNumber: 'است/88',
                newCourt: 'استئناف بغداد',
                includedAppellantPartyIds: appellantIds,
                includedOpponentPartyIds: opponentIds,
                priorStageOutcome: objection.clientStageOutcome ?? 'LOSS',
                priorJudgmentType: inferJudgmentTypeFromStage(objection),
            },
        });
        expect('error' in spawn).toBe(false);
        if ('error' in spawn) return;

        const { sourceFile: patched, createdFile } = applyIndependentChallengeSpawn({
            sourceFile,
            sourceStageIndex: stages.length - 1,
            createdId: 99,
            appealStage: spawn.appealStage,
            appealType: 'استئناف',
            filingDate: '2026-09-21',
            newCaseNumber: 'است/88',
            newCourt: 'استئناف بغداد',
        });

        expect(patched.stages?.[1]?.caseNo).toBe('است/10');
        expect(patched.stages?.[1]?.parties?.filter((p) => isAppellantAppealRole(String(p.role))).map((p) => p.id).sort()).toEqual(
            [2, 3],
        );
        expect(patched.stages?.[1]?.isSuspended).toBe(true);

        const createdAppeal = createdFile.stages?.[0];
        expect(createdFile.caseNo).toBe('است/88');
        expect(createdFile.representedParty).toBe('المدعي');
        expect(createdFile.parentId).toBe(11);
        expect(createdAppeal?.parties).toHaveLength(2);
        expect(createdAppeal?.parties?.find((p) => p.id === 1)?.role).toContain('المستأنف (المدعي)');
        expect(createdAppeal?.parties?.find((p) => p.id === 4)?.role).toContain('المستأنف عليه (المدعى عليه)');
        expect(createdAppeal?.parties?.some((p) => p.id === 2 || p.id === 3)).toBe(false);
        expect(createdAppeal?.appealMetadata?.priorJudgmentType).toBe('رد الدعوى كلياً');
        expect(createdAppeal?.disputeIntegrity).toBe('indivisible');

        const unifyFlags = resolveSmartFileMainPanelFooterFlags({
            status: 'نشطة',
            isViewingArchived: false,
            parentData: { ...parent(), representedParty: 'المدعي' },
            displayStage: createdAppeal!,
            currentStage: createdAppeal!,
            stages: createdFile.stages ?? [],
            activeStageIndex: 0,
            viewingStageIndex: 0,
            isPaused: false,
            isInterrupted: false,
            displayStageLabel: 'الاستئناف',
            currentStageLabel: 'الاستئناف',
        });
        expect(unifyFlags.showPostJudgmentAppealFooter).toBe(false);

        const candidates = listConsolidationCandidates([patched, createdFile], createdFile.id);
        expect(candidates.map((c) => c.id)).toContain(11);

        const consolidated = mergeLawsuitFilesForConsolidation(patched, createdFile, {
            consolidationDate: '2026-09-03',
            notes: 'توحيد اختياري من الإجراءات',
        });
        expect('error' in consolidated).toBe(false);
        if ('error' in consolidated) return;
        expect(consolidated.mergedPrimary.parties?.find((p) => p.id === 1)?.name).toBe('أحمد');
        expect(consolidated.mergedPrimary.parties?.find((p) => p.id === 2)?.name).toBe('سامي');
        expect(consolidated.mergedPrimary.parties?.find((p) => p.id === 3)?.name).toBe('باسم');
        expect(consolidated.archivedSecondary.consolidationMergedInto).toBe(11);
        expect(isAppelleeAppealRole(String(createdAppeal?.parties?.find((p) => p.id === 4)?.role))).toBe(true);
    });

    it('تأييد الغيابي ثم طعن المعترض ينشئ إضبارة ثانية دون قلب رول الحاضرين', () => {
        const fi: CaseStage = {
            id: 's0',
            name: 'بداءة بدرجة أولى',
            stageName: 'بداءة بدرجة أولى',
            status: 'active',
            parties: FI_PARTIES,
            caseNo: '100/2026',
            clientStageOutcome: 'WIN',
            disputeIntegrity: 'indivisible',
        } as CaseStage;
        const appealed = applyAppealStageTransition([fi], 0, fi, {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-09-01',
            newCaseNumber: 'است/10',
            includedAppellantPartyIds: [2, 3],
            includedOpponentPartyIds: [1],
            priorStageOutcome: 'WIN',
        }).updatedStages;
        const opened = openAbsentObjectionStage({
            stages: appealed,
            activeStageIndex: 1,
            currentStage: appealed[1]!,
            filingDate: '2026-09-10',
            archiveTimelineEvent: {
                id: 'obj',
                type: 'milestone',
                date: '2026-09-10',
                title: 'اعتراض',
                details: '',
                isNew: true,
            },
            objectorPartyIds: [4],
        });
        const stages = runWait(opened.updatedStages, 'إجابة الدعوى بالكامل');
        const objection = stages[stages.length - 1]!;
        expect(objection.finalDecision).toContain('بانتظار طعن المعترض');

        const spawn = buildIndependentChallengeSpawnInput({
            sourceFileId: 11,
            stages,
            sourceStageIndex: stages.length - 1,
            sourceStage: objection,
            hop: {
                appealType: 'استئناف',
                appellant: 'المدعى عليه',
                filingDate: '2026-09-22',
                newCaseNumber: 'است/90',
                includedAppellantPartyIds: [4],
                includedOpponentPartyIds: [1],
                priorStageOutcome: 'WIN',
            },
        });
        expect('error' in spawn).toBe(false);
        if ('error' in spawn) return;
        expect(spawn.appealStage.parties?.find((p) => p.id === 4)?.role).toContain('المستأنف (المدعى عليه)');
        expect(spawn.appealStage.parties?.find((p) => p.id === 1)?.role).toContain('المستأنف عليه (المدعي)');
        expect(spawn.appealStage.parties).toHaveLength(2);
        expect(stages[1]?.parties?.filter((p) => isAppellantAppealRole(String(p.role))).map((p) => p.id).sort()).toEqual(
            [2, 3],
        );
    });
});
