import { useCallback, useState } from 'react';
import type { Decision } from '../../types';
import { propertyStepFromSubtype } from './decisionCardFollowupDerived';

export function useDecisionCardSeizureCompletionAction(
    decision: Decision,
    executionId: string | undefined,
    seizureSubtype: string,
) {
    const [seizureCompletionBusy, setSeizureCompletionBusy] = useState(false);

    const runSeizureCompletion = useCallback(() => {
        if (seizureCompletionBusy) return;
        setSeizureCompletionBusy(true);
        try {
            const step = propertyStepFromSubtype(seizureSubtype);
            if (step === 'init') {
                window.dispatchEvent(
                    new CustomEvent('hami-open-seized-property-init', {
                        detail: { executionId, decisionId: decision.id },
                    }),
                );
            } else if (seizureSubtype === 'movable_auction') {
                window.dispatchEvent(
                    new CustomEvent('hami-open-seized-movable-init', {
                        detail: { executionId, decisionId: decision.id },
                    }),
                );
            } else if (step) {
                let seizedPropertyId = '';
                const rawJson = String((decision as { seizurePayloadJson?: string }).seizurePayloadJson || '').trim();
                if (rawJson) {
                    try {
                        const v = JSON.parse(rawJson) as { seizedPropertyId?: string };
                        seizedPropertyId = String(v?.seizedPropertyId ?? '').trim();
                    } catch {
                        /* ignore */
                    }
                }
                window.dispatchEvent(
                    new CustomEvent('hami-open-seized-property-step', {
                        detail: {
                            executionId,
                            decisionId: decision.id,
                            seizedPropertyId,
                            step,
                        },
                    }),
                );
            } else if (
                seizureSubtype === 'movable_expert' ||
                seizureSubtype === 'movable_expert_committee' ||
                seizureSubtype === 'movable_auction_date' ||
                seizureSubtype === 'movable_reauction_default'
            ) {
                let seizedMovableId = '';
                const rawJson = String((decision as { seizurePayloadJson?: string }).seizurePayloadJson || '').trim();
                if (rawJson) {
                    try {
                        const v = JSON.parse(rawJson) as { seizedMovableId?: string };
                        seizedMovableId = String(v?.seizedMovableId ?? '').trim();
                    } catch {
                        /* ignore */
                    }
                }
                const movableStep =
                    seizureSubtype === 'movable_expert' || seizureSubtype === 'movable_expert_committee'
                        ? 'experts'
                        : seizureSubtype === 'movable_auction_date'
                          ? 'auction'
                          : 'reauction_default';
                window.dispatchEvent(
                    new CustomEvent('hami-open-seized-movable-step', {
                        detail: {
                            executionId,
                            decisionId: decision.id,
                            seizedMovableId,
                            step: movableStep,
                        },
                    }),
                );
            } else {
                window.dispatchEvent(
                    new CustomEvent('hami-open-seizure-completion', {
                        detail: { executionId, decisionId: decision.id },
                    }),
                );
            }
        } catch {
            /* ignore */
        }
        setSeizureCompletionBusy(false);
    }, [decision, executionId, seizureCompletionBusy, seizureSubtype]);

    return { seizureCompletionBusy, runSeizureCompletion };
}
