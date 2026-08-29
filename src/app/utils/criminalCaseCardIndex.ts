/**
 * فهرس بطاقات جزائي خفيف — يكفي لرسم القائمة/البحث دون تحميل JSON كامل لكل إضبارة.
 * يُحدَّث مع الكتابة المُجزَّأة؛ وإن غاب يُبنى من الـ shards كمسار احتياطي.
 */

export const CRIMINAL_CARD_INDEX_KEY = 'hami:criminal:card-index';
export const CRIMINAL_CARD_INDEX_VERSION = 1 as const;

type SlimParty = {
    fullName?: string;
    name?: string;
    isClient?: boolean;
};

type SlimDefendant = SlimParty & {
    isJuvenile?: boolean;
};

export type CriminalCaseCardIndexEntry = {
    id: string;
    ownerLawyerId?: string;
    dossierStatus?: string;
    mergedIntoCaseId?: string;
    courtCaseNumber?: string;
    isArchived?: boolean;
    isFrozen?: boolean;
    unknownDefendant?: boolean;
    ourRepresentation?: string;
    notes?: string;
    basics?: {
        stage?: string;
        legalArticle?: string;
        crimeType?: string;
        ourRepresentation?: string;
    };
    location?: {
        courtName?: string;
        caseNumber?: string;
        investigationPapersAt?: string;
        investigationDossierNumber?: string;
        baseRegisterNumberAndDate?: string;
        investigationCourtName?: string;
        nextHearingDate?: string;
    };
    complainants?: SlimParty[];
    defendants?: SlimDefendant[];
};

type CriminalCardIndexEnvelope = {
    v: typeof CRIMINAL_CARD_INDEX_VERSION;
    entries: CriminalCaseCardIndexEntry[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function slimParty(raw: unknown): SlimParty | null {
    const row = asRecord(raw);
    if (!row) return null;
    const fullName = String(row.fullName ?? '').trim();
    const name = String(row.name ?? '').trim();
    if (!fullName && !name) {
        return row.isClient === false || row.isClient === true
            ? { isClient: Boolean(row.isClient) }
            : null;
    }
    const out: SlimParty = {};
    if (fullName) out.fullName = fullName;
    if (name) out.name = name;
    if (row.isClient === true || row.isClient === false) out.isClient = Boolean(row.isClient);
    return out;
}

function slimDefendant(raw: unknown): SlimDefendant | null {
    const base = slimParty(raw);
    const row = asRecord(raw);
    if (!row) return null;
    const out: SlimDefendant = base ? { ...base } : {};
    if (row.isJuvenile === true) out.isJuvenile = true;
    if (!out.fullName && !out.name && out.isJuvenile !== true && out.isClient === undefined) {
        return null;
    }
    return out;
}

function pickString(row: Record<string, unknown>, key: string): string | undefined {
    const value = String(row[key] ?? '').trim();
    return value || undefined;
}

/** إسقاط حقول البطاقة فقط — لا أدلة/طلبات/جلسات. */
export function projectCriminalCaseCardIndexEntry(
    raw: Record<string, unknown>,
): CriminalCaseCardIndexEntry | null {
    const id = String(raw.id ?? '').trim();
    if (!id) return null;

    const basicsRaw = asRecord(raw.basics) ?? {};
    const locationRaw = asRecord(raw.location) ?? {};
    const complainants = Array.isArray(raw.complainants)
        ? raw.complainants.map(slimParty).filter((p): p is SlimParty => Boolean(p)).slice(0, 4)
        : [];
    const defendants = Array.isArray(raw.defendants)
        ? raw.defendants
              .map(slimDefendant)
              .filter((p): p is SlimDefendant => Boolean(p))
              .slice(0, 8)
        : [];

    const notes = String(raw.notes ?? '').trim();
    const entry: CriminalCaseCardIndexEntry = { id };

    const ownerLawyerId = pickString(raw, 'ownerLawyerId');
    if (ownerLawyerId) entry.ownerLawyerId = ownerLawyerId;
    const dossierStatus = pickString(raw, 'dossierStatus');
    if (dossierStatus) entry.dossierStatus = dossierStatus;
    const mergedIntoCaseId = pickString(raw, 'mergedIntoCaseId');
    if (mergedIntoCaseId) entry.mergedIntoCaseId = mergedIntoCaseId;
    const courtCaseNumber = pickString(raw, 'courtCaseNumber');
    if (courtCaseNumber) entry.courtCaseNumber = courtCaseNumber;
    if (raw.isArchived === true) entry.isArchived = true;
    if (raw.isFrozen === true) entry.isFrozen = true;
    if (raw.unknownDefendant === true) entry.unknownDefendant = true;
    const ourRepresentation = pickString(raw, 'ourRepresentation');
    if (ourRepresentation) entry.ourRepresentation = ourRepresentation;
    if (notes) entry.notes = notes.slice(0, 240);

    const basics: NonNullable<CriminalCaseCardIndexEntry['basics']> = {};
    const stage = pickString(basicsRaw, 'stage');
    if (stage) basics.stage = stage;
    const legalArticle = pickString(basicsRaw, 'legalArticle');
    if (legalArticle) basics.legalArticle = legalArticle;
    const crimeType = pickString(basicsRaw, 'crimeType');
    if (crimeType) basics.crimeType = crimeType;
    const basicsRep = pickString(basicsRaw, 'ourRepresentation');
    if (basicsRep) basics.ourRepresentation = basicsRep;
    if (Object.keys(basics).length) entry.basics = basics;

    const location: NonNullable<CriminalCaseCardIndexEntry['location']> = {};
    for (const key of [
        'courtName',
        'caseNumber',
        'investigationPapersAt',
        'investigationDossierNumber',
        'baseRegisterNumberAndDate',
        'investigationCourtName',
        'nextHearingDate',
    ] as const) {
        const value = pickString(locationRaw, key);
        if (value) location[key] = value;
    }
    if (Object.keys(location).length) entry.location = location;

    if (complainants.length) entry.complainants = complainants;
    if (defendants.length) entry.defendants = defendants;

    return entry;
}

export function projectCriminalCasesCardIndex(
    cases: Array<Record<string, unknown>>,
): CriminalCaseCardIndexEntry[] {
    const out: CriminalCaseCardIndexEntry[] = [];
    for (const row of cases) {
        const entry = projectCriminalCaseCardIndexEntry(row);
        if (entry) out.push(entry);
    }
    return out;
}

export function serializeCriminalCardIndex(entries: CriminalCaseCardIndexEntry[]): string {
    const envelope: CriminalCardIndexEnvelope = {
        v: CRIMINAL_CARD_INDEX_VERSION,
        entries,
    };
    return JSON.stringify(envelope);
}

export function parseCriminalCardIndex(raw: string | null | undefined): CriminalCaseCardIndexEntry[] | null {
    if (!raw?.trim()) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const envelope = parsed as Partial<CriminalCardIndexEnvelope>;
        if (envelope.v !== CRIMINAL_CARD_INDEX_VERSION) return null;
        if (!Array.isArray(envelope.entries)) return null;
        const entries = envelope.entries.filter(
            (row): row is CriminalCaseCardIndexEntry =>
                Boolean(row) && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'string',
        );
        return entries;
    } catch {
        return null;
    }
}

/**
 * Runtime-only mark for slim card-index rows injected into `casesById` for display.
 * Must never be written as a full case shard (see criminalShardedPersistStorage).
 */
export const CRIMINAL_CARD_INDEX_STUB_FLAG = '_cardIndexStub' as const;

export type CriminalCaseCardIndexStubMark = {
    [CRIMINAL_CARD_INDEX_STUB_FLAG]?: true;
};

/** True for display stubs (explicit flag, or legacy slim rows lacking createdAt). */
export function isCriminalCaseCardIndexStub(row: unknown): boolean {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const record = row as Record<string, unknown>;
    if (record[CRIMINAL_CARD_INDEX_STUB_FLAG] === true) return true;
    const id = String(record.id ?? '').trim();
    if (!id) return false;
    // Full persisted cases always carry createdAt; projected card-index entries never do.
    return !String(record.createdAt ?? '').trim();
}

export function markCriminalCaseCardIndexStub<T extends Record<string, unknown>>(
    row: T,
): T & { [CRIMINAL_CARD_INDEX_STUB_FLAG]: true } {
    return { ...row, [CRIMINAL_CARD_INDEX_STUB_FLAG]: true as const };
}

/**
 * Policy for merging into casesById:
 * - never overwrite a full case with a card-index stub
 * - upgrade stub → full when a richer record arrives
 * - skip no-op stub→stub / full→full
 */
export function shouldInjectCriminalCaseRecord(
    existing: unknown | null | undefined,
    incomingIsCardIndexStub: boolean,
): 'skip' | 'inject' {
    if (!existing) return 'inject';
    const existingStub = isCriminalCaseCardIndexStub(existing);
    if (!existingStub && incomingIsCardIndexStub) return 'skip';
    if (!existingStub && !incomingIsCardIndexStub) return 'skip';
    if (existingStub && incomingIsCardIndexStub) return 'skip';
    return 'inject';
}
