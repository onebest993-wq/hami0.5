import type {
    CassationProceeding,
    CassationType,
    JourneyNode,
    ProsecutionInterventionBasis,
} from '@/app/types/criminal';
import type { CriminalCase } from './criminalCaseModel';
import {
    appendStageJourneyNode,
    buildInitialStageJourney,
    journeyNodeLabel,
    resolveCurrentJourneyNodeId,
} from './stageJourney';
import { syncStoredStageFromJourneyCaseStage } from './criminalStageUtils';
import {
    cassationJourneyTransitionKind,
    cassationTransitionLabel,
    cassationUsesVerticalAscend,
    resolveStageBeforeCassation,
} from './cassationFilingMeta';
import {
    createId,
    juvenileJourneyLabelOptions,
} from './cassationMutationShared';

export type InitiateCassationPayload = {
    cassationType: CassationType;
    filedAt: string;
    details: string;
    cassationNumber: string;
    panelName?: string;
    sentDate?: string;
    interventionBasis?: ProsecutionInterventionBasis;
    appellantDefendantIds: string[];
};

export function migrateLegacyCassationToProceeding(
    caseRecord: CriminalCase,
): CassationProceeding | undefined {
    const legacy = caseRecord.cassationCaseDetails;
    if (!caseRecord.isSentToCassation && !legacy) return caseRecord.cassationProceeding;
    if (caseRecord.cassationProceeding) return caseRecord.cassationProceeding;
    const stageBefore = resolveStageBeforeCassation(caseRecord);
    const type: CassationType =
        stageBefore === 'felony' ? 'federal_cassation_felony' : 'criminal_cassation_misdemeanor';
    return {
        id: createId(),
        cassationType: type,
        status: 'pending',
        filedAt: String(legacy?.sentDate ?? '').trim() || new Date().toISOString().slice(0, 10),
        cassationNumber: String(legacy?.cassationNumber ?? '').trim() || '—',
        panelName: String(legacy?.panelName ?? '').trim() || undefined,
        sentDate: String(legacy?.sentDate ?? '').trim() || undefined,
        appellantDefendantIds: (caseRecord.defendants ?? []).map((d) => d.id),
        stageBeforeCassation: stageBefore,
    };
}

function stampCassationNodes(
    nodes: JourneyNode[],
    filterNodeId: string,
    type: CassationType,
): JourneyNode[] {
    return nodes.map((n) =>
        n.id === filterNodeId
            ? {
                  ...n,
                  cassationType: type,
                  isCassationFilterNode: true,
              }
            : n,
    );
}

/** تقديم طعن/تدخل — حقن المسار والحالة الإجرائية. */

export function applyCassationFiling(caseRecord: CriminalCase, payload: InitiateCassationPayload): CriminalCase {
    const filedAt = String(payload.filedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(payload.details ?? '').trim();
    const cassationNumber = String(payload.cassationNumber ?? '').trim();
    if (!cassationNumber) return caseRecord;

    const appellantIds = (Array.isArray(payload.appellantDefendantIds) ? payload.appellantDefendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const stageBefore = resolveStageBeforeCassation(caseRecord);
    const transitionText = cassationTransitionLabel(payload.cassationType, payload.interventionBasis);
    const transitionKind = cassationJourneyTransitionKind(payload.cassationType);
    const filterNodeId = createId();

    const proceeding: CassationProceeding = {
        id: createId(),
        cassationType: payload.cassationType,
        status:
            payload.cassationType === 'prosecution_intervention_264b'
                ? 'under_intervention_review'
                : 'pending',
        filedAt,
        cassationNumber,
        panelName: String(payload.panelName ?? '').trim() || undefined,
        sentDate: String(payload.sentDate ?? '').trim() || undefined,
        interventionBasis: payload.interventionBasis,
        appellantDefendantIds: appellantIds,
        stageBeforeCassation: stageBefore,
        journeyFilterNodeId: filterNodeId,
    };

    const priorNodes = Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : buildInitialStageJourney();
    let nodes: JourneyNode[] = priorNodes;

    if (payload.cassationType === 'prosecution_intervention_264b') {
        nodes = priorNodes.map((n) =>
            n.status === 'current'
                ? {
                      ...n,
                      phaseOverlay: 'under_intervention_review' as const,
                      transitionText,
                      transitionKind,
                      cassationType: payload.cassationType,
                      isCassationFilterNode: true,
                  }
                : n,
        );
    } else if (cassationUsesVerticalAscend(payload.cassationType)) {
        const label =
            payload.cassationType === 'federal_cassation_felony'
                ? `تمييز اتحادية: ${cassationNumber}`
                : `تمييز جنح: ${cassationNumber}`;
        nodes = appendStageJourneyNode(priorNodes, {
            id: filterNodeId,
            stage: 'cassation',
            label,
            transitionText,
            transitionKind,
            startedAt: filedAt,
            cassationType: payload.cassationType,
            isCassationFilterNode: true,
        });
    } else {
        const stage = payload.cassationType === 'investigation_judge_appeal' ? 'investigation' : stageBefore;
        nodes = appendStageJourneyNode(priorNodes, {
            id: filterNodeId,
            stage,
            label: `${journeyNodeLabel(stage, undefined, juvenileJourneyLabelOptions(caseRecord, appellantIds))} — ${cassationNumber}`,
            transitionText,
            transitionKind,
            startedAt: filedAt,
            cassationType: payload.cassationType,
            isCassationFilterNode: true,
        });
    }

    nodes = stampCassationNodes(nodes, filterNodeId, payload.cassationType);
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);

    const event = {
        id: createId(),
        date: filedAt,
        type: 'decision' as const,
        category: 'طعن/تدخل تمييزي',
        title: transitionText,
        description: details || transitionText,
        defendantIds: appellantIds.length ? appellantIds : undefined,
        proceduralNodeId: activeNodeId,
    };

    const storedStage =
        payload.cassationType === 'investigation_judge_appeal'
            ? syncStoredStageFromJourneyCaseStage('investigation', caseRecord.basics?.stage)
            : cassationUsesVerticalAscend(payload.cassationType)
              ? 'cassation_court'
              : caseRecord.basics.stage;

    return {
        ...caseRecord,
        cassationProceeding: proceeding,
        isSentToCassation: cassationUsesVerticalAscend(payload.cassationType) || caseRecord.isSentToCassation,
        cassationCaseDetails: {
            cassationNumber,
            sentDate: String(payload.sentDate ?? filedAt).trim(),
            panelName: String(payload.panelName ?? '').trim() || '—',
        },
        stageJourney: nodes,
        caseStage:
            payload.cassationType === 'investigation_judge_appeal'
                ? 'investigation'
                : cassationUsesVerticalAscend(payload.cassationType)
                  ? 'cassation'
                  : caseRecord.caseStage ?? stageBefore,
        basics: { ...caseRecord.basics, stage: storedStage },
        timelineEvents: [...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []), event],
    };
}
