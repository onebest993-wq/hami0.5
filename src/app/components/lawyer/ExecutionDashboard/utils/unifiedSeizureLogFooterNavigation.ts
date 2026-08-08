import {
    openFollowupSeizureRequestsModal,
    type OpenFollowupModalLegacyFallback,
    type OpenFollowupModalPersistedFn,
} from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalOpen';
import { SEIZURE_CLOSE_UNIFIED_LOG_EVENT, SEIZURE_INLINE_FOCUS_EVENT } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';
import {
    dispatchGuarantorSeizureInlineFocusRoute,
    dispatchOpenSeizureCompletion,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import {
    writeSeizureInlineFocusSession,
    type SeizureInlineFocusSessionKind,
} from '@/app/domain/seizure/seizureInlineFocusSession';

export const UNIFIED_SEIZURE_LOG_FOOTER_ACTION_EVENT = 'hami-unified-seizure-log-footer-action';

export type UnifiedSeizureLogFooterActionKind =
    | 'property'
    | 'third_party'
    | 'salary_completion'
    | 'guarantor';

export type UnifiedSeizureLogFooterActionDetail = {
    executionId: string;
    decisionId: string;
    kind: UnifiedSeizureLogFooterActionKind;
    subject?: string;
    guarantorFocusKind?: 'salary' | 'movable' | 'property';
};

function dispatchWindowEvent(eventName: string, detail: Record<string, unknown>): void {
    try {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch {
        /* ignore */
    }
}

function inlineFocusKindForFooterAction(
    kind: UnifiedSeizureLogFooterActionKind,
): SeizureInlineFocusSessionKind | null {
    if (kind === 'property') return 'property';
    if (kind === 'third_party') return 'third_party';
    return null;
}

export function runUnifiedSeizureLogFooterNavigation(
    detail: UnifiedSeizureLogFooterActionDetail,
    legacy?: OpenFollowupModalLegacyFallback,
    openFollowupModalPersisted?: OpenFollowupModalPersistedFn | null,
): void {
    const exId = String(detail.executionId || '').trim();
    const did = String(detail.decisionId || '').trim();
    const kind = detail.kind;
    if (!exId || !did || !kind) return;

    dispatchWindowEvent(SEIZURE_CLOSE_UNIFIED_LOG_EVENT, { executionId: exId });
    openFollowupSeizureRequestsModal(openFollowupModalPersisted, legacy);

    const inlineKind = inlineFocusKindForFooterAction(kind);
    if (inlineKind) {
        writeSeizureInlineFocusSession(inlineKind, exId, did, detail.subject);
        const eventName =
            inlineKind === 'property'
                ? SEIZURE_INLINE_FOCUS_EVENT.property
                : inlineKind === 'third_party'
                  ? SEIZURE_INLINE_FOCUS_EVENT.thirdParty
                  : SEIZURE_INLINE_FOCUS_EVENT.movable;
        dispatchWindowEvent(eventName, {
            executionId: exId,
            decisionId: did,
            subject: detail.subject || '',
        });
        return;
    }

    if (kind === 'salary_completion') {
        dispatchOpenSeizureCompletion(exId, did);
        return;
    }

    if (kind === 'guarantor') {
        const focusKind = detail.guarantorFocusKind || 'salary';
        dispatchGuarantorSeizureInlineFocusRoute(exId, did, focusKind, detail.subject || '');
    }
}

export function dispatchUnifiedSeizureLogFooterAction(
    detail: UnifiedSeizureLogFooterActionDetail,
): void {
    const exId = String(detail.executionId || '').trim();
    const did = String(detail.decisionId || '').trim();
    if (!exId || !did || !detail.kind) return;
    try {
        window.dispatchEvent(
            new CustomEvent(UNIFIED_SEIZURE_LOG_FOOTER_ACTION_EVENT, {
                detail: {
                    executionId: exId,
                    decisionId: did,
                    kind: detail.kind,
                    subject: detail.subject || '',
                    guarantorFocusKind: detail.guarantorFocusKind,
                },
            }),
        );
    } catch {
        /* ignore */
    }
}
