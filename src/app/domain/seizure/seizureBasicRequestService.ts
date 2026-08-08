import { appendPendingExecutorSeizureDecision } from '@/app/utils/executorSeizureDecisionQueue';
import {
    isInvalidSeizureWorkflowDossierId,
    resolveSeizureWorkflowDossierId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureWorkflowDossierUtils';
import { isDecisionPending } from './seizureWorkflowStatus';
import type { SeizureBasicRequestInput, SeizureBasicRequestResult } from './seizureSimpleKindPlugins';

export function findPendingSeizureDecisionBySubtype(
    decisions: Array<Record<string, unknown>>,
    subtype: string,
): Record<string, unknown> | null {
    const st = String(subtype || '').trim();
    if (!st) return null;
    const hits = decisions.filter((r) => {
        if (String(r?.requestKind || '') !== 'seizure') return false;
        if (String(r?.seizureSubtype || '').trim() !== st) return false;
        return isDecisionPending(r);
    });
    if (!hits.length) return null;
    return hits.reduce((acc, cur) => {
        const a = String(
            (acc as { resolvedAt?: string; date?: string }).resolvedAt ??
                (acc as { date?: string }).date ??
                '',
        );
        const b = String(
            (cur as { resolvedAt?: string; date?: string }).resolvedAt ??
                (cur as { date?: string }).date ??
                '',
        );
        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
    }, hits[0]!);
}

/** إرسال طلب حجز بسيط (راتب / غير / إشارة / مبدئي) عبر dossier موحّد */
export function submitBasicSeizurePendingRequest(
    input: SeizureBasicRequestInput,
): SeizureBasicRequestResult {
    const dossierId = resolveSeizureWorkflowDossierId(input.dossierInput);
    if (isInvalidSeizureWorkflowDossierId(dossierId)) {
        return { ok: false, decisionId: null, error: 'invalid_dossier' };
    }
    const subtype = String(input.subtype || '').trim();
    const decisions = input.decisions ?? [];
    if (decisions.length && findPendingSeizureDecisionBySubtype(decisions, subtype)) {
        return { ok: false, decisionId: null, dossierId, error: 'duplicate' };
    }
    const payloadJson =
        input.payloadExtra && Object.keys(input.payloadExtra).length
            ? JSON.stringify(input.payloadExtra)
            : undefined;
    const decisionId = appendPendingExecutorSeizureDecision({
        executionId: dossierId,
        requestTitle: `${input.title} — قيد البت لدى المنفذ`,
        requestBody: input.body,
        seizureSubtype: subtype as never,
        ...(payloadJson ? { seizurePayloadJson: payloadJson } : {}),
    });
    if (!decisionId) {
        return { ok: false, decisionId: null, dossierId, error: 'duplicate' };
    }
    return { ok: true, decisionId, dossierId };
}

export function resolveSeizureDossierId(input: SeizureBasicRequestInput['dossierInput']): string {
    return resolveSeizureWorkflowDossierId(input);
}
