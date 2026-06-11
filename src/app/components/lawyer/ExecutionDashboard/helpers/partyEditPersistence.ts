import type { Creditor, Debtor, ExecutionFile, Party } from '@/app/types/execution';
import {
    buildScopedPartyDeathPersistPatch,
    getPartyDeathCaseForRole,
} from '@/app/utils/partyDeathCaseScope';
import type { HeirDetailRow } from '../helpers';

export type PartyEditTargetState = {
    kind: 'creditor' | 'debtor';
    index: number;
    partyId: string;
};

export type PartyEditDraftState = {
    name: string;
    phone: string;
    address: string;
    heirs: HeirDetailRow[];
    lockBaseInfo: boolean;
    includeHeirsInForm?: boolean;
};

export function getPartyListFromFile(
    file: ExecutionFile | null | undefined,
    kind: 'creditor' | 'debtor',
): Array<Creditor | Debtor> {
    if (!file) return [];
    const raw = kind === 'creditor' ? file.creditors : file.debtors;
    return Array.isArray(raw) ? [...raw] : [];
}

export function resolvePartyIndexInList(
    list: Array<{ id?: unknown }>,
    index: number,
    party?: { id?: unknown } | null,
): number {
    if (party) {
        const pid = party.id != null ? String(party.id).trim() : '';
        if (pid) {
            const byId = list.findIndex((p) => String(p.id ?? '') === pid);
            if (byId >= 0) return byId;
        }
        const byRef = list.findIndex((p) => p === party);
        if (byRef >= 0) return byRef;
    }
    return index >= 0 && index < list.length ? index : -1;
}

function applyDraftToPartyRow<T extends Creditor | Debtor>(
    prev: T,
    draft: PartyEditDraftState,
    allowHeirEdit: boolean,
): T {
    const heirs = allowHeirEdit
        ? draft.heirs.map((h) => String(h?.name || '').trim()).filter((h) => /\S/.test(h))
        : prev.heirs || [];
    const heirs_details = allowHeirEdit
        ? draft.heirs
              .filter((h) => /\S/.test(String(h?.name || '').trim()))
              .map((h) => ({
                  name: String(h.name || '').trim(),
                  phone: String(h.phone || '').trim(),
                  address: String(h.address || '').trim(),
                  isClient: Boolean(h.isClient),
              }))
        : Array.isArray((prev as T & { heirs_details?: HeirDetailRow[] }).heirs_details)
          ? (prev as T & { heirs_details?: HeirDetailRow[] }).heirs_details
          : [];

    const nextName = draft.lockBaseInfo ? prev.name : draft.name;
    const nextPhone = draft.lockBaseInfo ? prev.phone : draft.phone;
    const nextAddress = draft.lockBaseInfo ? prev.address : draft.address;
    const prevFullName = (prev as { fullName?: string }).fullName;

    return {
        ...prev,
        name: nextName,
        fullName: draft.lockBaseInfo ? prevFullName ?? prev.name : nextName,
        phone: nextPhone,
        address: nextAddress,
        heirs,
        heirs_details,
    } as T;
}

function syncPartyDeathCaseHeirsInPatch(
    base: ExecutionFile,
    kind: 'creditor' | 'debtor',
    row: Creditor | Debtor,
    patch: Record<string, unknown>
): Record<string, unknown> {
    const existing = getPartyDeathCaseForRole(base, kind);
    const markedDeceased =
        kind === 'creditor' ? base.is_creditor_deceased === true : base.is_debtor_deceased === true;
    if (!existing && !markedDeceased && !row.isDeceased) return patch;

    const heir_names = (row.heirs || []).map((s) => String(s).trim()).filter((s) => /\S/.test(s));
    const heirs_details = Array.isArray(
        (row as Creditor & { heirs_details?: HeirDetailRow[] }).heirs_details
    )
        ? (row as Creditor & { heirs_details?: HeirDetailRow[] }).heirs_details!.map((h) => ({
              name: String(h.name || '').trim(),
              phone: String(h.phone || '').trim(),
              address: String(h.address || '').trim(),
              isClient: Boolean(h.isClient),
          }))
        : [];

    const flow = existing?.flow ?? (heir_names.length > 0 ? 'heir_substitution' : 'death_only');

    return {
        ...patch,
        ...buildScopedPartyDeathPersistPatch(base, kind, {
            deceased_party: kind,
            heir_names,
            heir_details: heirs_details,
            flow,
            heir_certificate_file_name: existing?.heir_certificate_file_name ?? null,
        }),
    };
}

/** يبني patch دمج يحدّث creditors/debtors والحقول القديمة creditor/debtor/parties حتى لا يُستبدل التعديل عند التطبيع */
export function buildPartyEditPersistPatch(
    base: ExecutionFile,
    target: PartyEditTargetState,
    draft: PartyEditDraftState,
): Record<string, unknown> | null {
    const allowHeirEdit = Boolean(draft.includeHeirsInForm);
    const list =
        target.kind === 'creditor'
            ? getPartyListFromFile(base, 'creditor')
            : getPartyListFromFile(base, 'debtor');

    let i = target.index;
    if (target.partyId) {
        const byId = list.findIndex((p) => String(p.id ?? '') === target.partyId);
        if (byId >= 0) i = byId;
    }
    if (i < 0 || !list[i]) return null;

    if (target.kind === 'creditor') {
        const arr = list as Creditor[];
        arr[i] = applyDraftToPartyRow(arr[i], draft, allowHeirEdit);
        const patch: Record<string, unknown> = { creditors: arr };
        const row = arr[i];
        const syncPartyFields = (p: Party) => ({
            ...p,
            name: row.name,
            fullName: row.name,
            phone: row.phone ?? '',
            address: row.address ?? '',
            heirs: row.heirs,
            heirs_details: (row as Creditor & { heirs_details?: HeirDetailRow[] }).heirs_details,
        });
        if (i === 0) {
            const legacy = base.creditor;
            if (legacy && typeof legacy === 'object') {
                patch.creditor = { ...legacy, ...syncPartyFields(legacy as Party) };
            }
            if (typeof (base as { clientName?: unknown }).clientName === 'string') {
                patch.clientName = row.name;
            }
        }
        if (Array.isArray(base.parties) && base.parties.length > 0) {
            patch.parties = base.parties.map((p) =>
                p.role === 'الدائن' && (i === 0 || String(p.id ?? '') === target.partyId)
                    ? syncPartyFields(p)
                    : p
            );
        }
        return allowHeirEdit ? syncPartyDeathCaseHeirsInPatch(base, 'creditor', row, patch) : patch;
    }

    const arr = list as Debtor[];
    arr[i] = applyDraftToPartyRow(arr[i], draft, allowHeirEdit);
    const patch: Record<string, unknown> = { debtors: arr };
    const row = arr[i];
    const syncPartyFields = (p: Party) => ({
        ...p,
        name: row.name,
        fullName: row.name,
        phone: row.phone ?? '',
        address: row.address ?? '',
        heirs: row.heirs,
        heirs_details: (row as Debtor & { heirs_details?: HeirDetailRow[] }).heirs_details,
    });
    if (i === 0) {
        const legacy = base.debtor;
        if (legacy && typeof legacy === 'object') {
            patch.debtor = { ...legacy, ...syncPartyFields(legacy as Party) };
        }
        if (typeof (base as { opponentName?: unknown }).opponentName === 'string') {
            patch.opponentName = row.name;
        }
    }
    if (Array.isArray(base.parties) && base.parties.length > 0) {
        patch.parties = base.parties.map((p) =>
            p.role === 'المدين' && (i === 0 || String(p.id ?? '') === target.partyId)
                ? syncPartyFields(p)
                : p
        );
    }
    return allowHeirEdit ? syncPartyDeathCaseHeirsInPatch(base, 'debtor', row, patch) : patch;
}
