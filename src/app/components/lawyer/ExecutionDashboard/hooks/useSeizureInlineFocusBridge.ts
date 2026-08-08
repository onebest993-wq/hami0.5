import { useEffect, useState } from 'react';
import {
    SEIZURE_INLINE_FOCUS_EVENT,
    executionIdMatchesFocusEvent,
    type SeizureInlineFocusDetail,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';
import {
    dispatchOpenSeizureCompletion,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import {
    clearSeizureInlineFocusSession,
    readSeizureInlineFocusSession,
    writeSeizureInlineFocusSession,
    type SeizureInlineFocusSessionKind,
} from '@/app/domain/seizure/seizureInlineFocusSession';

type UseSeizureInlineFocusBridgeParams = {
    executionIds: readonly string[];
    setAdditionalSeizureExpanded?: (expanded: boolean) => void;
    setMaximumSeizureExpanded?: (expanded: boolean) => void;
};

type GuarantorSeizureInlineDetail = SeizureInlineFocusDetail & {
    kind?: 'salary' | 'movable' | 'property';
};

export function useSeizureInlineFocusBridge({
    executionIds,
    setAdditionalSeizureExpanded,
    setMaximumSeizureExpanded,
}: UseSeizureInlineFocusBridgeParams) {
    const [inlineFocusMovableDecisionId, setInlineFocusMovableDecisionId] = useState<string | null>(null);
    const [inlineFocusPropertyDecisionId, setInlineFocusPropertyDecisionId] = useState<string | null>(null);
    const [inlineFocusThirdPartyDecisionId, setInlineFocusThirdPartyDecisionId] = useState<string | null>(null);

    useEffect(() => {
        const expandSeizureSections = () => {
            setAdditionalSeizureExpanded?.(true);
            setMaximumSeizureExpanded?.(true);
        };

        const applyInlineFocus = (
            kind: SeizureInlineFocusSessionKind,
            executionId: string,
            decisionId: string,
        ) => {
            expandSeizureSections();
            if (kind === 'property') setInlineFocusPropertyDecisionId(decisionId);
            else if (kind === 'movable') setInlineFocusMovableDecisionId(decisionId);
            else setInlineFocusThirdPartyDecisionId(decisionId);
            clearSeizureInlineFocusSession(kind, executionId);
        };

        for (const exId of executionIds) {
            const propertyPending = readSeizureInlineFocusSession('property', exId);
            if (propertyPending?.decisionId) {
                applyInlineFocus('property', exId, propertyPending.decisionId);
            }
            const movablePending = readSeizureInlineFocusSession('movable', exId);
            if (movablePending?.decisionId) {
                applyInlineFocus('movable', exId, movablePending.decisionId);
            }
            const thirdPartyPending = readSeizureInlineFocusSession('third_party', exId);
            if (thirdPartyPending?.decisionId) {
                applyInlineFocus('third_party', exId, thirdPartyPending.decisionId);
            }
        }

        const onMovable = (e: Event) => {
            const ce = e as CustomEvent<SeizureInlineFocusDetail>;
            if (!executionIdMatchesFocusEvent(executionIds, ce.detail?.executionId)) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const exId = String(ce.detail?.executionId || '').trim();
            if (!decisionId || !exId) return;
            writeSeizureInlineFocusSession('movable', exId, decisionId, ce.detail?.subject);
            applyInlineFocus('movable', exId, decisionId);
        };

        const onProperty = (e: Event) => {
            const ce = e as CustomEvent<SeizureInlineFocusDetail>;
            if (!executionIdMatchesFocusEvent(executionIds, ce.detail?.executionId)) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const exId = String(ce.detail?.executionId || '').trim();
            if (!decisionId || !exId) return;
            writeSeizureInlineFocusSession('property', exId, decisionId, ce.detail?.subject);
            applyInlineFocus('property', exId, decisionId);
        };

        const onThirdParty = (e: Event) => {
            const ce = e as CustomEvent<SeizureInlineFocusDetail>;
            if (!executionIdMatchesFocusEvent(executionIds, ce.detail?.executionId)) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const exId = String(ce.detail?.executionId || '').trim();
            if (!decisionId || !exId) return;
            writeSeizureInlineFocusSession('third_party', exId, decisionId, ce.detail?.subject);
            applyInlineFocus('third_party', exId, decisionId);
        };

        const onGuarantorSeizure = (e: Event) => {
            const ce = e as CustomEvent<GuarantorSeizureInlineDetail>;
            if (!executionIdMatchesFocusEvent(executionIds, ce.detail?.executionId)) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const kind = String(ce.detail?.kind || '').trim();
            if (!decisionId || !kind) return;
            expandSeizureSections();
            if (kind === 'property') setInlineFocusPropertyDecisionId(decisionId);
            else if (kind === 'movable') setInlineFocusMovableDecisionId(decisionId);
            else if (kind === 'salary') {
                const exId = String(ce.detail?.executionId || '').trim();
                if (exId) dispatchOpenSeizureCompletion(exId, decisionId);
            }
        };

        window.addEventListener(SEIZURE_INLINE_FOCUS_EVENT.movable, onMovable as EventListener);
        window.addEventListener(SEIZURE_INLINE_FOCUS_EVENT.property, onProperty as EventListener);
        window.addEventListener(SEIZURE_INLINE_FOCUS_EVENT.thirdParty, onThirdParty as EventListener);
        window.addEventListener('hami-focus-guarantor-seizure-inline', onGuarantorSeizure as EventListener);
        return () => {
            window.removeEventListener(SEIZURE_INLINE_FOCUS_EVENT.movable, onMovable as EventListener);
            window.removeEventListener(SEIZURE_INLINE_FOCUS_EVENT.property, onProperty as EventListener);
            window.removeEventListener(SEIZURE_INLINE_FOCUS_EVENT.thirdParty, onThirdParty as EventListener);
            window.removeEventListener('hami-focus-guarantor-seizure-inline', onGuarantorSeizure as EventListener);
        };
    }, [executionIds, setAdditionalSeizureExpanded, setMaximumSeizureExpanded]);

    return {
        inlineFocusMovableDecisionId,
        inlineFocusPropertyDecisionId,
        inlineFocusThirdPartyDecisionId,
    };
}
