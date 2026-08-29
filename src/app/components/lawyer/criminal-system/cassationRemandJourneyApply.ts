import type {
    CassationAppealRemandTarget,
    CassationProceeding,
    CassationType,
    CaseStage,
} from '@/app/types/criminal';
import type { CriminalCase } from './criminalCaseModel';
import {
    appendStageJourneyNode,
    buildInitialStageJourney,
    journeyNodeLabelForAppend,
    reactivateSameCourtRemandJourney,
    resolveCurrentJourneyNodeId,
} from './stageJourney';
import { syncStoredStageFromJourneyCaseStage } from './criminalStageUtils';
import { cassationTypeArticleLabel } from './cassationFilingMeta';
import {
    buildCassationTimelineEvent,
    juvenileJourneyLabelOptions,
    mergeCassationTimelineEvents,
} from './cassationMutationShared';

function remandTargetStage(type: CassationType, stageBefore: CaseStage): CaseStage {
    if (type === 'investigation_judge_appeal' || stageBefore === 'investigation') return 'investigation';
    if (type === 'federal_cassation_felony' || stageBefore === 'felony') return 'felony';
    return 'misdemeanor';
}

export function resolveRemandCaseStage(
    proceeding: CassationProceeding,
    override?: CassationAppealRemandTarget,
): CaseStage {
    if (override === 'investigation' || override === 'misdemeanor' || override === 'felony') {
        return override;
    }
    return remandTargetStage(proceeding.cassationType, proceeding.stageBeforeCassation);
}

export function applyQuashRemandJourney(
    caseRecord: CriminalCase,
    date: string,
    details: string,
    proceeding: CassationProceeding,
    options: {
        isObjectiveGrounds: boolean;
        beneficiaryIds: string[];
        remandTargetStage?: CassationAppealRemandTarget;
        timelineOverlay?: { title?: string; category?: string };
        suppressTimelineAppend?: boolean;
        sameCourtRetrialRemand?: boolean;
    },
): CriminalCase {
    const target = resolveRemandCaseStage(proceeding, options.remandTargetStage);
    const priorNodes = Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : buildInitialStageJourney();
    const transitionText = options.sameCourtRetrialRemand
        ? 'نقض وإعادة الأوراق لإعادة المحاكمة'
        : `نقض وإعادة — جولة ثانية م/269 — ${cassationTypeArticleLabel(proceeding.cassationType)}`;
    const scopeIds = options.isObjectiveGrounds
        ? undefined
        : options.beneficiaryIds.length
          ? options.beneficiaryIds
          : undefined;
    const nodes = options.sameCourtRetrialRemand
        ? reactivateSameCourtRemandJourney(priorNodes, target, date)
        : appendStageJourneyNode(priorNodes, {
              stage: target,
              label: journeyNodeLabelForAppend(
                  target,
                  priorNodes,
                  caseRecord.courtCaseNumber,
                  juvenileJourneyLabelOptions(caseRecord, scopeIds),
              ),
              transitionText,
              arrowLabel: transitionText,
              transitionKind: 'cassation_descend',
              startedAt: date,
              targetDefendantIds: scopeIds,
              defendantIds: scopeIds,
          });
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);
    const storedStage =
        target === 'investigation'
            ? syncStoredStageFromJourneyCaseStage('investigation', caseRecord.basics?.stage)
            : target === 'felony'
              ? 'محكمة الجنايات'
              : syncStoredStageFromJourneyCaseStage('misdemeanor', caseRecord.basics?.stage);
    return {
        ...caseRecord,
        stageJourney: nodes,
        caseStage: target,
        basics: { ...caseRecord.basics, stage: storedStage },
        isInvestigationLocked: false,
        isFrozen: false,
        finalDecision: undefined,
        isSentToCassation: false,
        timelineEvents: mergeCassationTimelineEvents(
            caseRecord,
            buildCassationTimelineEvent(
                date,
                {
                    category: 'نقض تمييزي وإعادة',
                    title: transitionText,
                    description: details,
                    proceduralNodeId: activeNodeId,
                    defendantIds: scopeIds,
                },
                options.timelineOverlay,
            ),
            options.suppressTimelineAppend,
        ),
    };
}

export function applyAffirmationLocks(caseRecord: CriminalCase, date: string): CriminalCase {
    const nodes = (Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : []).map((n) => {
        if (n.status !== 'current') return n;
        if (n.stage === 'cassation') {
            return { ...n, status: 'past' as const, endedAt: date };
        }
        return n;
    });
    return {
        ...caseRecord,
        stageJourney: nodes.length ? nodes : caseRecord.stageJourney,
        isInvestigationLocked: true,
        isFrozen: true,
        isSentToCassation: false,
    };
}
