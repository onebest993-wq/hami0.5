import type { SeizedMovable } from '@/app/types/execution';
import { getSeizureAssetPlugin, parseSeizedEntityIdFromDecision } from './seizureAssetPlugins';
import {
    buildSeizureWorkflowStepHistory,
    executorSubtypesForWorkflowStatus,
    executorSubtypesForWorkflowStep,
    findApprovedUnsavedSeizureDecision,
    findConflictingPendingSubtype,
    findSeizureDecisionForEntity,
    filterRelevantPendingDecisions,
    listPendingSeizureDecisionsForEntity,
    isStaleInitSeizureDecision,
    withdrawPendingDecisionsForStep,
    workflowActiveStepIndex,
} from './seizureWorkflowDecisionQueries';
import type { SeizureWorkflowHistoryLine } from './seizureWorkflowTypes';
import {
    isDecisionPending,
    isDecisionResolvedApproved,
    normalizePropertySeizureStatus,
    stepStatusForIndex,
} from './seizureWorkflowStatus';

const MOVABLE_PLUGIN = getSeizureAssetPlugin('movable');

export {
    isDecisionPending,
    isDecisionResolvedApproved,
    normalizePropertySeizureStatus,
    normalizePropertySeizureStatus as normalizeMovableSeizureStatus,
    stepStatusForIndex,
};

export function parseSeizedMovableIdFromDecision(row: Record<string, unknown>): string {
    return parseSeizedEntityIdFromDecision(MOVABLE_PLUGIN, row);
}

export function findSeizureDecisionForMovable(
    decisions: Array<Record<string, unknown>>,
    subtype: string,
    seizedMovableId: string,
    opts?: { pendingOnly?: boolean },
): Record<string, unknown> | null {
    return findSeizureDecisionForEntity(
        decisions,
        MOVABLE_PLUGIN,
        subtype,
        seizedMovableId,
        opts,
    );
}

export function listPendingMovableSeizureDecisions(
    decisions: Array<Record<string, unknown>>,
    seizedMovableId: string,
): Array<Record<string, unknown>> {
    return listPendingSeizureDecisionsForEntity(decisions, MOVABLE_PLUGIN, seizedMovableId);
}

export function isStaleMovableInitSeizureDecision(
    row: Record<string, unknown>,
    movable: SeizedMovable,
): boolean {
    return isStaleInitSeizureDecision(MOVABLE_PLUGIN, row, movable);
}

export function executorSubtypesForMovableWorkflowStatus(
    status: string,
    movable: SeizedMovable,
): string[] {
    return executorSubtypesForWorkflowStatus(MOVABLE_PLUGIN, status, movable);
}

export function findApprovedUnsavedMovableDecision(
    decisions: Array<Record<string, unknown>>,
    subtype: string,
    seizedMovableId: string,
): Record<string, unknown> | null {
    return findApprovedUnsavedSeizureDecision(
        decisions,
        MOVABLE_PLUGIN,
        subtype,
        seizedMovableId,
    );
}

export function findConflictingPendingMovableSubtype(
    decisions: Array<Record<string, unknown>>,
    movableId: string,
    subtypeToSubmit: string,
): string | null {
    return findConflictingPendingSubtype(
        decisions,
        MOVABLE_PLUGIN,
        movableId,
        subtypeToSubmit,
    );
}

export function movableConflictingSubtypeLabelAr(subtype: string): string {
    return MOVABLE_PLUGIN.subtypeLabelAr[String(subtype || '').trim()] || subtype;
}

export function withdrawPendingMovableDecisionsForStep(
    dossierId: string,
    decisions: Array<Record<string, unknown>>,
    movableId: string,
    stepIndex: number,
): number {
    return withdrawPendingDecisionsForStep(
        dossierId,
        decisions,
        MOVABLE_PLUGIN,
        movableId,
        stepIndex,
    );
}

export type MovableWorkflowHistoryLine = SeizureWorkflowHistoryLine;

export function buildMovableWorkflowStepHistory(
    stepIndex: number,
    m: SeizedMovable,
    decisions: Array<Record<string, unknown>>,
    movableId: string,
): MovableWorkflowHistoryLine[] {
    return buildSeizureWorkflowStepHistory(
        stepIndex,
        MOVABLE_PLUGIN,
        m,
        decisions,
        movableId,
    );
}

export function filterRelevantPendingMovableDecisions(
    decisions: Array<Record<string, unknown>>,
    movable: SeizedMovable,
    status: string,
): Array<Record<string, unknown>> {
    const mid = String(movable.id || '').trim();
    const allowed = executorSubtypesForMovableWorkflowStatus(status, movable);
    return filterRelevantPendingDecisions(
        decisions,
        MOVABLE_PLUGIN,
        movable,
        mid,
        allowed,
    );
}

export function movableSeizureRequestBody(m: SeizedMovable, lead: string): string {
    return MOVABLE_PLUGIN.seizureRequestBody(m, lead);
}

export function movableWorkflowActiveStepIndex(status: string, m: SeizedMovable): number {
    return workflowActiveStepIndex(status, m);
}

export function executorSubtypesForMovableWorkflowStep(stepIndex: number): string[] {
    return executorSubtypesForWorkflowStep(MOVABLE_PLUGIN, stepIndex);
}
