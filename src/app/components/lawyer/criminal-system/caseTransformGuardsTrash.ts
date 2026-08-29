/**
 * Pure case transforms for CriminalCase — mutation guards, trash-bin
 * appends, identity-correction timeline entries, and trial-verdict helpers.
 * None of these touch the Zustand store directly.
 */
import {
    ensureStageJourneyOnCase,
} from './criminalStorePersistSupport';
import {
    buildTrashLabel,
    normalizeTrashBin,
    type CriminalTrashItem,
    type CriminalTrashItemKind,
} from './criminalCaseTrash';
import {
    caseMutationBlocked,
    isMergedDossierCase,
} from './criminalCaseMutationPolicy';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    StageConclusion,
    TimelineEvent,
} from './criminalCaseModel';
import {
    normalizeTrialSessions,
    trialVerdictOutcomeLabel,
    type TrialSession,
    type TrialVerdictOutcome,
} from './trialSessionsEngine';
import {
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';
import {
    isUnderInterventionReview,
} from './cassationEngine';
import {
    investigationStatementsMutationBlocked,
} from './investigationDefendantPurge';
import {
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    CASE_IDENTITY_CORRECTION_CATEGORY,
} from './caseIdentityCorrectionEngine';
import {
    stampProceduralNodeId,
} from './caseTransformShared';

export function cassationAppealMutationBlocked(target: CriminalCase): boolean {
    return isMergedDossierCase(target);
}

export function statementMutationBlocked(target: CriminalCase): boolean {
    return investigationStatementsMutationBlocked(target);
}

export function appendCaseTrashItem(
    target: CriminalCase,
    kind: CriminalTrashItemKind,
    snapshot: CriminalTrashItem['snapshot'],
): CriminalCase {
    const item: CriminalTrashItem = {
        id: createId(),
        kind,
        deletedAt: new Date().toISOString(),
        label: buildTrashLabel(kind, snapshot),
        snapshot: JSON.parse(JSON.stringify(snapshot)) as CriminalTrashItem['snapshot'],
    };
    return {
        ...target,
        trashBin: [...normalizeTrashBin(target.trashBin), item],
    };
}

export function appendIdentityCorrectionTimelineEvent(
    target: CriminalCase,
    title: string,
    description: string,
): CriminalCase {
    const date = new Date().toISOString().slice(0, 10);
    const nodeId = resolveCurrentJourneyNodeId(ensureStageJourneyOnCase(target).stageJourney);
    const event = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'investigation',
            category: CASE_IDENTITY_CORRECTION_CATEGORY,
            title,
            description,
        },
        nodeId,
    );
    return {
        ...target,
        timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
    };
}

export function caseMaterialProcedureBlocked(target: CriminalCase): boolean {
    return caseMutationBlocked(target) || isUnderInterventionReview(target);
}

export function buildTrialVerdictStageConclusion(
    target: CriminalCase,
    session: TrialSession,
    outcome: TrialVerdictOutcome,
    verdictDate: string,
): StageConclusion {
    const caseStage = resolveCaseStageFromRecord(target);
    const stageType: StageConclusion['stageType'] =
        caseStage === 'felony'
            ? 'felony'
            : caseStage === 'misdemeanor'
              ? 'misdemeanor'
              : 'misdemeanor';
    const outcomeLabel = trialVerdictOutcomeLabel(outcome);
    const notes = String(session.sessionNotes ?? '').trim();
    return {
        id: createId(),
        stageType,
        decisionType: outcome,
        date: verdictDate,
        details: notes
            ? `حكم ${outcomeLabel} صادر وجاهياً في الجلسة رقم ${session.sessionNumber}. ${notes}`
            : `حكم ${outcomeLabel} صادر وجاهياً في الجلسة رقم ${session.sessionNumber}.`,
        defendantStatusAtDecision: 'detained',
    };
}

export function trialSessionsLocked(target: CriminalCase): boolean {
    const list = normalizeTrialSessions(target.trials);
    return list.some((s) => s.status === 'verdict_issued' && s.verdict);
}
