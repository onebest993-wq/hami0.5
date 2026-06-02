import { IRAQI_LAW_CANONICAL_NAMES } from '@/app/constants/iraqiLawCatalog';

/** مفتاح القسم العام في شريط التصفية الهرمي */
export type LawStructureSectionId = "execution" | "penal" | "procedure" | "juvenile";

export type LawStructureFilter = {
    id: string;
    label: string;
    from: number;
    to: number;
};

export type LawStructureSection = {
    id: LawStructureSectionId;
    label: string;
    /** يطابق LAW_NAME_BY_TARGET في AdminLawEntry */
    lawName: string;
    filters: LawStructureFilter[];
};

/**
 * هيكلية التصفية الهرمي: قسم عام ← أزرار خاصة بنطاق مواد (مقارنة عددية).
 * يُستخدم للتصفية الفورية على المواد المحملة من list-laws دون تعديل المخطط.
 */
export const LAW_STRUCTURE: Record<LawStructureSectionId, LawStructureSection> = {
    execution: {
        id: "execution",
        label: "قانون التنفيذ",
        lawName: "قانون التنفيذ العراقي رقم 45 لسنة 1980",
        filters: [
            { id: "exec-1-50", label: "أحكام عامة وتعريفات", from: 1, to: 50 },
            { id: "exec-51-120", label: "إجراءات التنفيذ", from: 51, to: 120 },
            { id: "exec-121-200", label: "الحجز والبيع", from: 121, to: 200 },
            { id: "exec-201-plus", label: "أحكام ختامية ومتفرقة", from: 201, to: 9999 },
        ],
    },
    penal: {
        id: "penal",
        label: "قانون العقوبات",
        lawName: IRAQI_LAW_CANONICAL_NAMES.penal,
        filters: [
            { id: "penal-1-50", label: "أحكام عامة", from: 1, to: 50 },
            { id: "penal-51-150", label: "الجزاءات والتدابير", from: 51, to: 150 },
            { id: "penal-151-250", label: "الجرائم ضد الأشخاص", from: 151, to: 250 },
            { id: "penal-251-350", label: "الجرائم ضد المال", from: 251, to: 350 },
            { id: "penal-351-500", label: "جرائم أخرى", from: 351, to: 500 },
            { id: "penal-501-plus", label: "مواد لاحقة ومتفرقة", from: 501, to: 9999 },
        ],
    },
    procedure: {
        id: "procedure",
        label: "أصول المحاكمات الجزائية",
        lawName: IRAQI_LAW_CANONICAL_NAMES.procedure,
        filters: [
            { id: "proc-1-50", label: "أحكام تمهيدية", from: 1, to: 50 },
            { id: "proc-51-120", label: "التحقيق الابتدائي", from: 51, to: 120 },
            { id: "proc-121-200", label: "المحاكمة والجلسات", from: 121, to: 200 },
            { id: "proc-201-280", label: "الطعن والتنفيذ الجزائي", from: 201, to: 280 },
            { id: "proc-281-plus", label: "أحكام ختامية", from: 281, to: 9999 },
        ],
    },
    juvenile: {
        id: "juvenile",
        label: "قانون رعاية الأحداث",
        lawName: IRAQI_LAW_CANONICAL_NAMES.juvenile,
        filters: [
            { id: "juv-1-30", label: "أحكام عامة", from: 1, to: 30 },
            { id: "juv-31-60", label: "إجراءات الرعاية", from: 31, to: 60 },
            { id: "juv-61-90", label: "التدابير والعقوبات", from: 61, to: 90 },
            { id: "juv-91-plus", label: "أحكام متفرقة", from: 91, to: 9999 },
        ],
    },
};

export const LAW_STRUCTURE_SECTION_IDS = Object.keys(LAW_STRUCTURE) as LawStructureSectionId[];

export const ADMIN_LAW_FILTER_PIN_KEY = "hami_admin_law_hierarchical_filter_pin";

export type PinnedLawFilterPath = {
    sectionId: LawStructureSectionId;
    filterId: string;
};

export function normalizeArabicDigits(input: string): string {
    return input
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/** استخراج أول عدد صحيح من رقم المادة للمقارنة العددية */
export function extractArticleSortNumber(articleNumber: string): number | null {
    const normalized = normalizeArabicDigits(String(articleNumber ?? "").trim());
    const m = normalized.match(/\d+/);
    if (!m) return null;
    const n = Number.parseInt(m[0], 10);
    return Number.isFinite(n) ? n : null;
}

export function articleNumberInRange(
    articleNumber: string,
    from: number,
    to: number,
): boolean {
    const n = extractArticleSortNumber(articleNumber);
    if (n === null) return false;
    return n >= from && n <= to;
}

export function readPinnedLawFilter(): PinnedLawFilterPath | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(ADMIN_LAW_FILTER_PIN_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PinnedLawFilterPath;
        if (
            !parsed?.sectionId ||
            !parsed?.filterId ||
            !LAW_STRUCTURE[parsed.sectionId as LawStructureSectionId]
        ) {
            return null;
        }
        const section = LAW_STRUCTURE[parsed.sectionId as LawStructureSectionId];
        if (!section.filters.some((f) => f.id === parsed.filterId)) return null;
        return {
            sectionId: parsed.sectionId as LawStructureSectionId,
            filterId: parsed.filterId,
        };
    } catch {
        return null;
    }
}

export function writePinnedLawFilter(path: PinnedLawFilterPath): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ADMIN_LAW_FILTER_PIN_KEY, JSON.stringify(path));
}

export function clearPinnedLawFilter(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ADMIN_LAW_FILTER_PIN_KEY);
}
