import type { Creditor, ExecutionFile } from '@/app/types/execution';

export type CreditorPartyDeathStoredAction = 'death_only' | 'no_heirs' | 'heir_substitution' | 'seek_heir';

export interface CreditorPartyDeathStoredPayload {
    action: CreditorPartyDeathStoredAction;
    creditorNameSnapshot: string;
    heir_names: string[];
}

const PAYLOAD_VERSION = 1;

export function stringifyCreditorPartyDeathPayload(p: CreditorPartyDeathStoredPayload): string {
    return JSON.stringify({ v: PAYLOAD_VERSION, ...p });
}

/** نص يُعرَض في بطاقة «القرارات والطعون» بدل سلسلة JSON */
export function formatCreditorPartyDeathSummaryAr(p: CreditorPartyDeathStoredPayload): string {
    const name = p.creditorNameSnapshot.trim() || 'الدائن';
    const heirs = p.heir_names.filter((s) => /\S/.test(String(s)));
    switch (p.action) {
        case 'death_only':
            return `إبلاغ وفاة الدائن: ${name}.`;
        case 'no_heirs':
            return `وفاة الدائن ${name} دون ورثة — طلب إغلاق الإضبارة بعد موافقة المنفذ.`;
        case 'heir_substitution':
            return heirs.length > 0
                ? `طلب إحلال الورثة محل الدائن المتوفى: ${name}.\nالأسماء المقترحة: ${heirs.join('، ')}.`
                : `طلب إحلال الورثة محل الدائن المتوفى: ${name}.`;
        case 'seek_heir':
            return heirs.length > 0
                ? `تسجيل وريث بعد مسار «دون ورثة»: ${name}.\nالأسماء: ${heirs.join('، ')}.`
                : `تسجيل وريث بعد مسار «دون ورثة»: ${name}.`;
        default:
            return '';
    }
}

export function parseCreditorPartyDeathPayload(body: string): CreditorPartyDeathStoredPayload | null {
    try {
        const o = JSON.parse(body) as {
            v?: number;
            action?: string;
            creditorNameSnapshot?: string;
            heir_names?: unknown;
        };
        if (o?.v !== PAYLOAD_VERSION || !o.action) return null;
        const a = o.action as CreditorPartyDeathStoredAction;
        if (!['death_only', 'no_heirs', 'heir_substitution', 'seek_heir'].includes(a)) return null;
        const heirs = Array.isArray(o.heir_names)
            ? o.heir_names.map((x) => String(x)).filter((s) => /\S/.test(s))
            : [];
        return {
            action: a,
            creditorNameSnapshot: String(o.creditorNameSnapshot || '').trim(),
            heir_names: heirs,
        };
    } catch {
        return null;
    }
}

/**
 * نفس أثر handlePartyDeathSave للدائن — يُستدعى بعد موافقة المنفذ في مركز القرارات.
 */
export function buildExecutionMergeForCreditorPartyDeath(
    file: ExecutionFile | null | undefined,
    payload: CreditorPartyDeathStoredPayload
): Record<string, unknown> {
    const creditorsList = [...(file?.creditors || [])];
    const debtorsList = [...(file?.debtors || [])];
    const nameSnapshot = payload.creditorNameSnapshot;

    const heirNamesResolved =
        payload.action === 'heir_substitution' || payload.action === 'seek_heir'
            ? payload.heir_names.filter((s) => /\S/.test(String(s)))
            : [];

    const applyHeirsToParty = (heirs: string[]) => {
        if (creditorsList[0]) {
            creditorsList[0] = {
                ...creditorsList[0],
                type: 'creditor',
                isDeceased: true,
                heirs,
            } as Creditor;
        }
    };

    const deceasedFlags = {
        is_debtor_deceased: file?.is_debtor_deceased,
        is_creditor_deceased: true,
        deceased_debtor_legal_name_snapshot: file?.deceased_debtor_legal_name_snapshot,
        deceased_creditor_legal_name_snapshot:
            nameSnapshot || file?.deceased_creditor_legal_name_snapshot,
    };

    const now = new Date().toISOString();
    const closedReason = 'وفاة الدائن دون ورثة — إغلاق الإضبارة';

    let flow: 'no_heirs' | 'heir_substitution' | 'death_only';
    let storedHeirNames: string[];
    let mergeExtra: Record<string, unknown> = {};

    if (payload.action === 'death_only') {
        applyHeirsToParty([]);
        flow = 'death_only';
        storedHeirNames = [];
    } else if (payload.action === 'no_heirs') {
        applyHeirsToParty([]);
        flow = 'no_heirs';
        storedHeirNames = [];
        mergeExtra = {
            dossier_lifecycle_status: 'finished' as const,
            dossier_status_reason: closedReason,
            dossier_status_date: now.slice(0, 10),
        };
    } else if (payload.action === 'seek_heir') {
        applyHeirsToParty(heirNamesResolved);
        flow = 'heir_substitution';
        storedHeirNames = heirNamesResolved;
        mergeExtra = {
            dossier_lifecycle_status: 'active' as const,
            dossier_status_reason: '',
            dossier_status_date: '',
        };
    } else {
        applyHeirsToParty(heirNamesResolved);
        flow = 'heir_substitution';
        storedHeirNames = heirNamesResolved;
    }

    return {
        party_death_case: {
            deceased_party: 'creditor' as const,
            heir_names: storedHeirNames,
            flow,
            heir_certificate_file_name: null,
        },
        creditors: creditorsList,
        debtors: debtorsList,
        dossier_heirs_list: storedHeirNames,
        ...deceasedFlags,
        ...mergeExtra,
    };
}
