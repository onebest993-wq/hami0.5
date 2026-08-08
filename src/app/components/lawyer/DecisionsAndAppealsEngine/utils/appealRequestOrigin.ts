import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';
import { parseDecisionPayloadJson } from './decisionGraphUtils';
import { DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE } from '@/app/utils/otherPartyManualTrackDecisionSource';

export const EXECUTOR_QUEUE_REQUEST_KINDS: NonNullable<Decision['requestKind']>[] = [
    'seizure',
    'eviction_procedure',
    'lawyer_fee_payout',
    'case_expense',
    'trust_disburse',
    'unified_collection',
    'personal_coercive',
    'special_followup',
    'guarantor_request',
    'creditor_party_death',
    'debtor_party_death',
];

export function isDecisionLikeRow(hub: Decision | null | undefined): hub is Decision {
    return Boolean(hub) && typeof hub === 'object';
}

/** يستنتج مصدر الطلب لطلبات المحامي القديمة التي تفتقد appealRequestOrigin */
export function inferDecisionAppealRequestOrigin(
    hub: Decision | null | undefined,
): Decision['appealRequestOrigin'] | undefined {
    if (!isDecisionLikeRow(hub)) return undefined;
    const explicit = hub.appealRequestOrigin;
    if (explicit === 'creditor_side' || explicit === 'debtor_side' || explicit === 'executor_side') {
        return explicit;
    }
    const rk = String(hub.requestKind || '').trim();
    if (rk && (EXECUTOR_QUEUE_REQUEST_KINDS as readonly string[]).includes(rk)) {
        return 'creditor_side';
    }
    const id = String(hub.id || '').trim();
    if (/^(seizure_req_|eviction_req_|enc_req_)/i.test(id)) return 'creditor_side';
    if (rk === 'seizure' || (!rk && /^seizure_req_/i.test(id))) return 'creditor_side';
    return explicit;
}

export function hubWithInferredAppealOrigin(hub: Decision | null | undefined): Decision {
    if (!isDecisionLikeRow(hub)) return {} as Decision;
    const origin = inferDecisionAppealRequestOrigin(hub);
    if (!origin || origin === hub.appealRequestOrigin) return hub;
    return { ...hub, appealRequestOrigin: origin };
}

/** من يقدّم الطلب فعلياً — بمنظور وكيل المدين (لا يعتمد على appealRequestOrigin وحده) */
export function resolveRequestFilerFromDebtorAgentView(
    hub: Decision,
): 'creditor' | 'debtor' | 'executor' {
    if (hub.appealRequestOrigin === 'executor_side') return 'executor';

    const payload = parseDecisionPayloadJson(hub);
    if (payload?.source === DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE) return 'creditor';

    const blob = `${String(hub.title || '')} ${String(hub.body || '')}`;
    if (/وكيل\s*الدائن|تقدّ?م\s+وكيل\s+الدائن|مقدّ?م\s+من\s+الدائن/i.test(blob)) {
        return 'creditor';
    }

    if (hub.requestKind === 'guarantor_request') return 'debtor';

    const origin = hub.appealRequestOrigin ?? inferDecisionAppealRequestOrigin(hub);
    if (origin === 'creditor_side') return 'creditor';
    if (origin === 'debtor_side') {
        if (/تحرك\s*الطرف\s*الآخر|طرف\s*آخر\s*—\s*قيد\s*البت/i.test(blob)) return 'creditor';
        if (/قدم\s+المدين|طلب\s+المدين|موكّ?ل\s*المدين/i.test(blob)) return 'debtor';
        return 'debtor';
    }

    const rk = String(hub.requestKind || '').trim();
    if (rk && (EXECUTOR_QUEUE_REQUEST_KINDS as readonly string[]).includes(rk)) return 'creditor';
    return 'creditor';
}

/** من يقدّم الطلب — مع مراعاة منظور وكيل المدين */
export function resolveRequestProponent(
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent',
): 'creditor' | 'debtor' | 'executor' {
    if (hub.appealRequestOrigin === 'executor_side') return 'executor';
    if (perspective === 'debtor_agent') {
        return resolveRequestFilerFromDebtorAgentView(hub);
    }
    const origin = hub.appealRequestOrigin ?? inferDecisionAppealRequestOrigin(hub);
    if (origin === 'debtor_side') return 'debtor';
    if (origin === 'executor_side') return 'executor';
    return 'creditor';
}

export function isCreditorPartyRequest(
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent',
): boolean {
    return resolveRequestProponent(hub, perspective) === 'creditor';
}

/** طلب مقدّم من الدائن — يشمل مرآة المحضر و`creditor_side` الصريح */
export function isCreditorInitiatedExecutorRequest(hub: Decision): boolean {
    if (resolveRequestFilerFromDebtorAgentView(hub) === 'creditor') return true;
    return isCreditorPartyRequest(hub, 'creditor_agent');
}

/** هل الطلب موضوع مسار طعن الدائن — يشمل مرآة `debtor_side` دون الاعتماد على المنظور وحده */
export function isCreditorExecutorAppealSubject(
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent',
): boolean {
    if (isCreditorInitiatedExecutorRequest(hub)) return true;
    return resolveRequestProponent(hub, perspective) === 'creditor';
}
