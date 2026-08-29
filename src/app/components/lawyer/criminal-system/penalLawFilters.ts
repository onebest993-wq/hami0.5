import type { LawFilterEntry } from './lawFilters';
import {
    articleMatchesStructuredLawFilter,
    expandSubArticleNumbers,
    extractArticleNumber,
    formatSubArticlesLabel,
} from './lawFilters';

export type { LawFilterEntry };

/**
 * هيكلية تصفية قانون العقوبات العراقي رقم 111 لسنة 1969 — المواد 1–506.
 * تسع مجموعات عامة + تصنيفات فرعية (start/end) كما في واجهة LegalCodesTab.
 */
export const PENAL_LAW_FILTERS: Record<string, LawFilterEntry> = {
    'المبادئ العامة (1–100)': {
        range: [1, 100],
        sub: {
            الشرعية: [1, 5],
            الاختصاص: [6, 15],
            'أنواع الجرائم': [16, 22],
            'جسامة الجرائم': [23, 27],
            'الركن المادي': [28, 29],
            الشروع: [30, 32],
            القصد: [33, 38],
            الإباحة: [39, 46],
            الفاعلية: [47, 50],
            الاشتراك: [51, 54],
            الاتفاق: [55, 59],
            الأهلية: [60, 63],
            الأحداث: [64, 80],
            النشر: [81, 84],
            'العقوبات الأصلية': [85, 94],
            'العقوبات التبعية': [95, 100],
        },
    },
    'الدولة والسلطات (101–232)': {
        range: [101, 232],
        sub: {
            التخابر: [101, 155],
            التمرد: [156, 189],
            'تخريب المرافق': [190, 200],
            'الجمعيات المحظورة': [201, 224],
            'إهانة الدولة': [225, 228],
            'مقاومة الموظفين': [229, 232],
        },
    },
    'العدالة (233–273)': {
        range: [233, 273],
        sub: {
            'التأثير على القضاء': [233, 235],
            'عصيان الأوامر': [236, 242],
            'الإخبار الكاذب': [243, 247],
            'تضليل القضاء': [248, 250],
            'شهادة الزور': [251, 257],
            'اليمين الكاذبة': [258, 259],
            الانتحال: [260, 262],
            'كسر الأختام': [263, 266],
            الهروب: [267, 273],
        },
    },
    'التزوير والفساد (274–341)': {
        range: [274, 341],
        sub: {
            'تزوير الأختام': [274, 279],
            'تزييف العملة': [280, 285],
            'تزوير المحررات': [286, 306],
            الرشوة: [307, 314],
            الاختلاس: [315, 321],
            'تجاوز السلطة': [322, 335],
            'الإضرار بالمصلحة': [336, 341],
        },
    },
    'الجرائم العامة (342–375)': {
        range: [342, 375],
        sub: {
            'الحريق العمد': [342, 348],
            الإغراق: [349, 350],
            'تلويث البيئة': [351, 353],
            'تعطيل المواصلات': [354, 363],
            'الإضرار بالمرافق': [364, 367],
            'نشر الأمراض': [368, 369],
            'الامتناع عن الإغاثة': [370, 371],
            'انتهاك المقدسات': [372, 375],
        },
    },
    'الأسرة والأخلاق (376–404)': {
        range: [376, 404],
        sub: {
            'الزواج الباطل': [376],
            الزنا: [377, 380],
            'إبعاد الأطفال': [381, 382],
            'التعريض للخطر': [383],
            النفقة: [384],
            'زنا المحارم': [385],
            السكر: [386, 388],
            القمار: [389],
            التسول: [390, 392],
            الاغتصاب: [393, 395],
            'هتك العرض': [396, 398],
            'التحريض على الفسق': [399],
            'الفعل الفاضح': [400, 404],
        },
    },
    'جرائم الأشخاص (405–427)': {
        range: [405, 427],
        sub: {
            'القتل العمد': [405, 409],
            'الضرب المفضي للموت': [410],
            'القتل الخطأ': [411],
            'العاهة المستديمة': [412],
            'الإيذاء العمد': [413, 415],
            'الإيذاء الخطأ': [416],
            الإجهاض: [417, 419],
            'إخفاء الجثث': [420],
            الخطف: [421, 427],
        },
    },
    'جرائم الأموال (428–486)': {
        range: [428, 486],
        sub: {
            'انتهاك المسكن': [428, 429],
            التهديد: [430, 432],
            القذف: [433],
            السب: [434, 436],
            'إفشاء الأسرار': [437, 438],
            السرقة: [439, 446],
            'أدوات السرقة': [447],
            'تحريض الأحداث': [448],
            'التهرب من الدفع': [449],
            'الاستيلاء على اللقطة': [450],
            الابتزاز: [451, 452],
            'خيانة الأمانة': [453, 455],
            الاحتيال: [456, 458],
            'الصك بدون رصيد': [459],
            'إخفاء المسروقات': [460, 463],
            'التلاعب بالمزايدات': [464],
            الربا: [465],
            'الغش التجاري': [466, 467],
            الإفلاس: [468, 476],
            'الملكية المعنوية': [477],
            التخريب: [478, 479],
            'إتلاف المزروعات': [480, 482],
            'امتناع عن النفقة': [483],
            'الاعتداء على الحيوان': [484, 486],
        },
    },
    'المخالفات (487–506)': {
        range: [487, 506],
        sub: {
            'مخالفات الطرق': [487, 493],
            'إهمال المباني': [494],
            'إقلاق الراحة': [495, 497],
            'كتمان الجرائم': [498],
            'مخالفات بيئية': [499, 500],
            'مخالفات الآداب': [501, 502],
            'سجلات الفنادق': [503],
            'أحكام ختامية': [504, 506],
        },
    },
};

export const PENAL_LAW_FILTER_GENERAL_KEYS = Object.keys(PENAL_LAW_FILTERS);

const LEGAL_CODES_PENAL_FILTER_PIN_KEY = 'hami_legal_codes_penal_filter_pin';

type PenalFilterPin = {
    general: string;
    sub: string | null;
};

export function articleMatchesPenalLawFilter(
    articleNumber: string,
    generalKey: string | null,
    subKey: string | null,
): boolean {
    return articleMatchesStructuredLawFilter(
        articleNumber,
        PENAL_LAW_FILTERS,
        generalKey,
        subKey,
    );
}

export function resolvePenalFilterArticleRange(
    generalKey: string | null,
    subKey: string | null,
): { start: number; end: number } | null {
    if (!generalKey) return null;
    const entry = PENAL_LAW_FILTERS[generalKey];
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

export function filterPenalLawArticles<T extends { articleNumber: string }>(
    articles: T[],
    generalKey: string | null,
    subKey: string | null,
): T[] {
    if (!generalKey) return articles;
    return articles.filter((a) =>
        articleMatchesPenalLawFilter(a.articleNumber, generalKey, subKey),
    );
}

export function readPenalFilterPin(): PenalFilterPin | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(LEGAL_CODES_PENAL_FILTER_PIN_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PenalFilterPin;
        if (!parsed?.general || !PENAL_LAW_FILTERS[parsed.general]) return null;
        if (parsed.sub && !PENAL_LAW_FILTERS[parsed.general].sub[parsed.sub]) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writePenalFilterPin(path: PenalFilterPin): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LEGAL_CODES_PENAL_FILTER_PIN_KEY, JSON.stringify(path));
}

export function clearPenalFilterPin(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LEGAL_CODES_PENAL_FILTER_PIN_KEY);
}

export { formatSubArticlesLabel, extractArticleNumber };
