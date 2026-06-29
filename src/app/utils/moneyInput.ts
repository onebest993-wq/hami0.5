const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** ٠-٩ و ۰-۹ → ASCII */
export function normalizeIndicDigits(input: string): string {
    return String(input)
        .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String(PERSIAN_INDIC.indexOf(d)));
}

/** إزالة فواصل المبالغ مع دعم الأرقام العربية */
export function stripMoneyGrouping(input: string): string {
    return normalizeIndicDigits(input)
        .replace(/[,\u066C\u060C\s]/g, '')
        .replace(/\u066B/g, '.');
}

export function isPartialMoneyInput(raw: string): boolean {
    if (raw === '' || raw === '.') return true;
    return !Number.isNaN(Number(raw));
}

export function handleMoneyInputChange(
    displayValue: string,
    setter: (val: string) => void,
): void {
    const rawValue = stripMoneyGrouping(String(displayValue).replace(/,/g, ''));
    if (isPartialMoneyInput(rawValue)) {
        setter(rawValue);
    }
}

/** عرض مبلغ صحيح مع فواصل آلاف (بعد normalize) */
export function formatMoneyIntegerDisplay(value: string | number | null | undefined): string {
    const number = stripMoneyGrouping(String(value ?? '')).replace(/\D/g, '');
    if (!number) return '';
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
