import type { CriminalCase, CriminalDefendant, Statement } from './criminalStore';

function createLocalDefendantId(): string {
    return `cd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export const UNKNOWN_DEFENDANT_LABEL_PREFIX = 'مشكو منه مجهول';
export const JUVENILE_UNKNOWN_DEFENDANT_LABEL_PREFIX = 'حدث مجهول';

/** تُعرض بجانب المتهم المجهول في بطاقة تحديد الطرف المعني. */
export const UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE =
    'لا يمكن أخذ إجراء على المتهم المجهول';

/** غلق مؤقت / تفريق — يُشمَل المجهول تلقائياً دون تحديد يدوي. */
export const UNKNOWN_DEFENDANT_PURGE_AUTO_SCOPE_MESSAGE =
    'يُشمَل تلقائياً بهذا القرار — لا يمكن تحديده يدوياً';

export function unknownDefendantDisplayLabel(index: number, isJuvenile = false): string {
    const n = Number.isFinite(index) && index > 0 ? index : 1;
    if (isJuvenile) return `${JUVENILE_UNKNOWN_DEFENDANT_LABEL_PREFIX} (${n})`;
    return `${UNKNOWN_DEFENDANT_LABEL_PREFIX} (${n})`;
}

export function isUnknownDefendantDisplayName(name: string): boolean {
    const n = String(name ?? '').trim();
    return (
        n.startsWith(UNKNOWN_DEFENDANT_LABEL_PREFIX) ||
        n.startsWith(JUVENILE_UNKNOWN_DEFENDANT_LABEL_PREFIX)
    );
}

/** يُحدّد سياق الحدث للمجهول عندما كل المتهمين المعلومين أحداث. */
export function inferUnknownDefendantJuvenileContext(defendants: CriminalDefendant[] | undefined): boolean {
    const identified = getIdentifiedDefendants(defendants);
    if (!identified.length) return false;
    return identified.every((d) => Boolean(d.isJuvenile));
}

/** الاسم المعروض للمتهم — يدعم الحقل القديم `name` عند غياب `fullName`. */
export function resolveDefendantFullName(
    d: CriminalDefendant | Record<string, unknown> | undefined | null,
): string {
    if (!d) return '';
    const rec = d as Record<string, unknown>;
    const fromFullName = String(rec.fullName ?? '').trim();
    if (fromFullName) return fromFullName;
    return String(rec.name ?? '').trim();
}

export function coerceDefendantFullName(d: CriminalDefendant): CriminalDefendant {
    const fullName = resolveDefendantFullName(d);
    if (fullName === String(d.fullName ?? '').trim()) return d;
    return { ...d, fullName };
}

export function isDefendantIdentityUnknown(d: CriminalDefendant | undefined | null): boolean {
    if (!d) return false;
    if (d.isIdentityUnknown === true) return true;
    if (d.isIdentityUnknown === false) return false;
    const name = resolveDefendantFullName(d);
    return isUnknownDefendantDisplayName(name);
}

export function makeUnknownIdentityDefendant(
    index: number,
    options?: { isJuvenile?: boolean },
): CriminalDefendant {
    const isJuvenile = Boolean(options?.isJuvenile);
    return {
        id: createLocalDefendantId(),
        fullName: unknownDefendantDisplayLabel(index, isJuvenile),
        address: '',
        birthYear: '',
        status: '',
        detentionAuthority: '',
        detentionExpiryDate: '',
        detentionHistoryLog: [],
        totalDetentionDays: 0,
        hasFelonyCourtPermit: false,
        isJuvenile,
        birthDate: '',
        guardianName: '',
        guardianRelationship: '',
        personalStage: 'under_investigation',
        isPartyRecordLocked: false,
        investigationStatus: 'active',
        isIdentityUnknown: true,
    };
}

export function isEmptyDefendantShell(d: CriminalDefendant | undefined | null): boolean {
    if (!d || isDefendantIdentityUnknown(d)) return false;
    return !resolveDefendantFullName(d);
}

/** يزيل صفوف المتهمين الفارغة (بدون اسم) التي تبقى أحياناً بجانب المجهولين. */
export function pruneEmptyDefendantShells(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => !isEmptyDefendantShell(d));
}

export function getIdentifiedDefendants(defendants: CriminalDefendant[] | undefined): CriminalDefendant[] {
    return pruneEmptyDefendantShells(
        (Array.isArray(defendants) ? defendants : []).filter((d) => !isDefendantIdentityUnknown(d)),
    );
}

export function getUnknownIdentityDefendants(defendants: CriminalDefendant[] | undefined): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => isDefendantIdentityUnknown(d));
}

export function hasUnrevealedUnknownDefendants(defendants: CriminalDefendant[] | undefined): boolean {
    return getUnknownIdentityDefendants(defendants).length > 0;
}

export function hasIdentifiedDefendant(defendants: CriminalDefendant[] | undefined): boolean {
    return getIdentifiedDefendants(defendants).length > 0;
}

/** إضبارة تحقيق فيها مجهول (غير مكشوف) ومتهم معلوم في آنٍ واحد. */
export function investigationDossierHasMixedUnknownAndIdentified(
    defendants: CriminalDefendant[] | undefined,
): boolean {
    return hasUnrevealedUnknownDefendants(defendants) && hasIdentifiedDefendant(defendants);
}

/** لا يُعرض خيار المجهول عند تمثيل المشكو منه — لا يجوز أن يكون موكلنا مجهولاً. */
export function syncUnknownDefendantsJuvenileContext(defendants: CriminalDefendant[]): CriminalDefendant[] {
    const juvenileCtx = inferUnknownDefendantJuvenileContext(defendants);
    const unknowns = getUnknownIdentityDefendants(defendants);
    if (!unknowns.length) return defendants;
    const unknownIndexById = new Map(unknowns.map((d, i) => [d.id, i + 1]));
    return defendants.map((d) => {
        if (!isDefendantIdentityUnknown(d)) return d;
        const idx = unknownIndexById.get(d.id) ?? 1;
        const expectedName = unknownDefendantDisplayLabel(idx, juvenileCtx);
        if (d.fullName === expectedName && Boolean(d.isJuvenile) === juvenileCtx) return d;
        return { ...d, fullName: expectedName, isJuvenile: juvenileCtx };
    });
}

export function canAddUnknownDefendants(rep: string): boolean {
    const r = String(rep ?? '').trim();
    return r !== '' && r !== 'defendant_side';
}

/** إضافة متهم مجهول من الزر — بلا شروط (مع معلوم أو مجهول أو وحده). */
export function canAddUnknownDefendantToDraft(_defendants?: CriminalDefendant[] | undefined): boolean {
    return true;
}

export function draftHasUnknownDefendant(defendants: CriminalDefendant[] | undefined): boolean {
    return getUnknownIdentityDefendants(defendants).length > 0;
}

/** أي وجود لمتهم مجهول (غير مكشوف) يقفل مرحلة الإضبارة الجديدة على التحقيق. */
export function newCaseStageLockedToInvestigationForUnknown(
    defendants: CriminalDefendant[] | undefined,
): boolean {
    return draftHasUnknownDefendant(defendants);
}

export function draftHasNamedIdentifiedDefendant(defendants: CriminalDefendant[] | undefined): boolean {
    const raw = Array.isArray(defendants) ? defendants : [];
    return raw.some((d) => !isDefendantIdentityUnknown(d) && resolveDefendantFullName(d));
}

/** كل صفوف المتهمين في المسودة مجهولة (لا يُشترط اسم معلوم للحفظ). */
export function draftIsAllUnknownDefendants(defendants: CriminalDefendant[] | undefined): boolean {
    const raw = Array.isArray(defendants) ? defendants : [];
    if (!raw.length) return false;
    return raw.every((d) => isDefendantIdentityUnknown(d));
}

export function canMarkDraftDefendantAsUnknown(
    defendants: CriminalDefendant[] | undefined,
    targetId: string,
): boolean {
    const id = String(targetId ?? '').trim();
    if (!id) return false;
    const raw = Array.isArray(defendants) ? defendants : [];
    const hit = raw.find((d) => d.id === id);
    if (!hit || isDefendantIdentityUnknown(hit)) return false;

    if (
        raw.some(
            (d) => d.id !== id && !isDefendantIdentityUnknown(d) && resolveDefendantFullName(d),
        )
    ) {
        return true;
    }

    const identifiedNonUnknown = raw.filter((d) => !isDefendantIdentityUnknown(d));
    if (identifiedNonUnknown.length === 1 && identifiedNonUnknown[0]?.id === id) {
        return true;
    }

    if (raw.some((d) => d.id !== id && !isDefendantIdentityUnknown(d))) {
        return true;
    }

    return false;
}

export function convertIdentifiedDefendantToUnknown(
    defendant: CriminalDefendant,
    index: number,
    options?: { isJuvenile?: boolean },
): CriminalDefendant {
    const base = makeUnknownIdentityDefendant(index, options);
    return { ...base, id: defendant.id };
}

export function convertUnknownDefendantToIdentifiedShell(defendant: CriminalDefendant): CriminalDefendant {
    return {
        id: defendant.id,
        fullName: '',
        address: '',
        birthYear: '',
        status: '',
        detentionAuthority: '',
        detentionExpiryDate: '',
        detentionHistoryLog: [],
        totalDetentionDays: 0,
        hasFelonyCourtPermit: false,
        isJuvenile: false,
        isUnderSeven: false,
        birthDate: '',
        guardianName: '',
        guardianRelationship: '',
        personalStage: 'under_investigation',
        isPartyRecordLocked: false,
        investigationStatus: 'active',
        isIdentityUnknown: false,
        isOfficeClient: false,
    };
}

/** الشكوى تُقفل على التحقيق فقط عندما كل المتهمين مجهولين دون أي معلوم. */
export function isComplaintRestrictedToInvestigationOnly(
    defendants: CriminalDefendant[] | undefined,
): boolean {
    if (!hasUnrevealedUnknownDefendants(defendants)) return false;
    return !getIdentifiedDefendants(defendants).some((d) => String(d.fullName ?? '').trim());
}

/** يزيل معرّفات المتهمين المجهولين من قائمة أطراف الإجراء. */
export function filterUnknownDefendantsFromPartyIds(
    defendants: CriminalDefendant[] | undefined,
    partyIds: string[] | undefined,
): string[] {
    const unknownIds = new Set(getUnknownIdentityDefendants(defendants).map((d) => d.id));
    return (Array.isArray(partyIds) ? partyIds : [])
        .map((x) => String(x ?? '').trim())
        .filter((id) => id && !unknownIds.has(id));
}

export function isStatementFromUnknownDefendant(
    statement: Pick<Statement, 'giverType' | 'giverName'>,
    defendants: CriminalDefendant[] | undefined,
): boolean {
    if (statement.giverType !== 'defendant') return false;
    const name = String(statement.giverName ?? '').trim();
    if (!name) return false;
    return (Array.isArray(defendants) ? defendants : []).some(
        (d) => isDefendantIdentityUnknown(d) && String(d.fullName ?? '').trim() === name,
    );
}

/** إفادات المجهول لا تُعرض في سجل الإفادات — يُعامل كطرف شبح. */
export function filterStatementsExcludingUnknown(
    statements: Statement[] | undefined,
    defendants: CriminalDefendant[] | undefined,
): Statement[] {
    return (Array.isArray(statements) ? statements : []).filter(
        (st) => !isStatementFromUnknownDefendant(st, defendants),
    );
}

/** مزامنة علم المجهول مع الصفوف الفعلية — يمنع «مجهولاً وهمياً» من علم قديم. */
export function repairUnknownDefendantCaseRecord(caseRecord: CriminalCase): CriminalCase {
    let pruned = pruneEmptyDefendantShells(
        Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [],
    );
    if (!caseRecord.unknownDefendant) {
        pruned = pruned.filter((d) => !isDefendantIdentityUnknown(d));
    }
    const unknownDefendant =
        hasUnrevealedUnknownDefendants(pruned) ||
        (Boolean(caseRecord.unknownDefendant) && pruned.length === 0);
    const sameFlag = caseRecord.unknownDefendant === unknownDefendant;
    const sameRows =
        pruned.length === (Array.isArray(caseRecord.defendants) ? caseRecord.defendants.length : 0) &&
        pruned.every((d, i) => d.id === caseRecord.defendants[i]?.id);
    if (sameFlag && sameRows) return caseRecord;
    return syncUnknownDefendantCaseFlag({ ...caseRecord, defendants: pruned }, pruned);
}

/** إضبارة قديمة: unknownDefendant دون صفوف — نُنشئ مجهولاً افتراضياً للعرض فقط. */
export function normalizeCaseDefendantsForUnknown(caseRecord: CriminalCase | undefined): CriminalDefendant[] {
    if (!caseRecord) return [];
    const repaired = repairUnknownDefendantCaseRecord(caseRecord);
    const defs = pruneEmptyDefendantShells(
        Array.isArray(repaired.defendants) ? repaired.defendants : [],
    );
    if (repaired.unknownDefendant && !defs.length) {
        return [makeUnknownIdentityDefendant(1)];
    }
    return defs;
}

export function nextUnknownDefendantIndex(defendants: CriminalDefendant[] | undefined): number {
    return getUnknownIdentityDefendants(defendants).length + 1;
}

export function syncUnknownDefendantCaseFlag(
    caseRecord: CriminalCase,
    defendants: CriminalDefendant[],
): CriminalCase {
    const unknownDefendant = hasUnrevealedUnknownDefendants(defendants);
    if (caseRecord.unknownDefendant === unknownDefendant) return caseRecord;
    return { ...caseRecord, unknownDefendant, defendants };
}

export type RevealDefendantIdentityPayload = {
    fullName: string;
    address?: string;
    birthYear?: string;
    status?: CriminalDefendant['status'];
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    birthDate?: string;
    guardianName?: string;
    guardianRelationship?: string;
};

export function validateRevealDefendantIdentityPayload(payload: RevealDefendantIdentityPayload): string | null {
    if (!String(payload.fullName ?? '').trim()) {
        return 'أدخل اسم المشكو منه بعد كشف الهوية.';
    }
    return null;
}
