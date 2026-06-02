import type { LawFilterEntry } from './lawFilters';
import {
    articleMatchesStructuredLawFilter,
    expandSubArticleNumbers,
    extractArticleNumber,
    formatSubArticlesLabel,
} from './lawFilters';

export type { LawFilterEntry };

/**
 * هيكلية تصفية قانون رعاية الأحداث رقم 76 لسنة 1983 — المواد 1–112.
 * تبويبات رئيسية + رقاقات فرعية (start/end) كما في واجهة LegalCodesTab.
 */
export const JUVENILE_LAW_FILTERS: Record<string, LawFilterEntry> = {
    'المبادئ والتأسيس (1–15)': {
        range: [1, 15],
        sub: {
            'كل القسم': [1, 15],
            'الأهداف والسريان': [1, 5],
            'مجلس الأحداث': [6, 8],
            'دور ومدارس التأهيل': [9, 11],
            'مكتب دراسة الشخصية': [12, 15],
        },
    },
    'الحماية والضم (16–46)': {
        range: [16, 46],
        sub: {
            'كل القسم': [16, 46],
            'الاكتشاف المبكر والشرطة': [16, 23],
            'التشرد والانحراف': [24, 28],
            'مسؤولية الأولياء': [29, 30],
            'سلب وحد الولاية': [31, 38],
            'أحكام الضم والنسب': [39, 46],
        },
    },
    'قضاء الأحداث (47–71)': {
        range: [47, 71],
        sub: {
            'كل القسم': [47, 71],
            'إجراءات التحقيق': [47, 53],
            'المحاكمة والتمييز': [54, 71],
        },
    },
    'التدابير والإصلاح (72–86)': {
        range: [72, 86],
        sub: {
            'كل القسم': [72, 86],
            'تدابير المخالفات': [72, 72],
            'تدابير الجنح': [73, 75],
            'تدابير الجنايات': [76, 81],
            'النقل والإفراج الشرطي': [82, 86],
        },
    },
    'المراقبة والرعاية (87–112)': {
        range: [87, 112],
        sub: {
            'كل القسم': [87, 112],
            'مراقبة السلوك': [87, 98],
            'الرعاية اللاحقة': [99, 107],
            'أحكام ختامية': [108, 112],
        },
    },
};

export const JUVENILE_LAW_FILTER_GENERAL_KEYS = Object.keys(JUVENILE_LAW_FILTERS);

export const LEGAL_CODES_JUVENILE_FILTER_PIN_KEY = 'hami_legal_codes_juvenile_filter_pin';

export type JuvenileFilterPin = {
    general: string;
    sub: string | null;
};

/** يطابق article_number ضمن نطاق التبويب/الرقاقة المختارة. */
export function articleMatchesJuvenileLawFilter(
    articleNumber: string,
    generalKey: string | null,
    subKey: string | null,
): boolean {
    return articleMatchesStructuredLawFilter(
        articleNumber,
        JUVENILE_LAW_FILTERS,
        generalKey,
        subKey,
    );
}

/** يُرجع نطاق [start, end] للرقاقة الفرعية أو للتبويب عند غياب رقاقة. */
export function resolveJuvenileFilterArticleRange(
    generalKey: string | null,
    subKey: string | null,
): { start: number; end: number } | null {
    if (!generalKey) return null;
    const entry = JUVENILE_LAW_FILTERS[generalKey];
    if (!entry) return null;

    if (subKey) {
        const subNums = entry.sub[subKey];
        if (subNums?.length) {
            const expanded = [...expandSubArticleNumbers(subNums)].sort((a, b) => a - b);
            if (expanded.length) {
                return { start: expanded[0]!, end: expanded[expanded.length - 1]! };
            }
        }
    }

    return { start: entry.range[0], end: entry.range[1] };
}

/** فلترة قائمة المواد المحلية (cache) حسب التبويب/الرقاقة. */
export function filterJuvenileLawArticles<T extends { articleNumber: string }>(
    articles: T[],
    generalKey: string | null,
    subKey: string | null,
): T[] {
    if (!generalKey) return articles;
    return articles.filter((a) =>
        articleMatchesJuvenileLawFilter(a.articleNumber, generalKey, subKey),
    );
}

export function readJuvenileFilterPin(): JuvenileFilterPin | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(LEGAL_CODES_JUVENILE_FILTER_PIN_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as JuvenileFilterPin;
        if (!parsed?.general || !JUVENILE_LAW_FILTERS[parsed.general]) return null;
        if (parsed.sub && !JUVENILE_LAW_FILTERS[parsed.general].sub[parsed.sub]) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeJuvenileFilterPin(path: JuvenileFilterPin): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LEGAL_CODES_JUVENILE_FILTER_PIN_KEY, JSON.stringify(path));
}

export function clearJuvenileFilterPin(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LEGAL_CODES_JUVENILE_FILTER_PIN_KEY);
}

export { formatSubArticlesLabel, extractArticleNumber };
