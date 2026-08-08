import type { SeizedProperty } from '@/app/types/execution';
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

const PROPERTY_PLUGIN = getSeizureAssetPlugin('property');

export {
    isDecisionPending,
    isDecisionResolvedApproved,
    normalizePropertySeizureStatus,
    stepStatusForIndex,
};

export function parseSeizedPropertyIdFromDecision(row: Record<string, unknown>): string {
    return parseSeizedEntityIdFromDecision(PROPERTY_PLUGIN, row);
}

export function findSeizureDecisionForProperty(
    decisions: Array<Record<string, unknown>>,
    subtype: string,
    seizedPropertyId: string,
    opts?: { pendingOnly?: boolean },
): Record<string, unknown> | null {
    return findSeizureDecisionForEntity(
        decisions,
        PROPERTY_PLUGIN,
        subtype,
        seizedPropertyId,
        opts,
    );
}

export function listPendingPropertySeizureDecisions(
    decisions: Array<Record<string, unknown>>,
    seizedPropertyId: string,
): Array<Record<string, unknown>> {
    return listPendingSeizureDecisionsForEntity(decisions, PROPERTY_PLUGIN, seizedPropertyId);
}

export function isStalePropertyInitSeizureDecision(
    row: Record<string, unknown>,
    property: SeizedProperty,
): boolean {
    return isStaleInitSeizureDecision(PROPERTY_PLUGIN, row, property);
}

export function executorSubtypesForPropertyWorkflowStatus(
    status: string,
    property: SeizedProperty,
): string[] {
    return executorSubtypesForWorkflowStatus(PROPERTY_PLUGIN, status, property);
}

export function findApprovedUnsavedPropertyDecision(
    decisions: Array<Record<string, unknown>>,
    subtype: string,
    seizedPropertyId: string,
): Record<string, unknown> | null {
    return findApprovedUnsavedSeizureDecision(
        decisions,
        PROPERTY_PLUGIN,
        subtype,
        seizedPropertyId,
    );
}

export function findConflictingPendingPropertySubtype(
    decisions: Array<Record<string, unknown>>,
    propertyId: string,
    subtypeToSubmit: string,
): string | null {
    return findConflictingPendingSubtype(
        decisions,
        PROPERTY_PLUGIN,
        propertyId,
        subtypeToSubmit,
    );
}

export function propertyConflictingSubtypeLabelAr(subtype: string): string {
    return PROPERTY_PLUGIN.subtypeLabelAr[String(subtype || '').trim()] || subtype;
}

export function withdrawPendingPropertyDecisionsForStep(
    dossierId: string,
    decisions: Array<Record<string, unknown>>,
    propertyId: string,
    stepIndex: number,
): number {
    return withdrawPendingDecisionsForStep(
        dossierId,
        decisions,
        PROPERTY_PLUGIN,
        propertyId,
        stepIndex,
    );
}

export type PropertyWorkflowHistoryLine = SeizureWorkflowHistoryLine;

export function buildPropertyWorkflowStepHistory(
    stepIndex: number,
    p: SeizedProperty,
    decisions: Array<Record<string, unknown>>,
    propertyId: string,
): PropertyWorkflowHistoryLine[] {
    return buildSeizureWorkflowStepHistory(
        stepIndex,
        PROPERTY_PLUGIN,
        p,
        decisions,
        propertyId,
    );
}

export function filterRelevantPendingPropertyDecisions(
    decisions: Array<Record<string, unknown>>,
    property: SeizedProperty,
    status: string,
): Array<Record<string, unknown>> {
    const pid = String(property.id || '').trim();
    const allowed = executorSubtypesForPropertyWorkflowStatus(status, property);
    return filterRelevantPendingDecisions(
        decisions,
        PROPERTY_PLUGIN,
        property,
        pid,
        allowed,
    );
}

export function propertySeizureRequestBody(p: SeizedProperty, lead: string): string {
    return PROPERTY_PLUGIN.seizureRequestBody(p, lead);
}

export function propertyWorkflowActiveStepIndex(status: string, p: SeizedProperty): number {
    return workflowActiveStepIndex(status, p);
}

export function executorSubtypesForPropertyWorkflowStep(stepIndex: number): string[] {
    return executorSubtypesForWorkflowStep(PROPERTY_PLUGIN, stepIndex);
}
