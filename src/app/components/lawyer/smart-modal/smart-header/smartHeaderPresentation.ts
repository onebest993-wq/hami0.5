import { formatNumberInput } from '@/app/utils/execution/amountInputCore';

export const GLASS_CHIP =
    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold shrink-0 leading-none';

const MAIN_FILE_CATEGORIES = new Set(['lawsuit', 'transaction', 'execution']);

export function resolveLawsuitTypeLabel(formData: { docType?: string; type?: string }): string {
    const docType = String(formData.docType ?? '').trim();
    if (docType) return docType;
    const type = String(formData.type ?? '').trim();
    if (type && !MAIN_FILE_CATEGORIES.has(type)) return type;
    return '';
}

export function formatClaimValueDisplay(raw: unknown): string {
    const digits = String(raw ?? '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    return formatNumberInput(digits);
}

export function displayMetaField(value: unknown, empty = 'غير محدد'): string {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '—' || raw === '-' || raw === '–') return empty;
    return raw;
}

export function displayCaseNo(caseNo: unknown): string {
    return displayMetaField(caseNo);
}

const IRAQI_NUM_LETTER_YEAR =
    /^(\d{1,8})\s*\/\s*([\u0600-\u06FF]{1,12})\s*\/\s*(\d{4})$/;
const IRAQI_YEAR_LETTER_NUM =
    /^(\d{4})\s*\/\s*([\u0600-\u06FF]{1,12})\s*\/\s*(\d{1,8})$/;
const IRAQI_LETTER_NUM_YEAR =
    /^([\u0600-\u06FF]{1,12})\s*\/\s*(\d{1,8})\s*\/\s*(\d{4})$/;
const IRAQI_LETTER_YEAR_NUM =
    /^([\u0600-\u06FF]{1,12})\s*\/\s*(\d{4})\s*\/\s*(\d{1,8})$/;
const IRAQI_YEAR_NUM_LETTER =
    /^(\d{4})\s*\/\s*(\d{1,8})\s*\/\s*([\u0600-\u06FF]{1,12})$/;

export function isIraqiPleadingCaseNo(raw: string): boolean {
    const t = raw.trim();
    return IRAQI_NUM_LETTER_YEAR.test(t)
        || IRAQI_YEAR_LETTER_NUM.test(t)
        || IRAQI_LETTER_NUM_YEAR.test(t)
        || IRAQI_LETTER_YEAR_NUM.test(t)
        || IRAQI_YEAR_NUM_LETTER.test(t);
}

/** عرض رقم الدعوى العراقية: رقم / حرف المرحلة / السنة */
export function formatIraqiCaseNoForPaint(raw: string): string {
    const t = raw.trim();
    const numberLetterYear = t.match(IRAQI_NUM_LETTER_YEAR);
    if (numberLetterYear) {
        return `${numberLetterYear[1]}/${numberLetterYear[2]}/${numberLetterYear[3]}`;
    }
    const yearLetterNumber = t.match(IRAQI_YEAR_LETTER_NUM);
    if (yearLetterNumber) {
        return `${yearLetterNumber[3]}/${yearLetterNumber[2]}/${yearLetterNumber[1]}`;
    }
    const letterNumberYear = t.match(IRAQI_LETTER_NUM_YEAR);
    if (letterNumberYear) {
        return `${letterNumberYear[2]}/${letterNumberYear[1]}/${letterNumberYear[3]}`;
    }
    const letterYearNumber = t.match(IRAQI_LETTER_YEAR_NUM);
    if (letterYearNumber) {
        return `${letterYearNumber[3]}/${letterYearNumber[1]}/${letterYearNumber[2]}`;
    }
    const yearNumberLetter = t.match(IRAQI_YEAR_NUM_LETTER);
    if (yearNumberLetter) {
        return `${yearNumberLetter[2]}/${yearNumberLetter[3]}/${yearNumberLetter[1]}`;
    }
    return t;
}

export function paintCaseNo(caseNo: unknown): string {
    const shown = displayMetaField(caseNo);
    if (shown === 'غير محدد') return shown;
    return formatIraqiCaseNoForPaint(shown);
}

export function caseNoTextDir(caseNo: unknown): 'ltr' | 'rtl' {
    const raw = String(caseNo ?? '').trim();
    if (!raw) return 'rtl';
    if (isIraqiPleadingCaseNo(raw) || /^\d/.test(raw)) return 'ltr';
    return /[\u0600-\u06FF]/.test(raw) ? 'rtl' : 'ltr';
}

export const PARTY_STRIP_SHELL =
    'rounded-2xl border border-white/[0.07] bg-[#0C1220]/88 shadow-[0_6px_18px_rgba(0,0,0,0.18)]';

export const CLIENT_MARKER_SLOT = 'shrink-0 min-w-[2.25rem] flex items-center justify-center';
