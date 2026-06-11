import type { Creditor, ExecutionFile } from '@/app/types/execution';
import {
    buildScopedPartyDeathPersistPatch,
    getPartyDeathCaseForRole,
} from '@/app/utils/partyDeathCaseScope';

function mergeHeirNameList(...groups: string[][]): string[] {
    const out: string[] = [];
    groups.flat().forEach((n) => {
        const name = String(n || '').trim();
        if (!name || out.includes(name)) return;
        out.push(name);
    });
    return out;
}

function resolveExistingCreditorHeirsFromFile(file: ExecutionFile | null | undefined): {
    names: string[];
    details: Array<{ name: string; phone: string; address: string; isClient?: boolean }>;
} {
    const c0 = file?.creditors?.[0];
    const fromPartyNames = (c0?.heirs || []).filter((s) => /\S/.test(String(s)));
    const deathCase = getPartyDeathCaseForRole(file, 'creditor');
    const fromCaseNames = (deathCase?.heir_names || []).filter((s) => /\S/.test(String(s)));
    const names = mergeHeirNameList(fromPartyNames, fromCaseNames);

    const fromPartyDetails = Array.isArray(c0?.heirs_details)
        ? c0.heirs_details
              .map((h) => ({
                  name: String(h?.name || '').trim(),
                  phone: String(h?.phone || '').trim(),
                  address: String(h?.address || '').trim(),
                  ...(h?.isClient ? { isClient: true as const } : {}),
              }))
              .filter((h) => /\S/.test(h.name))
        : [];
    const fromCaseDetails = Array.isArray(deathCase?.heir_details)
        ? deathCase.heir_details
              .map((h) => ({
                  name: String(h?.name || '').trim(),
                  phone: String(h?.phone || '').trim(),
                  address: String(h?.address || '').trim(),
              }))
              .filter((h) => /\S/.test(h.name))
        : [];

    const map = new Map<string, { name: string; phone: string; address: string; isClient?: boolean }>();
    [...fromPartyDetails, ...fromCaseDetails].forEach((h) => {
        const key = `${h.name.toLowerCase()}|${h.phone}`;
        const prev = map.get(key);
        if (!prev) {
            map.set(key, h);
            return;
        }
        map.set(key, {
            name: h.name || prev.name,
            phone: h.phone || prev.phone,
            address: h.address || prev.address,
            isClient: Boolean(prev.isClient || h.isClient),
        });
    });
    return { names, details: [...map.values()] };
}

/** موافقة المنفذ على «إحلال ورثة الدائن» دون مسح الورثة المسجّلين — الورثة يُكمَلون من النافذة (مثل المدين). */
export function buildExecutionMergeForCreditorHeirSubstitutionApproval(
    file: ExecutionFile | null | undefined,
    creditorNameSnapshot: string
): Record<string, unknown> {
    const creditorsList = [...(file?.creditors || [])];
    const debtorsList = [...(file?.debtors || [])];
    const { names, details } = resolveExistingCreditorHeirsFromFile(file);
    const nameSnapshot = creditorNameSnapshot.trim() || String(creditorsList[0]?.name || '').trim();

    if (creditorsList[0]) {
        creditorsList[0] = {
            ...creditorsList[0],
            type: 'creditor',
            isDeceased: true,
            heirs: names,
            heirs_details: details,
        } as Creditor;
    }

    const creditorCase = {
        deceased_party: 'creditor' as const,
        heir_names: names,
        heir_details: details,
        flow: 'heir_substitution' as const,
        heir_certificate_file_name: null,
    };

    return {
        ...buildScopedPartyDeathPersistPatch(file, 'creditor', creditorCase),
        creditors: creditorsList,
        debtors: debtorsList,
        is_creditor_deceased: true,
        deceased_creditor_legal_name_snapshot:
            nameSnapshot || file?.deceased_creditor_legal_name_snapshot,
    };
}

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

    const applyHeirsToParty = (
        heirs: string[],
        heirDetails?: Array<{ name: string; phone: string; address: string; isClient?: boolean }>
    ) => {
        if (creditorsList[0]) {
            creditorsList[0] = {
                ...creditorsList[0],
                type: 'creditor',
                isDeceased: true,
                heirs,
                ...(heirDetails !== undefined ? { heirs_details: heirDetails } : {}),
            } as Creditor;
        }
    };

    const existingHeirs = resolveExistingCreditorHeirsFromFile(file);

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
    let storedHeirDetails: Array<{ name: string; phone: string; address: string; isClient?: boolean }> =
        [];
    let mergeExtra: Record<string, unknown> = {};

    if (payload.action === 'death_only') {
        applyHeirsToParty([], []);
        flow = 'death_only';
        storedHeirNames = [];
        storedHeirDetails = [];
    } else if (payload.action === 'no_heirs') {
        applyHeirsToParty([], []);
        flow = 'no_heirs';
        storedHeirNames = [];
        storedHeirDetails = [];
        mergeExtra = {
            dossier_lifecycle_status: 'finished' as const,
            dossier_status_reason: closedReason,
            dossier_status_date: now.slice(0, 10),
        };
    } else if (payload.action === 'seek_heir') {
        const finalNames = mergeHeirNameList(existingHeirs.names, heirNamesResolved);
        const finalDetails = existingHeirs.details;
        applyHeirsToParty(finalNames, finalDetails);
        flow = 'heir_substitution';
        storedHeirNames = finalNames;
        storedHeirDetails = finalDetails;
        mergeExtra = {
            dossier_lifecycle_status: 'active' as const,
            dossier_status_reason: '',
            dossier_status_date: '',
        };
    } else {
        const finalNames =
            heirNamesResolved.length > 0
                ? mergeHeirNameList(existingHeirs.names, heirNamesResolved)
                : existingHeirs.names;
        const finalDetails = existingHeirs.details;
        applyHeirsToParty(finalNames, finalDetails);
        flow = 'heir_substitution';
        storedHeirNames = finalNames;
        storedHeirDetails = finalDetails;
    }

    const creditorCase = {
        deceased_party: 'creditor' as const,
        heir_names: storedHeirNames,
        heir_details: flow === 'heir_substitution' ? storedHeirDetails : [],
        flow,
        heir_certificate_file_name: null,
    };

    return {
        ...buildScopedPartyDeathPersistPatch(file, 'creditor', creditorCase),
        creditors: creditorsList,
        debtors: debtorsList,
        ...deceasedFlags,
        ...mergeExtra,
    };
}
