import { SEIZURE_INLINE_FOCUS_EVENT } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';
import { inferSeizureSubtypeFromDecisionText, type SeizureSimpleKind } from './seizureSimpleKindPlugins';

export type SeizureOutcomeFocusDispatch = {
    executionId: string;
    decisionId: string;
    subject?: string;
};

export function dispatchSimpleSeizureInlineFocus(
    kind: SeizureSimpleKind,
    detail: SeizureOutcomeFocusDispatch,
): void {
    const eventName =
        kind === 'third_party'
            ? SEIZURE_INLINE_FOCUS_EVENT.thirdParty
            : kind === 'notice'
              ? SEIZURE_INLINE_FOCUS_EVENT.notice
              : 'hami-focus-salary-seizure-inline';
    try {
        window.dispatchEvent(
            new CustomEvent(eventName, {
                detail: {
                    executionId: detail.executionId,
                    decisionId: detail.decisionId,
                    subject: detail.subject,
                },
            }),
        );
    } catch {
        /* ignore */
    }
}

export function dispatchGuarantorSeizureInlineFocus(
    detail: SeizureOutcomeFocusDispatch & {
        kind: 'salary' | 'movable' | 'property';
    },
): void {
    try {
        window.dispatchEvent(
            new CustomEvent('hami-focus-guarantor-seizure-inline', {
                detail: {
                    executionId: detail.executionId,
                    decisionId: detail.decisionId,
                    kind: detail.kind,
                },
            }),
        );
    } catch {
        /* ignore */
    }
}

export type ResolvedSeizureOutcomeRow = {
    decisionRow: Record<string, unknown>;
    subtype: string;
    requestKind: string;
    savedAtEarly: string;
    seizedPropertyId: string;
    seizedMovableId: string;
    movableDescription: string;
    movableLocation: string;
    judicialCustodianName: string;
};

export function resolveSeizureOutcomeRow(
    decisionRow: Record<string, unknown>,
): ResolvedSeizureOutcomeRow {
    let subtype = String(decisionRow?.seizureSubtype || '').trim();
    const decisionText = `${String(decisionRow?.title || '')}\n${String(decisionRow?.body || '')}`;
    if (!subtype) {
        subtype = inferSeizureSubtypeFromDecisionText(decisionText);
    }

    const rawJson = String(decisionRow?.seizurePayloadJson || '').trim();
    let seizedPropertyId = '';
    let seizedMovableId = '';
    let movableDescription = '';
    let movableLocation = '';
    let judicialCustodianName = '';
    if (rawJson) {
        try {
            const v = JSON.parse(rawJson) as Record<string, unknown>;
            seizedPropertyId = String(v?.seizedPropertyId ?? '').trim();
            seizedMovableId = String(v?.seizedMovableId ?? '').trim();
            movableDescription = String(v?.movableDescription ?? '').trim();
            movableLocation = String(v?.movableLocation ?? '').trim();
            judicialCustodianName = String(v?.judicialCustodianName ?? '').trim();
        } catch {
            /* ignore */
        }
    }

    return {
        decisionRow,
        subtype,
        requestKind: String(decisionRow?.requestKind ?? '').trim(),
        savedAtEarly: String(decisionRow?.seizureRequestSavedAt || '').trim(),
        seizedPropertyId,
        seizedMovableId,
        movableDescription,
        movableLocation,
        judicialCustodianName,
    };
}
