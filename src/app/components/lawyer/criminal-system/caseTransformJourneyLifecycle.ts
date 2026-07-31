/**
 * Pure case transforms for CriminalCase — stage-journey lifecycle: generic
 * stage transitions, prejudicial postponement, default-judgment archive /
 * opposition, and fugitive-referral case splitting. None of these touch the
 * Zustand store directly.
 */
import {
    ensureStageJourneyOnCase,
} from './criminalStorePersistSupport';
import type {
    CaseStage,
    JourneyTransitionKind,
} from '@/app/types/criminal';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    CriminalCaseStage,
    StageConclusion,
} from './criminalCaseModel';
import {
    resolveCaseStageFromRecord,
    shouldUseJuvenileTrialJourneyLabels,
    storedStageFromCaseStage,
} from './criminalStageRuntimeCore';
import {
    appendStageJourneyNode,
    buildInitialStageJourney,
    forkStageJourneyFromCurrent,
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    journeyNodeLabel,
    journeyNodeLabelForAppend,
} from './stageJourneyTransitionCore';
import {
    stampProceduralNodeId,
    mapDecisionStatusToDefendantStatus,
} from './caseTransformShared';
import {
    applyPersonalStagesToDefendants,
} from './caseTransformPersonalStage';

export function applyStageJourneyTransition(
    target: CriminalCase,
    option: {
        targetStage: CaseStage;
        transitionText: string;
        transitionKind: JourneyTransitionKind;
        startedAt: string;
        courtCaseNumber?: string;
        courtName?: string;
        storedStageOverride?: CriminalCaseStage;
    },
): { caseRecord: CriminalCase; activeNodeId: string } {
    const startedAt = String(option.startedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const courtNum = String(option.courtCaseNumber ?? '').trim();
    const priorNodes = Array.isArray(target.stageJourney)
        ? target.stageJourney
        : buildInitialStageJourney();
    const nodes = appendStageJourneyNode(priorNodes, {
        stage: option.targetStage,
        label: journeyNodeLabelForAppend(
            option.targetStage,
            priorNodes,
            courtNum || target.courtCaseNumber,
            {
                juvenileTrialDisplay: option.storedStageOverride === 'محكمة الأحداث',
            },
        ),
        transitionText: option.transitionText,
        transitionKind: option.transitionKind,
        startedAt,
    });
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);
    const storedStage = option.storedStageOverride ?? storedStageFromCaseStage(option.targetStage);
    let next: CriminalCase = {
        ...target,
        caseStage: option.targetStage,
        basics: { ...target.basics, stage: storedStage },
        stageJourney: nodes,
    };
    if (option.targetStage === 'misdemeanor' || option.targetStage === 'felony') {
        next = {
            ...next,
            courtCaseNumber: courtNum || next.courtCaseNumber,
            location: {
                ...next.location,
                courtName: String(option.courtName ?? '').trim() || next.location.courtName,
                caseNumber: courtNum || next.location.caseNumber,
            },
            isInvestigationLocked: true,
        };
    }
    if (option.targetStage === 'investigation') {
        next = { ...next, isInvestigationLocked: false };
    }
    if (option.targetStage === 'cassation') {
        next = { ...next, isSentToCassation: true };
    }
    return { caseRecord: next, activeNodeId };
}

export function applyPrejudicialPostponement(caseRecord: CriminalCase, date: string, details: string): CriminalCase {
    const startedAt = String(date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const nodes = (Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : buildInitialStageJourney()).map(
        (n) => (n.status === 'current' ? { ...n, phaseOverlay: 'frozen_prejudicial' as const } : n),
    );
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);
    const event = stampProceduralNodeId(
        {
            id: createId(),
            date: startedAt,
            type: 'decision',
            category: 'استئخار الدعوى — مادة 183',
            title: '⏳ استئخار جزائي',
            description: details,
        },
        activeNodeId,
    );
    return {
        ...caseRecord,
        stageJourney: nodes,
        isPrejudicialPostponed: true,
        isFrozen: true,
        finalDecision: undefined,
        timelineEvents: [...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []), event],
    };
}

export function applyDefaultJudgmentArchive(caseRecord: CriminalCase, conclusion: StageConclusion): CriminalCase {
    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(conclusion.details ?? '').trim() || 'صدور حكم غيابي وأرشفة الدعوى.';
    const activeNodeId = resolveCurrentJourneyNodeId(caseRecord.stageJourney);
    const event = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'حكم غيابي',
            title: '⚖️ حكم غيابي',
            description: details,
            defendantIds: conclusion.defendantIds,
        },
        activeNodeId,
    );
    return {
        ...caseRecord,
        isDefaultJudgmentArchived: true,
        isArchived: true,
        isFrozen: true,
        finalDecision: conclusion,
        timelineEvents: [...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []), event],
    };
}

export function applyDefaultJudgmentOpposition(caseRecord: CriminalCase, conclusion: StageConclusion): CriminalCase {
    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const stage = resolveCaseStageFromRecord(caseRecord);
    const nodes = appendStageJourneyNode(
        Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : buildInitialStageJourney(),
        {
            stage: stage === 'investigation' ? 'misdemeanor' : stage,
            label: 'محاكمة وجاهية — معارضة غيابية',
            transitionText: '🔓 طعن واعتراض معارضة غيابية',
            transitionKind: 'backward_reversal',
            startedAt: date,
            phaseOverlay: 'default_judgment_opposition',
        },
    );
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);
    const event = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'معارضة غيابية',
            title: '🔓 معارضة غيابية',
            description: String(conclusion.details ?? '').trim(),
            defendantIds: conclusion.defendantIds,
        },
        activeNodeId,
    );
    const trialStage = stage === 'investigation' ? 'misdemeanor' : stage;
    return {
        ...caseRecord,
        caseStage: trialStage,
        basics: {
            ...caseRecord.basics,
            stage: storedStageFromCaseStage(trialStage),
        },
        stageJourney: nodes,
        isDefaultJudgmentArchived: false,
        isArchived: false,
        isFrozen: false,
        finalDecision: undefined,
        timelineEvents: [...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []), event],
    };
}

export function applyCaseSplitFugitiveReferral(
    target: CriminalCase,
    conclusion: StageConclusion,
    referral: { courtName: string; caseNumber: string; stage: 'محكمة الجنح' | 'محكمة الجنايات' },
): CriminalCase {
    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(conclusion.details ?? '').trim() || 'تجزئة الإضبارة وإحالة جزء منها.';
    const referredIds = (Array.isArray(conclusion.defendantIds) ? conclusion.defendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const allDefs = Array.isArray(target.defendants) ? target.defendants : [];
    const investigationIds = allDefs
        .filter((d) => !referredIds.includes(d.id))
        .map((d) => d.id);
    const stageKey = referral.stage === 'محكمة الجنايات' ? 'felony' : 'misdemeanor';
    const courtNum = String(referral.caseNumber ?? '').trim();
    const courtName = String(referral.courtName ?? '').trim();
    const storedStage = storedStageFromCaseStage(stageKey);

    let base = ensureStageJourneyOnCase(target);
    const nodes = forkStageJourneyFromCurrent(base.stageJourney ?? buildInitialStageJourney(), {
        startedAt: date,
        transitionText: '✂️ تجزئة الإضبارة — متهم هارب / إحالة الباقين',
        branches: [
            {
                branchId: 'split-investigation',
                branchLabel: 'تحقيق — مسار الهارب',
                stage: 'investigation',
                label: 'تحقيق (مستمر بحق الهارب)',
                defendantIds: investigationIds.length ? investigationIds : undefined,
                transitionKind: 'parallel_fork',
            },
            {
                branchId: 'split-trial',
                branchLabel:
                    stageKey === 'felony'
                        ? 'جنايات — محالون'
                        : shouldUseJuvenileTrialJourneyLabels(allDefs, { defendantIds: referredIds })
                          ? 'أحداث — محالون'
                          : 'جنح — محالون',
                stage: stageKey,
                label: journeyNodeLabel(stageKey, courtNum, {
                    juvenileTrialDisplay: shouldUseJuvenileTrialJourneyLabels(allDefs, {
                        defendantIds: referredIds,
                    }),
                }),
                defendantIds: referredIds,
                transitionKind: 'parallel_fork',
            },
        ],
    });

    const trialNodeId = nodes.find((n) => n.branchId === 'split-trial' && n.status === 'current')?.id ?? '';
    const invNodeId = nodes.find((n) => n.branchId === 'split-investigation' && n.status === 'current')?.id ?? '';

    const trialEvent = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'قرار تجزئة وإحالة',
            title: 'إحالة المتهمين غير الهاربين',
            description: `${details}\nالمحكمة: ${courtName || '—'} • رقم الدعوى: ${courtNum || '—'}`,
            defendantIds: referredIds.length ? referredIds : undefined,
        },
        trialNodeId,
    );
    const invEvent = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'قرار تجزئة — استمرار التحقيق',
            title: 'استمرار التحقيق بحق الهارب',
            description: details,
            defendantIds: investigationIds.length ? investigationIds : undefined,
        },
        invNodeId,
    );

    let next: CriminalCase = {
        ...base,
        caseStage: stageKey,
        basics: { ...base.basics, stage: storedStage },
        courtCaseNumber: courtNum || base.courtCaseNumber,
        isInvestigationLocked: true,
        stageJourney: nodes,
        location: {
            ...base.location,
            courtName: courtName || base.location.courtName,
            caseNumber: courtNum || base.location.caseNumber,
        },
        finalDecision: conclusion,
        timelineEvents: [
            ...(Array.isArray(base.timelineEvents) ? base.timelineEvents : []),
            trialEvent,
            invEvent,
        ],
    };
    if (referredIds.length) {
        next = applyPersonalStagesToDefendants(next, referredIds, 'referred_to_trial', {
            status: mapDecisionStatusToDefendantStatus(conclusion.defendantStatusAtDecision),
        });
    }
    return next;
}
