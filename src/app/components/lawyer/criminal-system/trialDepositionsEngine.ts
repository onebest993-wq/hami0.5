import type { Statement, StatementContentHighlight } from './criminalStore';
import type { StatementGiverType } from './statementGiverDisplay';
import { resolveStatementPersonName } from './statementGiverDisplay';
import { sanitizeContentHighlights } from './statementContentHighlights';

export type { StatementGiverType as TrialDepositionGiverType };

export type TrialDepositionLinkKind = 'statement' | 'trial_deposition';

export type TrialDepositionComparison = {
    id: string;
    /** مقطع مُحدّد من إفادة المحكمة الحالية (اختياري) */
    trialExcerpt?: string;
    linkedKind?: TrialDepositionLinkKind;
    linkedId?: string;
    /** @deprecated ترحيل — مقارنة نصية قديمة */
    trialText?: string;
    /** @deprecated ترحيل — مقارنة نصية قديمة */
    investigationText?: string;
};

export type TrialDepositionCrossExam = {
    id: string;
    question: string;
    isAsked: boolean;
    liveResponse?: string;
};

export type TrialDeposition = {
    id: string;
    /** ربط اختياري بجلسة محاكمة */
    sessionId?: string;
    date: string;
    giverType: StatementGiverType;
    witnessName: string;
    /** عمر / سكن / صلة — اختياري للشاهد */
    witnessDetails?: string;
    content: string;
    contentHighlights?: StatementContentHighlight[];
    comparisons?: TrialDepositionComparison[];
    crossExamination?: TrialDepositionCrossExam[];
};

const GIVER_TYPES: StatementGiverType[] = ['complainant', 'defendant', 'witness', 'informant'];

function isGiverType(v: unknown): v is StatementGiverType {
    return typeof v === 'string' && GIVER_TYPES.includes(v as StatementGiverType);
}

export function resolveTrialDepositionPersonName(dep: TrialDeposition): string {
    return String(dep.witnessName ?? '').trim();
}

/** إفادات التحقيق لنفس الشخص (مطابقة الاسم). */
export function matchInvestigationStatementsForDeposition(
    dep: TrialDeposition,
    investigationStatements: Statement[],
): Statement[] {
    const target = resolveTrialDepositionPersonName(dep).toLowerCase();
    if (!target) return [];
    return investigationStatements.filter((st) => {
        const name = resolveStatementPersonName(st);
        return name.toLowerCase() === target;
    });
}

export type AddTrialDepositionInput = Omit<TrialDeposition, 'id'>;

export type UpdateTrialDepositionPatch = Partial<
    Omit<TrialDeposition, 'id' | 'comparisons' | 'crossExamination'>
> & {
    comparisons?: TrialDepositionComparison[];
    crossExamination?: TrialDepositionCrossExam[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function createTrialDepositionId(): string {
    return globalThis.crypto &&
        'randomUUID' in globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `td_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeComparison(raw: unknown): TrialDepositionComparison | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    if (!id) return null;

    const trialExcerpt = String(o.trialExcerpt ?? o.trialText ?? '').trim() || undefined;
    const linkedKindRaw = String(o.linkedKind ?? '').trim();
    const linkedKind: TrialDepositionLinkKind | undefined =
        linkedKindRaw === 'statement' || linkedKindRaw === 'trial_deposition'
            ? linkedKindRaw
            : String(o.linkedStatementId ?? '').trim()
              ? 'statement'
              : String(o.linkedTrialDepositionId ?? '').trim()
                ? 'trial_deposition'
                : undefined;
    const linkedId =
        String(o.linkedId ?? o.linkedStatementId ?? o.linkedTrialDepositionId ?? '').trim() || undefined;

    if (linkedKind && linkedId) {
        return { id, trialExcerpt, linkedKind, linkedId };
    }

    const trialText = String(o.trialText ?? '').trim();
    const investigationText = String(o.investigationText ?? '').trim();
    if (!trialText && !investigationText) return null;
    return {
        id,
        trialExcerpt: trialText || undefined,
        trialText: trialText || undefined,
        investigationText: investigationText || undefined,
    };
}

function normalizeCrossExam(raw: unknown): TrialDepositionCrossExam | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    const question = String(o.question ?? '').trim();
    if (!id || !question) return null;
    const liveResponse = String(o.liveResponse ?? '').trim();
    return {
        id,
        question,
        isAsked: o.isAsked === true,
        liveResponse: liveResponse || undefined,
    };
}

export function normalizeTrialDeposition(raw: unknown): TrialDeposition | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    const date = String(o.date ?? '').trim();
    const witnessName = String(o.witnessName ?? '').trim();
    const content = String(o.content ?? '').trim();
    if (!id || !ISO_DATE.test(date) || !witnessName || !content) return null;

    const comparisonsRaw = Array.isArray(o.comparisons) ? o.comparisons : [];
    const comparisons = comparisonsRaw.map(normalizeComparison).filter(Boolean) as TrialDepositionComparison[];

    const crossRaw = Array.isArray(o.crossExamination) ? o.crossExamination : [];
    const crossExamination = crossRaw.map(normalizeCrossExam).filter(Boolean) as TrialDepositionCrossExam[];

    const highlights = sanitizeContentHighlights(o.contentHighlights, content.length);
    const witnessDetails = String(o.witnessDetails ?? '').trim();
    const giverTypeRaw = o.giverType;
    const giverType: StatementGiverType = isGiverType(giverTypeRaw) ? giverTypeRaw : 'witness';

    return {
        id,
        sessionId: String(o.sessionId ?? '').trim() || undefined,
        date,
        giverType,
        witnessName,
        witnessDetails: witnessDetails || undefined,
        content,
        contentHighlights: highlights.length ? highlights : undefined,
        comparisons: comparisons.length ? comparisons : undefined,
        crossExamination: crossExamination.length ? crossExamination : undefined,
    };
}

export function normalizeTrialDepositions(raw: unknown): TrialDeposition[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeTrialDeposition).filter(Boolean) as TrialDeposition[];
}

export function validateAddTrialDepositionInput(input: AddTrialDepositionInput): string | null {
    const date = String(input.date ?? '').trim();
    const witnessName = String(input.witnessName ?? '').trim();
    const content = String(input.content ?? '').trim();
    if (!ISO_DATE.test(date)) return 'تاريخ الإفادة غير صالح.';
    if (!isGiverType(input.giverType)) return 'حدّد صفة المُدلي.';
    if (!witnessName) return 'اسم المُدلي مطلوب.';
    if (!content) return 'نص الإفادة مطلوب.';
    return null;
}

export function sortTrialDepositionsDesc(depositions: TrialDeposition[]): TrialDeposition[] {
    return [...depositions].sort((a, b) => {
        const aT = Date.parse(String(a.date ?? ''));
        const bT = Date.parse(String(b.date ?? ''));
        return (Number.isFinite(bT) ? bT : 0) - (Number.isFinite(aT) ? aT : 0);
    });
}
