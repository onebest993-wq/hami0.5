import {
    formatCreditorPartyDeathSummaryAr,
    stringifyCreditorPartyDeathPayload,
    type CreditorPartyDeathStoredAction,
    type CreditorPartyDeathStoredPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import type { ExecutorDecisionRowLite } from '@/app/utils/executorDecisionSelectors';

export type DebtorPartyDeathStoredPayload = {
    action: 'heir_substitution';
    debtorNameSnapshot: string;
    heir_names: string[];
};

type ExecutorHubDecisionRow = ExecutorDecisionRowLite & {
    status: 'pending';
    appealPhase: null;
    appealStatus: 'pending';
    executorOutcome: 'pending';
};

function buildExecutorDecisionRowHubDefaults(): { status: 'pending'; appealPhase: null } {
    return { status: 'pending', appealPhase: null };
}

function normalizeHeirNames(heirNames: string[]): string[] {
    return heirNames.map((name) => String(name || '').trim()).filter(Boolean);
}

export function creditorPartyDeathDecisionTitle(action: CreditorPartyDeathStoredAction): string {
    switch (action) {
        case 'death_only':
            return 'طلب — إبلاغ وفاة الدائن';
        case 'no_heirs':
            return 'طلب — وفاة الدائن دون ورثة وإغلاق الإضبارة';
        case 'heir_substitution':
            return 'طلب — إحلال الورثة محل الدائن المتوفى';
        case 'seek_heir':
            return 'طلب — تسجيل وريث بعد مسار دون ورثة';
        default:
            return 'طلب — وفاة الدائن / إحلال الورثة';
    }
}

export function parseDebtorPartyDeathPayload(raw: string): DebtorPartyDeathStoredPayload | null {
    const text = String(raw || '').trim();
    if (!text) return null;
    try {
        const payload = JSON.parse(text) as {
            action?: string;
            debtorNameSnapshot?: string;
            heir_names?: unknown;
        };
        if (payload?.action !== 'heir_substitution') return null;
        return {
            action: 'heir_substitution',
            debtorNameSnapshot: String(payload.debtorNameSnapshot || '').trim(),
            heir_names: Array.isArray(payload.heir_names)
                ? payload.heir_names.map((entry) => String(entry || '').trim()).filter(Boolean)
                : [],
        };
    } catch {
        return null;
    }
}

export function stringifyDebtorPartyDeathPayload(payload: DebtorPartyDeathStoredPayload): string {
    return JSON.stringify({
        action: 'heir_substitution',
        debtorNameSnapshot: String(payload.debtorNameSnapshot || '').trim(),
        heir_names: normalizeHeirNames(payload.heir_names),
    });
}

export function buildCreditorPartyDeathDecisionRow(input: {
    decisionId: string;
    action: CreditorPartyDeathStoredAction;
    creditorNameSnapshot: string;
    heirNames: string[];
    date: string;
}): ExecutorHubDecisionRow & {
    requestKind: 'creditor_party_death';
    appealRequestOrigin: 'creditor_side';
    creditorPartyDeathPayloadJson: string;
} {
    const payload: CreditorPartyDeathStoredPayload = {
        action: input.action,
        creditorNameSnapshot: String(input.creditorNameSnapshot || '').trim(),
        heir_names: normalizeHeirNames(input.heirNames),
    };
    return {
        id: input.decisionId,
        title: creditorPartyDeathDecisionTitle(input.action),
        body: formatCreditorPartyDeathSummaryAr(payload),
        creditorPartyDeathPayloadJson: stringifyCreditorPartyDeathPayload(payload),
        date: input.date,
        appealStatus: 'pending',
        executorOutcome: 'pending',
        requestKind: 'creditor_party_death',
        appealRequestOrigin: 'creditor_side',
        ...buildExecutorDecisionRowHubDefaults(),
    };
}

export function buildDebtorHeirSubstitutionDecisionRow(input: {
    decisionId: string;
    debtorNameSnapshot: string;
    date: string;
}): ExecutorHubDecisionRow & {
    requestKind: 'debtor_party_death';
    appealRequestOrigin: 'creditor_side';
    debtorPartyDeathPayloadJson: string;
} {
    const payload: DebtorPartyDeathStoredPayload = {
        action: 'heir_substitution',
        debtorNameSnapshot: String(input.debtorNameSnapshot || '').trim(),
        heir_names: [],
    };
    return {
        id: input.decisionId,
        title: 'طلب — إحلال الورثة محل المدين المتوفى',
        body: `المدين: ${payload.debtorNameSnapshot || 'المدين'}.`,
        debtorPartyDeathPayloadJson: stringifyDebtorPartyDeathPayload(payload),
        date: input.date,
        appealStatus: 'pending',
        executorOutcome: 'pending',
        requestKind: 'debtor_party_death',
        appealRequestOrigin: 'creditor_side',
        ...buildExecutorDecisionRowHubDefaults(),
    };
}
