import type { SeizureInlineFocusStep } from './seizureWorkflowTypes';
import { getSeizureAssetPlugin } from './seizureAssetPlugins';
import type { SeizureAssetKind } from './seizureWorkflowTypes';

/** يحدّد خطوة inline بعد موافقة المنفذ — بديل منظم لمنطق seizureDecisionOutcomeHandler */
export function resolveInlineFocusAfterApproval(
    assetKind: SeizureAssetKind,
    subtype: string,
): SeizureInlineFocusStep | null {
    const plugin = getSeizureAssetPlugin(assetKind);
    const st = String(subtype || '').trim();
    if (st === plugin.expertSubtype || st === plugin.expertCommitteeSubtype) return 'experts';
    if (st === plugin.auctionSubtype) return 'auction';
    if (st === plugin.reauctionDefaultSubtype) return 'reauction_default';
    if (plugin.titleTransferSubtype && st === plugin.titleTransferSubtype) return 'title_transfer';
    if (st === plugin.buyerDeliverySubtype) return 'buyer_delivery';
    if (st === plugin.proceedsDisburseSubtype) return 'proceeds_disburse';
    return null;
}

export function dispatchSeizureInlineFocus(input: {
    assetKind: SeizureAssetKind;
    executionId: string;
    entityId: string;
    step: SeizureInlineFocusStep;
    decisionId: string;
}): void {
    const eventName =
        input.assetKind === 'movable' ? 'hami-movable-inline-focus' : 'hami-property-inline-focus';
    const entityKey = input.assetKind === 'movable' ? 'movableId' : 'propertyId';
    try {
        window.dispatchEvent(
            new CustomEvent(eventName, {
                detail: {
                    executionId: input.executionId,
                    [entityKey]: input.entityId,
                    step: input.step,
                    decisionId: input.decisionId,
                },
            }),
        );
    } catch {
        /* ignore */
    }
}

export function inferSeizureAssetKindFromSubtype(subtype: string): SeizureAssetKind | null {
    const st = String(subtype || '').trim();
    if (st.startsWith('movable')) return 'movable';
    if (st.startsWith('property')) return 'property';
    return null;
}
