/** هيكلية تصفية أصول المحاكمات الجزائية — من المادة 1 إلى 373 */
export type LawFilterEntry = {
    range: [number, number];
    sub: Record<string, number[]>;
};

export const LAW_FILTERS: Record<string, LawFilterEntry> = {
    "تحريك الدعوى الجزائية": {
        range: [1, 9],
        sub: {
            "تقديم الشكوى": [1],
            "شروط الشكوى": [3, 4, 6],
            "التنازل": [8, 9],
        },
    },
    "الدعوى المدنية": {
        range: [10, 29],
        sub: {
            "تدخل المدعي والمسؤول": [10, 14],
            "الاعتراض والطعن": [15, 17],
            "ترك الدعوى": [21, 25],
        },
    },
    "الضبط القضائي": {
        range: [39, 46],
        sub: {
            "مهام الضبط": [39, 42],
            "الجرائم المشهودة": [43, 46],
        },
    },
    "الإخبار عن الجرائم": {
        range: [47, 50],
        sub: {
            "واجبات الإخبار": [47, 48],
            "إجراءات الشرطة": [49, 50],
        },
    },
    "إجراءات التحقيق الأولية": {
        range: [51, 71],
        sub: {
            "الاختصاص القضائي": [53, 55],
            "الكشف والمعاينة": [52, 56],
            "سماع الشهود": [58, 68],
            "الخبراء": [69, 71],
        },
    },
    التفتيش: {
        range: [72, 86],
        sub: {
            "أوامر التفتيش": [72, 76],
            "إجراءات التفتيش": [77, 82],
            "الأختام والأوراق": [83, 86],
        },
    },
    "التكليف بالحضور": {
        range: [87, 91],
        sub: {
            "أصول التبليغ": [87, 91],
        },
    },
    القبض: {
        range: [92, 108],
        sub: {
            "أوامر القبض": [92, 98],
            "القبض المشهود": [102, 108],
        },
    },
    "التوقيف والكفالات": {
        range: [109, 122],
        sub: {
            "أحكام التوقيف": [109, 113],
            الكفالات: [114, 120],
            "حجز الأموال": [121, 122],
        },
    },
    "استجواب المتهم": {
        range: [123, 129],
        sub: {
            "إجراءات الاستجواب": [123, 128],
            "العفو عن المتهم": [129],
        },
    },
    "نهاية التحقيق": {
        range: [130, 136],
        sub: {
            "قرارات الإحالة والغلق": [130, 136],
        },
    },
    "الاختصاص القضائي": {
        range: [137, 142],
        sub: {
            "توزيع الدعاوى": [137, 139],
            "تنازع الاختصاص": [140, 142],
        },
    },
    "إجراءات المحاكمة": {
        range: [143, 186],
        sub: {
            "الحضور والغياب": [143, 151],
            "نظام الجلسة": [152, 159],
            "الشهود والأدلة": [168, 178],
        },
    },
    التهمة: {
        range: [187, 193],
        sub: {
            "تحرير التهمة": [187, 189],
            "تعديل التهمة": [190, 193],
        },
    },
    الصلح: {
        range: [194, 198],
        sub: {
            "إجراءات الصلح": [194, 198],
        },
    },
    الحكم: {
        range: [212, 229],
        sub: {
            "الأدلة والحجية": [212, 221],
            "صياغة الحكم": [222, 229],
        },
    },
    "محاكمات خاصة": {
        range: [230, 242],
        sub: {
            المعتوهون: [230, 232],
            الأحداث: [233, 242],
        },
    },
    "طرق الطعن": {
        range: [243, 279],
        sub: {
            الاعتراض: [243, 248],
            التمييز: [249, 265],
            "تصحيح القرار": [266, 269],
            "إعادة المحاكمة": [270, 279],
        },
    },
    التنفيذ: {
        range: [280, 299],
        sub: {
            "تنفيذ الإعدام": [285, 293],
            "عقوبات سالبة للحرية": [294, 297],
            الغرامات: [298, 299],
        },
    },
    "أحكام ختامية": {
        range: [300, 373],
        sub: {
            "انقضاء الدعوى": [300, 307],
            المضبوطات: [308, 316],
            "تسليم المجرمين": [357, 368],
        },
    },
};

export const LAW_FILTER_GENERAL_KEYS = Object.keys(LAW_FILTERS);

export const LEGAL_CODES_PROCEDURE_FILTER_PIN_KEY = "hami_legal_codes_procedure_filter_pin";

export type ProcedureFilterPin = {
    general: string;
    sub: string | null;
};

export function normalizeArabicDigits(input: string): string {
    return input
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/** استخراج رقم المادة كعدد صحيح للمقارنة */
export function extractArticleNumber(articleNumber: string): number | null {
    const normalized = normalizeArabicDigits(String(articleNumber ?? "").trim());
    const m = normalized.match(/\d+/);
    if (!m) return null;
    const n = Number.parseInt(m[0], 10);
    return Number.isFinite(n) ? n : null;
}

/**
 * يوسّع مصفوفة المواد الفرعية:
 * - إذا كانت متصلة (مثل 87 و 91 مع كل الأرقام بينهما) → نطاق شامل.
 * - إذا كانت متقطعة (مثل 3، 4، 6) → أرقام محددة فقط.
 */
export function expandSubArticleNumbers(nums: number[]): Set<number> {
    if (nums.length === 0) return new Set();
    if (nums.length === 1) return new Set(nums);
    if (nums.length === 2) {
        const [start, end] = nums;
        if (start <= end) {
            const out = new Set<number>();
            for (let i = start; i <= end; i++) out.add(i);
            return out;
        }
    }
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const isContiguous = nums.length === max - min + 1;
    if (isContiguous) {
        const out = new Set<number>();
        for (let i = min; i <= max; i++) out.add(i);
        return out;
    }
    return new Set(nums);
}

export function formatSubArticlesLabel(nums: number[]): string {
    const expanded = [...expandSubArticleNumbers(nums)].sort((a, b) => a - b);
    if (expanded.length === 0) return "";
    if (expanded.length === 1) return String(expanded[0]);
    const isRange =
        expanded.length === expanded[expanded.length - 1] - expanded[0] + 1;
    if (isRange) {
        return `${expanded[0]}–${expanded[expanded.length - 1]}`;
    }
    return expanded.join("،");
}

export function articleMatchesProcedureLawFilter(
    articleNumber: string,
    generalKey: string | null,
    subKey: string | null,
): boolean {
    return articleMatchesStructuredLawFilter(articleNumber, LAW_FILTERS, generalKey, subKey);
}

/** فلترة مواد قانونية حسب خريطة تبويب/رقاقات (أصول المحاكمات، رعاية الأحداث، …). */
export function articleMatchesStructuredLawFilter(
    articleNumber: string,
    filters: Record<string, LawFilterEntry>,
    generalKey: string | null,
    subKey: string | null,
): boolean {
    if (!generalKey) return true;
    const entry = filters[generalKey];
    if (!entry) return true;
    const n = extractArticleNumber(articleNumber);
    if (n === null) return false;

    if (subKey) {
        const subNums = entry.sub[subKey];
        if (subNums) {
            return expandSubArticleNumbers(subNums).has(n);
        }
    }

    return n >= entry.range[0] && n <= entry.range[1];
}

export function readProcedureFilterPin(): ProcedureFilterPin | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(LEGAL_CODES_PROCEDURE_FILTER_PIN_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ProcedureFilterPin;
        if (!parsed?.general || !LAW_FILTERS[parsed.general]) return null;
        if (parsed.sub && !LAW_FILTERS[parsed.general].sub[parsed.sub]) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeProcedureFilterPin(path: ProcedureFilterPin): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEGAL_CODES_PROCEDURE_FILTER_PIN_KEY, JSON.stringify(path));
}

export function clearProcedureFilterPin(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LEGAL_CODES_PROCEDURE_FILTER_PIN_KEY);
}
