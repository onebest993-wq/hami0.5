import type { Creditor, Debtor, ExecutionFile, Party } from '@/app/types/execution';
import { resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';
import { getExecutionPartyDisplayName } from '@/app/utils/partyDisplayName';
import { isPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';

export type DossierPartyNameField = {
    key: string;
    label: string;
    kind: 'creditor' | 'debtor';
};

type LegacyPartyFile = ExecutionFile & {
    creditor?: Party;
    debtor?: Party;
    clientName?: string;
    opponentName?: string;
};

function partyList<T>(value: unknown): T[] {
    return Array.isArray(value) ? ([...value] as T[]) : [];
}

function countOrOne(raw: unknown): number {
    const n = Math.max(0, Number(raw || 0) || 0);
    return Math.max(1, n);
}

function legacyCreditorName(file: LegacyPartyFile | null | undefined): string {
    if (!file) return '';
    return resolvePartyStoredName(file.creditor) || String(file.clientName ?? '').trim();
}

function legacyDebtorName(file: LegacyPartyFile | null | undefined): string {
    if (!file) return '';
    return resolvePartyStoredName(file.debtor) || String(file.opponentName ?? '').trim();
}

function isDossierPartyDeceased(
    file: ExecutionFile | null | undefined,
    role: 'creditor' | 'debtor',
    row: { isDeceased?: boolean } | null | undefined,
    index: number,
): boolean {
    if (row?.isDeceased === true) return true;
    if (index !== 0) return false;
    if (role === 'creditor' && file?.is_creditor_deceased === true) return true;
    if (role === 'debtor' && file?.is_debtor_deceased === true) return true;
    return isPartyDeathCaseForRole(file, role);
}

function deceasedDraftKey(kind: 'creditor' | 'debtor', index: number): string {
    return `${kind}Deceased:${index}`;
}

function isDeceasedInDraft(
    draft: Record<string, string>,
    kind: 'creditor' | 'debtor',
    index: number,
): boolean {
    return draft[deceasedDraftKey(kind, index)] === '1';
}

function genericRoleFallback(role: 'creditor' | 'debtor'): string {
    return role === 'creditor' ? 'الدائن' : 'المدين';
}

function resolveEditablePartyName(
    file: ExecutionFile | null | undefined,
    role: 'creditor' | 'debtor',
    row: unknown,
    index: number,
): string {
    const stored = resolvePartyStoredName(row);
    if (stored) return stored;
    if (index !== 0) return '';
    const legacy = role === 'creditor' ? legacyCreditorName(file as LegacyPartyFile) : legacyDebtorName(file as LegacyPartyFile);
    if (legacy) return legacy;
    const display = getExecutionPartyDisplayName(row as Party | undefined, role, index, file).baseName;
    if (display && display !== genericRoleFallback(role)) return display;
    return '';
}

export function mergeIncomingDossierMetaDraft(
    current: Record<string, string>,
    incoming: Record<string, string>,
): Record<string, string> {
    let changed = false;
    const next = { ...current };
    for (const [key, value] of Object.entries(incoming)) {
        if (!(key in next)) {
            next[key] = value;
            changed = true;
            continue;
        }
        const incomingText = String(value ?? '');
        const currentText = String(next[key] ?? '');
        if (!incomingText.trim() || currentText.trim()) continue;
        next[key] = incomingText;
        changed = true;
    }
    return changed ? next : current;
}

function writePartyNameDraft(
    next: Record<string, string>,
    kind: 'creditor' | 'debtor',
    index: number,
    name: string,
    deceased: boolean,
): void {
    next[`${kind}Name:${index}`] = name;
    next[deceasedDraftKey(kind, index)] = deceased ? '1' : '0';
}

export function encodeDossierPartyNames(
    draft: Record<string, string>,
    file: ExecutionFile | null | undefined,
): Record<string, string> {
    const legacy = file as LegacyPartyFile | null | undefined;
    const creditors = partyList<Creditor>(file?.creditors);
    const debtors = partyList<Debtor>(file?.debtors);
    const credCount = Math.max(1, creditors.length);
    const debtCount = Math.max(1, debtors.length);
    const next: Record<string, string> = {
        ...draft,
        partyCreditorCount: String(credCount),
        partyDebtorCount: String(debtCount),
    };
    if (creditors.length === 0) {
        writePartyNameDraft(
            next,
            'creditor',
            0,
            resolveEditablePartyName(file, 'creditor', legacy?.creditor, 0),
            isDossierPartyDeceased(file, 'creditor', legacy?.creditor, 0),
        );
    } else {
        creditors.forEach((row, index) => {
            writePartyNameDraft(
                next,
                'creditor',
                index,
                resolveEditablePartyName(file, 'creditor', row, index),
                isDossierPartyDeceased(file, 'creditor', row, index),
            );
        });
    }
    if (debtors.length === 0) {
        writePartyNameDraft(
            next,
            'debtor',
            0,
            resolveEditablePartyName(file, 'debtor', legacy?.debtor, 0),
            isDossierPartyDeceased(file, 'debtor', legacy?.debtor, 0),
        );
    } else {
        debtors.forEach((row, index) => {
            writePartyNameDraft(
                next,
                'debtor',
                index,
                resolveEditablePartyName(file, 'debtor', row, index),
                isDossierPartyDeceased(file, 'debtor', row, index),
            );
        });
    }
    return next;
}

export function listDossierPartyNameFields(
    draft: Record<string, string> | null | undefined,
): DossierPartyNameField[] {
    if (!draft) {
        return [
            { key: 'creditorName:0', label: 'اسم الدائن', kind: 'creditor' },
            { key: 'debtorName:0', label: 'اسم المدين', kind: 'debtor' },
        ];
    }
    const credCount = countOrOne(draft.partyCreditorCount);
    const debtCount = countOrOne(draft.partyDebtorCount);
    const fields: DossierPartyNameField[] = [];
    for (let i = 0; i < credCount; i += 1) {
        if (isDeceasedInDraft(draft, 'creditor', i)) continue;
        fields.push({
            key: `creditorName:${i}`,
            label: credCount > 1 ? `اسم الدائن ${i + 1}` : 'اسم الدائن',
            kind: 'creditor',
        });
    }
    for (let i = 0; i < debtCount; i += 1) {
        if (isDeceasedInDraft(draft, 'debtor', i)) continue;
        fields.push({
            key: `debtorName:${i}`,
            label: debtCount > 1 ? `اسم المدين ${i + 1}` : 'اسم المدين',
            kind: 'debtor',
        });
    }
    return fields;
}

export function validateDossierPartyNames(
    draft: Record<string, string> | null | undefined,
): { ok: true } | { ok: false; message: string } {
    const fields = listDossierPartyNameFields(draft);
    if (!draft) return { ok: true };
    for (const field of fields) {
        const name = String(draft[field.key] ?? '').trim();
        if (name.length > 120) {
            return { ok: false, message: `${field.label} طويل جداً` };
        }
    }
    return { ok: true };
}

function applyNames<T extends { name?: string; fullName?: string }>(
    rows: T[],
    draft: Record<string, string>,
    prefix: 'creditorName' | 'debtorName',
): T[] {
    const kind = prefix === 'creditorName' ? 'creditor' : 'debtor';
    return rows.map((row, index) => {
        if (isDeceasedInDraft(draft, kind, index)) return row;
        const name = String(
            draft[`${prefix}:${index}`] ?? resolvePartyStoredName(row) ?? '',
        ).trim();
        if (!name) return row;
        return { ...row, name, fullName: name };
    });
}

function rebuildPartiesFromLists(
    creditors: Creditor[],
    debtors: Debtor[],
    previousParties: Array<Party & { role?: string }> | undefined,
): Array<Party & { role?: string }> {
    const prev = Array.isArray(previousParties) ? previousParties : [];
    const prevById = new Map(
        prev
            .filter((p) => p?.id != null && String(p.id).trim() !== '')
            .map((p) => [String(p.id), p] as const),
    );
    const asParty = (
        row: Creditor | Debtor,
        role: 'الدائن' | 'المدين',
    ): Party & { role?: string } => {
        const prevRow = row.id != null ? prevById.get(String(row.id)) : undefined;
        const name = resolvePartyStoredName(row);
        return {
            ...(prevRow || {}),
            ...row,
            name,
            fullName: name,
            phone: row.phone ?? '',
            address: row.address ?? '',
            role,
        } as Party & { role?: string };
    };
    return [
        ...creditors.map((c) => asParty(c, 'الدائن')),
        ...debtors.map((d) => asParty(d, 'المدين')),
    ];
}

function seedCreditor(file: LegacyPartyFile, name: string): Creditor {
    const legacy = file.creditor;
    if (legacy && typeof legacy === 'object') {
        return { ...(legacy as Creditor), type: 'creditor', name, fullName: name };
    }
    return {
        id: 'creditor-primary',
        type: 'creditor',
        name,
        fullName: name,
        phone: '',
        address: '',
        occupation: '' as Creditor['occupation'],
        isClient: false,
        nationality: '',
    };
}

function seedDebtor(file: LegacyPartyFile, name: string): Debtor {
    const legacy = file.debtor;
    if (legacy && typeof legacy === 'object') {
        return {
            ...(legacy as Debtor),
            type: 'debtor',
            name,
            fullName: name,
            notificationDate: (legacy as Debtor).notificationDate ?? null,
        };
    }
    return {
        id: 'debtor-primary',
        type: 'debtor',
        name,
        fullName: name,
        phone: '',
        address: '',
        occupation: '' as Debtor['occupation'],
        isClient: false,
        nationality: '',
        notificationDate: null,
    };
}

export function buildDossierPartyNamesPatch(
    file: ExecutionFile | null | undefined,
    draft: Record<string, string>,
): Record<string, unknown> {
    if (!file) return {};
    const legacy = file as LegacyPartyFile;
    const fileCreditors = partyList<Creditor>(file.creditors);
    const fileDebtors = partyList<Debtor>(file.debtors);
    const patch: Record<string, unknown> = {};

    let nextCreditors = fileCreditors;
    let nextDebtors = fileDebtors;

    if (fileCreditors.length > 0) {
        nextCreditors = applyNames(fileCreditors, draft, 'creditorName');
        patch.creditors = nextCreditors;
        const primary = nextCreditors[0];
        const primaryName = resolvePartyStoredName(primary);
        if (legacy.creditor && typeof legacy.creditor === 'object') {
            patch.creditor = {
                ...legacy.creditor,
                name: primaryName,
                fullName: primaryName,
            };
        } else if (primaryName) {
            patch.creditor = { ...primary, name: primaryName, fullName: primaryName };
        }
        // دائماً — coerce يفضّل parties/clientName على creditors بعد إعادة التحميل
        if (primaryName) patch.clientName = primaryName;
    } else if (!isDeceasedInDraft(draft, 'creditor', 0)) {
        const name = String(draft['creditorName:0'] ?? '').trim();
        if (name) {
            const created = seedCreditor(legacy, name);
            nextCreditors = [created];
            patch.creditors = nextCreditors;
            patch.creditor = created;
            patch.clientName = name;
        }
    }

    if (fileDebtors.length > 0) {
        nextDebtors = applyNames(fileDebtors, draft, 'debtorName');
        patch.debtors = nextDebtors;
        const primary = nextDebtors[0];
        const primaryName = resolvePartyStoredName(primary);
        if (legacy.debtor && typeof legacy.debtor === 'object') {
            patch.debtor = {
                ...legacy.debtor,
                name: primaryName,
                fullName: primaryName,
            };
        } else if (primaryName) {
            patch.debtor = { ...primary, name: primaryName, fullName: primaryName };
        }
        if (primaryName) patch.opponentName = primaryName;
    } else if (!isDeceasedInDraft(draft, 'debtor', 0)) {
        const name = String(draft['debtorName:0'] ?? '').trim();
        if (name) {
            const created = seedDebtor(legacy, name);
            nextDebtors = [created];
            patch.debtors = nextDebtors;
            patch.debtor = created;
            patch.opponentName = name;
        }
    }

    if (patch.creditors || patch.debtors || Array.isArray(legacy.parties)) {
        patch.parties = rebuildPartiesFromLists(nextCreditors, nextDebtors, legacy.parties);
    }

    return patch;
}
