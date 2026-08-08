import { appendPendingExecutorSeizureDecision } from '@/app/utils/executorSeizureDecisionQueue';
import {
    isInvalidSeizureWorkflowDossierId,
    resolveSeizureWorkflowDossierId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureWorkflowDossierUtils';
import {
    buildSeizurePayloadJson,
    getSeizureAssetPlugin,
    parseSeizedEntityIdFromDecision,
} from './seizureAssetPlugins';
import {
    conflictingSubtypeLabelAr,
    findApprovedUnsavedSeizureDecision,
    findConflictingPendingSubtype,
    findSeizureDecisionForEntity,
    withdrawPendingDecisionsForStep,
} from './seizureWorkflowDecisionQueries';
import type {
    SeizureAssetKind,
    SeizureInlineFocusStep,
    SeizureWorkflowDossierInput,
    SubmitSeizurePendingRequestInput,
} from './seizureWorkflowTypes';

export type SeizureWorkflowEngineContext = {
    assetKind: SeizureAssetKind;
    dossierInput: SeizureWorkflowDossierInput;
};

/** نقطة دخول واحدة لمنطق دورة الحجز — dossier، طلبات المنفذ، تعارضات، سحب */
export function createSeizureWorkflowEngine(ctx: SeizureWorkflowEngineContext) {
    const plugin = getSeizureAssetPlugin(ctx.assetKind);

    const resolveDossierId = (): string =>
        resolveSeizureWorkflowDossierId({
            decisionsStorageExecutionId: ctx.dossierInput.decisionsStorageExecutionId,
            executionId: ctx.dossierInput.executionId,
            executionDataId: ctx.dossierInput.executionDataId,
            executionData: ctx.dossierInput.executionData,
        });

    return {
        plugin,
        resolveDossierId,
        isValidDossier: (id?: string) => !isInvalidSeizureWorkflowDossierId(id),

        submitPendingRequest(
            input: {
                entityId: string;
                subtype: string;
                requestTitle: string;
                requestBody: string;
                payloadExtra?: Record<string, unknown>;
                decisions: Array<Record<string, unknown>>;
                dossierId?: string;
            },
        ): {
            ok: boolean;
            decisionId: string | null;
            error?: 'invalid_dossier' | 'conflict' | 'duplicate';
            conflictSubtype?: string;
        } {
            const dossierId = String(input.dossierId || resolveDossierId()).trim();
            if (isInvalidSeizureWorkflowDossierId(dossierId)) {
                return { ok: false, decisionId: null, error: 'invalid_dossier' };
            }
            const entityId = String(input.entityId || '').trim();
            const subtype = String(input.subtype || '').trim();
            const conflict = findConflictingPendingSubtype(
                input.decisions,
                plugin,
                entityId,
                subtype,
            );
            if (conflict) {
                return { ok: false, decisionId: null, error: 'conflict', conflictSubtype: conflict };
            }
            const payloadJson = buildSeizurePayloadJson(plugin, entityId, input.payloadExtra);
            const did = appendPendingExecutorSeizureDecision({
                executionId: dossierId,
                requestTitle: input.requestTitle,
                requestBody: input.requestBody,
                seizureSubtype: subtype as never,
                seizurePayloadJson: payloadJson,
            });
            if (!did) return { ok: false, decisionId: null, error: 'duplicate' };
            return { ok: true, decisionId: did };
        },

        findDecision(
            decisions: Array<Record<string, unknown>>,
            subtype: string,
            entityId: string,
            opts?: { pendingOnly?: boolean },
        ) {
            return findSeizureDecisionForEntity(decisions, plugin, subtype, entityId, opts);
        },

        findApprovedUnsaved(
            decisions: Array<Record<string, unknown>>,
            subtype: string,
            entityId: string,
        ) {
            return findApprovedUnsavedSeizureDecision(decisions, plugin, subtype, entityId);
        },

        conflictLabel(subtype: string) {
            return conflictingSubtypeLabelAr(plugin, subtype);
        },

        withdrawPendingForStep(
            dossierId: string,
            decisions: Array<Record<string, unknown>>,
            entityId: string,
            stepIndex: number,
            subtypes: string[],
        ) {
            return withdrawPendingDecisionsForStep(
                dossierId,
                decisions,
                plugin,
                entityId,
                subtypes,
            );
        },

        parseEntityIdFromDecision(row: Record<string, unknown>) {
            return parseSeizedEntityIdFromDecision(plugin, row);
        },

        inlineFocusStepForApprovedSubtype(subtype: string): SeizureInlineFocusStep | null {
            const st = String(subtype || '').trim();
            if (st === plugin.expertSubtype || st === plugin.expertCommitteeSubtype) return 'experts';
            if (st === plugin.auctionSubtype) return 'auction';
            if (st === plugin.reauctionDefaultSubtype) return 'reauction_default';
            if (st === plugin.titleTransferSubtype) return 'title_transfer';
            if (st === plugin.buyerDeliverySubtype) return 'buyer_delivery';
            if (st === plugin.proceedsDisburseSubtype) return 'proceeds_disburse';
            return null;
        },

        inlineFocusEventName(): string {
            return ctx.assetKind === 'movable' ? 'hami-movable-inline-focus' : 'hami-property-inline-focus';
        },

        inlineFocusEntityKey(): 'movableId' | 'propertyId' {
            return ctx.assetKind === 'movable' ? 'movableId' : 'propertyId';
        },
    };
}

export type SeizureWorkflowEngine = ReturnType<typeof createSeizureWorkflowEngine>;
