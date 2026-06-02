import type { CaseStage } from '@/app/types/criminal';

export type TrialChargeModification = {
    id: string;
    date: string;
    oldArticle: string;
    newArticle: string;
    legalReason: string;
};

export type ModifyTrialChargeInput = {
    newArticle: string;
    legalReason: string;
    date?: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** مواد معروفة في سياق التطبيق — للتوجيه التمييزي عند تعديل الوصف (م 187). */
const FELONY_ARTICLE_NUMBERS = new Set([
    148, 149, 150, 151, 405, 406, 407, 408, 409, 410, 411, 412, 435, 436, 437, 438, 439, 440,
]);

const MISDEMEANOR_ARTICLE_NUMBERS = new Set([
    413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430,
    431, 432, 433, 434,
]);

export function createTrialChargeModificationId(): string {
    return globalThis.crypto &&
        'randomUUID' in globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `tcm_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function extractArticleNumber(raw: string): number | null {
    const text = String(raw ?? '').trim();
    if (!text) return null;
    const match = text.match(/(\d{2,4})/);
    if (!match) return null;
    const num = Number.parseInt(match[1]!, 10);
    return Number.isFinite(num) ? num : null;
}

export function formatAccusationArticleBadge(article: string): string {
    const trimmed = String(article ?? '').trim();
    if (!trimmed) return '—';
    if (/المادة/i.test(trimmed)) {
        return /عقوبات/i.test(trimmed) ? trimmed : `${trimmed} عقوبات`;
    }
    const num = extractArticleNumber(trimmed);
    if (num !== null) return `المادة ${num} عقوبات`;
    return trimmed;
}

export function inferCaseStageFromAccusationArticle(
    article: string,
    context: { caseStage?: CaseStage; crimeType?: string },
): CaseStage {
    const trimmed = String(article ?? '').trim();
    if (/جنحة|كتاب\s*ثالث|book\s*iii/i.test(trimmed)) return 'misdemeanor';
    if (/جناية|كتاب\s*ثاني|book\s*ii/i.test(trimmed)) return 'felony';

    const num = extractArticleNumber(trimmed);
    if (num !== null) {
        if (MISDEMEANOR_ARTICLE_NUMBERS.has(num)) return 'misdemeanor';
        if (FELONY_ARTICLE_NUMBERS.has(num)) return 'felony';
        if (num >= 435 && num <= 574) return 'felony';
        if (num >= 375 && num <= 434) return 'misdemeanor';
    }

    const crimeType = String(context.crimeType ?? '').trim();
    if (crimeType === 'جناية') return 'felony';
    if (crimeType === 'جنحة') return 'misdemeanor';

    const stage = context.caseStage;
    if (stage === 'felony' || stage === 'misdemeanor') return stage;
    return 'misdemeanor';
}

export function resolveAppealCaseStage(
    fallbackCaseStage: CaseStage,
    currentAccusationArticle: string | undefined,
    crimeType?: string,
): CaseStage {
    const article = String(currentAccusationArticle ?? '').trim();
    if (!article) {
        if (fallbackCaseStage === 'felony' || fallbackCaseStage === 'misdemeanor') return fallbackCaseStage;
        return inferCaseStageFromAccusationArticle('', { caseStage: fallbackCaseStage, crimeType });
    }
    return inferCaseStageFromAccusationArticle(article, { caseStage: fallbackCaseStage, crimeType });
}

function normalizeModification(raw: unknown): TrialChargeModification | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    const date = String(o.date ?? '').trim();
    const oldArticle = String(o.oldArticle ?? '').trim();
    const newArticle = String(o.newArticle ?? '').trim();
    const legalReason = String(o.legalReason ?? '').trim();
    if (!id || !ISO_DATE.test(date) || !oldArticle || !newArticle || !legalReason) return null;
    return { id, date, oldArticle, newArticle, legalReason };
}

export function normalizeChargeModifications(raw: unknown): TrialChargeModification[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeModification).filter(Boolean) as TrialChargeModification[];
}

export function resolveReferralArticleFromCase(input: {
    referralArticle?: string;
    legalArticleHistory?: { article: string }[];
    basicsLegalArticle?: string;
}): string {
    const pinned = String(input.referralArticle ?? '').trim();
    if (pinned) return pinned;
    const history = Array.isArray(input.legalArticleHistory) ? input.legalArticleHistory : [];
    const first = String(history[0]?.article ?? '').trim();
    if (first) return first;
    return String(input.basicsLegalArticle ?? '').trim();
}

export function resolveCurrentAccusationArticleFromCase(input: {
    currentAccusationArticle?: string;
    chargeModifications?: TrialChargeModification[];
    referralArticle?: string;
    legalArticleHistory?: { article: string }[];
    basicsLegalArticle?: string;
}): string {
    const current = String(input.currentAccusationArticle ?? '').trim();
    if (current) return current;
    const mods = normalizeChargeModifications(input.chargeModifications);
    if (mods.length) return mods[mods.length - 1]!.newArticle;
    return resolveReferralArticleFromCase(input);
}

export function validateModifyTrialChargeInput(input: ModifyTrialChargeInput): string | null {
    const newArticle = String(input.newArticle ?? '').trim();
    const legalReason = String(input.legalReason ?? '').trim();
    const date = String(input.date ?? '').trim();
    if (!newArticle) return 'مادة العقوبة الجديدة مطلوبة.';
    if (!legalReason) return 'القرار الإعدادي والأسباب القانونية مطلوبة.';
    if (date && !ISO_DATE.test(date)) return 'تاريخ التعديل غير صالح.';
    return null;
}

export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

export function buildChargeModificationEntry(
    currentArticle: string,
    input: ModifyTrialChargeInput,
): TrialChargeModification {
    return {
        id: createTrialChargeModificationId(),
        date: String(input.date ?? '').trim() || todayIsoDate(),
        oldArticle: String(currentArticle).trim(),
        newArticle: String(input.newArticle).trim(),
        legalReason: String(input.legalReason).trim(),
    };
}

export function seedTrialChargeFieldsOnReferral(
    articleAtReferral: string,
    existing?: { referralArticle?: string; currentAccusationArticle?: string },
): { referralArticle: string; currentAccusationArticle: string } | null {
    const article = String(articleAtReferral ?? '').trim();
    if (!article) return null;
    const pinnedReferral = String(existing?.referralArticle ?? '').trim();
    const current = String(existing?.currentAccusationArticle ?? '').trim();
    return {
        referralArticle: pinnedReferral || article,
        currentAccusationArticle: current || article,
    };
}
