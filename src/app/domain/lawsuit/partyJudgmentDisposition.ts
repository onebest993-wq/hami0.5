/**
 * صفة الحكم حضورياً / غيابياً / بمثابة الحضوري لكل مدعى عليه.
 * لا يفتح مسارات طعن متوازية؛ الملخص `مختلط` يمنع معاملة الحكم كغيابي أو حضوري بالكامل.
 * «بمثابة الحضوري» حضور-مثل إجرائياً: استئناف فقط، بلا اعتراض غيابي.
 */
import {
    partitionLawsuitPartiesByRole,
    type LawsuitPartyRoleRecord,
} from './lawsuitPartyRole';

export const JUDGMENT_FORM_HADARI = 'حضوري';
export const JUDGMENT_FORM_GHIABI = 'غيابي';
export const JUDGMENT_FORM_DEEMED_HADARI = 'بمثابة الحضوري';
export const JUDGMENT_FORM_MIXED = 'مختلط';

export type JudgmentPresenceForm =
    | typeof JUDGMENT_FORM_HADARI
    | typeof JUDGMENT_FORM_GHIABI
    | typeof JUDGMENT_FORM_DEEMED_HADARI;
export type JudgmentFormScalar = typeof JUDGMENT_FORM_HADARI | typeof JUDGMENT_FORM_GHIABI | typeof JUDGMENT_FORM_MIXED;
export type DisputeIntegrity = 'severable' | 'indivisible';

/** إلزام بحق الخصم = bound؛ رد الدعوى بحقه = released (صامت بلا مهلة طعن). */
export type PartyJudgmentOperative = 'bound' | 'released';

export type PartyJudgmentDisposition = {
    partyId: string;
    form: JudgmentPresenceForm;
    /** افتراضي bound عند الغياب — التضامن = bound */
    operative?: PartyJudgmentOperative;
};

export type PartyJudgmentStampTarget = {
    judgmentForm?: string;
    lastJudgmentType?: 'حضوري' | 'غيابي';
    partyJudgmentDispositions?: PartyJudgmentDisposition[];
    disputeIntegrity?: DisputeIntegrity;
};

export function isPartyJudgmentOperative(value: unknown): value is PartyJudgmentOperative {
    return value === 'bound' || value === 'released';
}

export function resolvePartyJudgmentOperative(
    row: Pick<PartyJudgmentDisposition, 'operative'> | null | undefined,
): PartyJudgmentOperative {
    return row?.operative === 'released' ? 'released' : 'bound';
}

export function isPartyOperativeReleased(
    row: Pick<PartyJudgmentDisposition, 'operative'> | null | undefined,
): boolean {
    return resolvePartyJudgmentOperative(row) === 'released';
}

export function hasAnyReleasedDisposition(
    dispositions: PartyJudgmentDisposition[] | unknown,
): boolean {
    return normalizePartyJudgmentDispositions(dispositions).some(isPartyOperativeReleased);
}

export function releasedPartyIds(dispositions: PartyJudgmentDisposition[] | unknown): string[] {
    return normalizePartyJudgmentDispositions(dispositions)
        .filter(isPartyOperativeReleased)
        .map((row) => row.partyId);
}

export function boundPartyIds(dispositions: PartyJudgmentDisposition[] | unknown): string[] {
    return normalizePartyJudgmentDispositions(dispositions)
        .filter((row) => !isPartyOperativeReleased(row))
        .map((row) => row.partyId);
}

export function areAllDispositionsReleased(
    dispositions: PartyJudgmentDisposition[] | unknown,
): boolean {
    const rows = normalizePartyJudgmentDispositions(dispositions);
    return rows.length > 0 && rows.every(isPartyOperativeReleased);
}

export type BoundMeritExtent = 'full' | 'partial';

/**
 * من إلزام/رد بحق كل خصم:
 * الكل مبرَّأ → رد كلي؛ مختلط خصوم → جزئي؛ الكل ملزَم → كامل أو جزئي موضوعي.
 */
export function resolveJudgmentTypeFromPartyOperatives(
    dispositions: PartyJudgmentDisposition[] | unknown,
    boundMerit: BoundMeritExtent = 'full',
): string {
    const rows = normalizePartyJudgmentDispositions(dispositions);
    if (rows.length === 0) return '';
    if (areAllDispositionsReleased(rows)) return 'رد الدعوى كلياً';
    if (hasAnyReleasedDisposition(rows)) return 'رد الدعوى جزئياً';
    return boundMerit === 'partial' ? 'رد الدعوى جزئياً' : 'إجابة الدعوى بالكامل';
}

/**
 * رد فردي → جزئي؛ رد الجميع → كلي.
 * يرفض إجابة كاملة مع وجود أي معفى.
 * (بدون released لا يغيّر النوع — الجزئي الموضوعي يبقى ممكناً على خصم ملزَم.)
 */
export function coerceJudgmentTypeForReleasedOperatives(
    judgmentType: string,
    dispositions: PartyJudgmentDisposition[] | unknown,
): string {
    const t = String(judgmentType ?? '').trim();
    if (!hasAnyReleasedDisposition(dispositions)) return t;
    if (areAllDispositionsReleased(dispositions)) return 'رد الدعوى كلياً';
    return 'رد الدعوى جزئياً';
}

/** شخص ثالث اختصامي مستقل — خارج مصفوفة الحضور/الغياب، وحضوري حتماً في مسار الاستئناف. */
export function isIndependentInterpleaderRole(role: string): boolean {
    const r = String(role ?? '').trim();
    if (r.includes('اختصامي')) return true;
    if (r.includes('شخص ثالث') && !r.includes('انضمامي')) return true;
    return false;
}

export function isJudgmentPresenceForm(value: unknown): value is JudgmentPresenceForm {
    return (
        value === JUDGMENT_FORM_HADARI
        || value === JUDGMENT_FORM_GHIABI
        || value === JUDGMENT_FORM_DEEMED_HADARI
    );
}

/** حضوري أو القيمة القديمة «بمثابة الحضوري»: نوافذ الاستئناف فقط، بلا اعتراض غيابي. */
export function isPresentLikeJudgmentForm(value: unknown): boolean {
    return value === JUDGMENT_FORM_HADARI || value === JUDGMENT_FORM_DEEMED_HADARI;
}

/** خيار الإصدار: حضوري أو غيابي أو بمثابة الحضوري. */
export function issuedJudgmentPresenceForm(value: unknown): JudgmentPresenceForm {
    if (value === JUDGMENT_FORM_GHIABI) return JUDGMENT_FORM_GHIABI;
    if (value === JUDGMENT_FORM_DEEMED_HADARI) return JUDGMENT_FORM_DEEMED_HADARI;
    return JUDGMENT_FORM_HADARI;
}

export function partyDispositionId(party: { id?: unknown } | null | undefined): string {
    return String(party?.id ?? '').trim();
}

export function parseDisputeIntegrity(raw: unknown): DisputeIntegrity | undefined {
    const t = String(raw ?? '').trim();
    if (t === 'severable' || t === 'indivisible') return t;
    if (t === 'قابل للتجزئة') return 'severable';
    if (t === 'غير قابل للتجزئة') return 'indivisible';
    return undefined;
}

/** غياب الحقل = قابل للتجزئة: لا يُفعَّل أثر المادتين 172 و191 دون اختيار صريح. */
export function isDisputeIndivisible(integrity?: DisputeIntegrity | string | null): boolean {
    return parseDisputeIntegrity(integrity) === 'indivisible';
}

export function isMixedJudgmentForm(form?: string | null): boolean {
    const raw = String(form ?? '').trim();
    return raw === JUDGMENT_FORM_MIXED || raw.includes(JUDGMENT_FORM_MIXED);
}

/** تخمين أوّلي — الحكم الجديد يُفترض غير قابل للتجزئة. */
export function suggestDisputeIntegrity(_caseType?: string | null): DisputeIntegrity {
    return 'indivisible';
}

export function formatPartyJudgmentPresenceSummary(
    parties: Array<{ id?: unknown; name?: unknown }> | null | undefined,
    dispositions: PartyJudgmentDisposition[] | unknown,
): string {
    const rows = normalizePartyJudgmentDispositions(dispositions);
    if (rows.length === 0) return '';
    const byId = new Map(
        (parties ?? []).map((party) => [
            partyDispositionId(party),
            String(party.name ?? '').trim(),
        ]),
    );
    return rows
        .map((row) => {
            const name = byId.get(row.partyId) || `طرف ${row.partyId}`;
            const form = isPresentLikeJudgmentForm(row.form) ? JUDGMENT_FORM_HADARI : JUDGMENT_FORM_GHIABI;
            return `${name} ${form}`;
        })
        .join(' — ');
}

/** نتيجة كل خصم: الاسم — الصفة — إلزام|رد (بلا تلميحات طعن). */
export function formatPartyJudgmentOutcomeSummary(
    parties: Array<{ id?: unknown; name?: unknown }> | null | undefined,
    dispositions: PartyJudgmentDisposition[] | unknown,
): string {
    const rows = normalizePartyJudgmentDispositions(dispositions);
    if (rows.length === 0) return '';
    const byId = new Map(
        (parties ?? []).map((party) => [
            partyDispositionId(party),
            String(party.name ?? '').trim(),
        ]),
    );
    return rows
        .map((row) => {
            const name = byId.get(row.partyId) || `طرف ${row.partyId}`;
            const form = isPresentLikeJudgmentForm(row.form) ? JUDGMENT_FORM_HADARI : JUDGMENT_FORM_GHIABI;
            const operative = isPartyOperativeReleased(row) ? 'رد' : 'إلزام';
            return `${name} — ${form} — ${operative}`;
        })
        .join('\n');
}

export function normalizePartyJudgmentDispositions(raw: unknown): PartyJudgmentDisposition[] {
    if (!Array.isArray(raw)) return [];
    const out: PartyJudgmentDisposition[] = [];
    const seen = new Set<string>();
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const rec = row as { partyId?: unknown; form?: unknown; operative?: unknown };
        const partyId = String(rec.partyId ?? '').trim();
        if (!partyId || seen.has(partyId) || !isJudgmentPresenceForm(rec.form)) continue;
        seen.add(partyId);
        const operative: PartyJudgmentOperative = isPartyJudgmentOperative(rec.operative)
            ? rec.operative
            : 'bound';
        out.push({ partyId, form: rec.form, operative });
    }
    return out;
}

export function listJudgmentDispositionDefendants<
    T extends LawsuitPartyRoleRecord & { name?: unknown; isClient?: boolean },
>(parties: T[] | null | undefined): T[] {
    if (!Array.isArray(parties)) return [];
    const { defendants } = partitionLawsuitPartiesByRole(parties);
    return defendants.filter((party) => {
        if (!partyDispositionId(party)) return false;
        return !isIndependentInterpleaderRole(String(party.role ?? party.status ?? ''));
    });
}

export function seedPartyJudgmentDispositions(
    defendants: Array<{ id?: unknown }>,
    form: JudgmentPresenceForm = JUDGMENT_FORM_HADARI,
    operative: PartyJudgmentOperative = 'bound',
): PartyJudgmentDisposition[] {
    const issued = isJudgmentPresenceForm(form) ? form : JUDGMENT_FORM_HADARI;
    const op = isPartyJudgmentOperative(operative) ? operative : 'bound';
    const out: PartyJudgmentDisposition[] = [];
    const seen = new Set<string>();
    for (const party of defendants) {
        const partyId = partyDispositionId(party);
        if (!partyId || seen.has(partyId)) continue;
        seen.add(partyId);
        out.push({ partyId, form: issued, operative: op });
    }
    return out;
}

export function alignPartyJudgmentDispositions(
    defendants: Array<{ id?: unknown }>,
    existing: PartyJudgmentDisposition[],
    fallback: JudgmentPresenceForm = JUDGMENT_FORM_HADARI,
): PartyJudgmentDisposition[] {
    const issuedFallback = isJudgmentPresenceForm(fallback) ? fallback : JUDGMENT_FORM_HADARI;
    const byId = new Map(
        normalizePartyJudgmentDispositions(existing).map((row) => [row.partyId, row]),
    );
    return seedPartyJudgmentDispositions(defendants, issuedFallback).map((row) => {
        const prev = byId.get(row.partyId);
        return {
            partyId: row.partyId,
            form: prev?.form ?? issuedFallback,
            operative: resolvePartyJudgmentOperative(prev),
        };
    });
}

export function summarizePartyJudgmentForm(
    dispositions: PartyJudgmentDisposition[],
    fallback: string = JUDGMENT_FORM_HADARI,
): JudgmentFormScalar {
    if (dispositions.length === 0) {
        const raw = String(fallback ?? '').trim();
        if (raw === JUDGMENT_FORM_MIXED) return JUDGMENT_FORM_MIXED;
        if (raw === JUDGMENT_FORM_GHIABI || raw.startsWith(JUDGMENT_FORM_GHIABI)) {
            return JUDGMENT_FORM_GHIABI;
        }
        return JUDGMENT_FORM_HADARI;
    }
    const hasPresent = dispositions.some((row) => isPresentLikeJudgmentForm(row.form));
    const hasGhayabi = dispositions.some((row) => row.form === JUDGMENT_FORM_GHIABI);
    if (hasPresent && hasGhayabi) return JUDGMENT_FORM_MIXED;
    if (hasGhayabi) return JUDGMENT_FORM_GHIABI;
    return JUDGMENT_FORM_HADARI;
}

export function toLegacyLastJudgmentType(
    form: string | null | undefined,
): 'حضوري' | 'غيابي' | undefined {
    const raw = String(form ?? '').trim();
    if (raw === JUDGMENT_FORM_GHIABI) return JUDGMENT_FORM_GHIABI;
    if (raw === JUDGMENT_FORM_HADARI || raw === JUDGMENT_FORM_DEEMED_HADARI) {
        return JUDGMENT_FORM_HADARI;
    }
    return undefined;
}

export function resolveJudgmentPresenceWindows(
    dispositions: PartyJudgmentDisposition[],
    scalarForm: string,
): {
    hasHadari: boolean;
    hasGhayabi: boolean;
    mixed: boolean;
    summary: JudgmentFormScalar;
} {
    const summary = summarizePartyJudgmentForm(dispositions, scalarForm);
    if (dispositions.length > 0) {
        const hasHadari = dispositions.some((row) => isPresentLikeJudgmentForm(row.form));
        const hasGhayabi = dispositions.some((row) => row.form === JUDGMENT_FORM_GHIABI);
        return { hasHadari, hasGhayabi, mixed: hasHadari && hasGhayabi, summary };
    }
    if (summary === JUDGMENT_FORM_MIXED) {
        return { hasHadari: true, hasGhayabi: true, mixed: true, summary };
    }
    if (summary === JUDGMENT_FORM_GHIABI) {
        return { hasHadari: false, hasGhayabi: true, mixed: false, summary };
    }
    return { hasHadari: true, hasGhayabi: false, mixed: false, summary: JUDGMENT_FORM_HADARI };
}

export function judgmentFormHasGhayabi(
    judgmentForm?: string | null,
    lastJudgmentType?: string | null,
    dispositionsRaw?: unknown,
): boolean {
    const dispositions = normalizePartyJudgmentDispositions(dispositionsRaw);
    if (dispositions.length > 0) {
        return dispositions.some((row) => row.form === JUDGMENT_FORM_GHIABI);
    }
    const raw = String(judgmentForm ?? lastJudgmentType ?? '').trim();
    if (raw === JUDGMENT_FORM_MIXED || raw.includes(JUDGMENT_FORM_MIXED)) return true;
    return raw === JUDGMENT_FORM_GHIABI || raw.startsWith(JUDGMENT_FORM_GHIABI);
}

export function resolveClientDefendantJudgmentForm(
    parties: Array<LawsuitPartyRoleRecord & { isClient?: boolean }> | null | undefined,
    dispositions: PartyJudgmentDisposition[],
): JudgmentPresenceForm | null {
    const clients = listJudgmentDispositionDefendants(parties ?? []).filter((party) =>
        Boolean(party.isClient),
    );
    if (clients.length === 0) return null;
    const byId = new Map(dispositions.map((row) => [row.partyId, row.form]));
    const forms = clients
        .map((party) => byId.get(partyDispositionId(party)))
        .filter(isJudgmentPresenceForm);
    if (forms.includes(JUDGMENT_FORM_GHIABI)) return JUDGMENT_FORM_GHIABI;
    if (forms.includes(JUDGMENT_FORM_DEEMED_HADARI)) return JUDGMENT_FORM_DEEMED_HADARI;
    if (forms.includes(JUDGMENT_FORM_HADARI)) return JUDGMENT_FORM_HADARI;
    return null;
}

/** الموكل المدعى عليه غائب وملزَم — يحق له الاعتراض الغيابي (لا المبرَّأ). */
export function clientDefendantEligibleForGhayabiObjection(
    parties: Array<LawsuitPartyRoleRecord & { isClient?: boolean }> | null | undefined,
    dispositions: PartyJudgmentDisposition[],
): boolean {
    const clients = listJudgmentDispositionDefendants(parties ?? []).filter((party) =>
        Boolean(party.isClient),
    );
    if (clients.length === 0) return false;
    const byId = new Map(dispositions.map((row) => [row.partyId, row]));
    return clients.some((party) => {
        const row = byId.get(partyDispositionId(party));
        if (!row || row.form !== JUDGMENT_FORM_GHIABI) return false;
        return !isPartyOperativeReleased(row);
    });
}

export function clientDefendantHasGhayabiDisposition(
    parties: Array<LawsuitPartyRoleRecord & { isClient?: boolean }> | null | undefined,
    dispositions: PartyJudgmentDisposition[],
): boolean {
    return resolveClientDefendantJudgmentForm(parties, dispositions) === JUDGMENT_FORM_GHIABI;
}

/** أزرار الاعتراض الغيابي تتبع صفة الموكل الفردية — لا ملخص الحكم المختلط. */
export function clientUsesGhayabiChallengeActions(
    lawyerSide: string | null | undefined,
    clientDefendantForm: JudgmentPresenceForm | null,
    scalarForm?: string | null,
): boolean {
    if (String(lawyerSide ?? '').trim() !== 'المدعى عليه') return false;
    if (clientDefendantForm === JUDGMENT_FORM_GHIABI) return true;
    if (clientDefendantForm) return false;
    const raw = String(scalarForm ?? '').trim();
    return raw === JUDGMENT_FORM_GHIABI || raw.startsWith(JUDGMENT_FORM_GHIABI);
}

export function shouldPersistPartyJudgmentStamp(
    stageName: string,
    payload: { partyJudgmentDispositions?: unknown; disputeIntegrity?: unknown },
): boolean {
    const s = String(stageName ?? '').trim();
    if (
        s.includes('اعتراض على الحكم الغيابي')
        || s.includes('الاعتراض على الحكم الغيابي')
        || s.includes('اعتراض غيابي')
    ) {
        return false;
    }
    if (s.includes('اعتراض الغير') || s.includes('إعادة المحاكمة') || s.includes('إعادة محاكمة')) {
        return (
            normalizePartyJudgmentDispositions(payload.partyJudgmentDispositions).length > 0
            || Boolean(parseDisputeIntegrity(payload.disputeIntegrity))
        );
    }
    if (s.includes('استئناف') || s === 'التمييز' || (s.includes('تمييز') && !s.includes('استئناف'))) {
        return false;
    }
    return (
        normalizePartyJudgmentDispositions(payload.partyJudgmentDispositions).length > 0
        || Boolean(parseDisputeIntegrity(payload.disputeIntegrity))
    );
}

export function stampPartyJudgmentOnStage<T extends PartyJudgmentStampTarget>(
    stage: T,
    payload: {
        judgmentForm?: unknown;
        partyJudgmentDispositions?: unknown;
        disputeIntegrity?: unknown;
    },
): T {
    const dispositions = normalizePartyJudgmentDispositions(payload.partyJudgmentDispositions);
    const integrity = parseDisputeIntegrity(payload.disputeIntegrity);
    const summary = summarizePartyJudgmentForm(
        dispositions,
        String(payload.judgmentForm ?? stage.judgmentForm ?? JUDGMENT_FORM_HADARI),
    );
    return {
        ...stage,
        ...(dispositions.length > 0 ? { partyJudgmentDispositions: dispositions } : {}),
        ...(integrity ? { disputeIntegrity: integrity } : {}),
        judgmentForm: summary || stage.judgmentForm,
        lastJudgmentType: toLegacyLastJudgmentType(summary),
    };
}
