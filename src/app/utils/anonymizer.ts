export interface AnonymizerOriginalData {
    creditorName?: string;
    debtorName?: string;
    debtAmount?: number | string;
}

const CREDITOR_TOKEN = '[الدائن]';
const DEBTOR_TOKEN = '[المدين]';
const AMOUNT_TOKEN = '[مبلغ الدين]';

function asCleanText(value: unknown): string {
    return String(value ?? '').trim();
}

function deepMap(value: unknown, mapString: (s: string) => string): unknown {
    if (typeof value === 'string') return mapString(value);
    if (Array.isArray(value)) return value.map((v) => deepMap(v, mapString));
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = deepMap(v, mapString);
        }
        return out;
    }
    return value;
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceAllSafe(input: string, needle: string, replacement: string): string {
    const n = asCleanText(needle);
    if (!n) return input;
    return input.replace(new RegExp(escapeRegExp(n), 'g'), replacement);
}

function buildAmountVariants(value?: number | string): string[] {
    const base = asCleanText(value);
    if (!base) return [];
    const n = Number(base);
    if (!Number.isFinite(n)) return [base];
    return Array.from(
        new Set([
            String(n),
            n.toLocaleString('en-US'),
            n.toLocaleString('ar-IQ'),
            n.toLocaleString('ar-IQ-u-nu-latn'),
            base,
        ])
    ).filter(Boolean);
}

export function anonymizeCaseData<T>(snapshot: T, originalData: AnonymizerOriginalData): T {
    const creditor = asCleanText(originalData.creditorName);
    const debtor = asCleanText(originalData.debtorName);
    const amountVariants = buildAmountVariants(originalData.debtAmount);

    return deepMap(snapshot, (text) => {
        let result = text;
        if (creditor) result = replaceAllSafe(result, creditor, CREDITOR_TOKEN);
        if (debtor) result = replaceAllSafe(result, debtor, DEBTOR_TOKEN);
        for (const v of amountVariants) {
            result = replaceAllSafe(result, v, AMOUNT_TOKEN);
        }
        return result;
    }) as T;
}

export function deanonymizeResponse<T>(aiResponse: T, originalData: AnonymizerOriginalData): T {
    const creditor = asCleanText(originalData.creditorName) || 'الدائن';
    const debtor = asCleanText(originalData.debtorName) || 'المدين';
    const amount = asCleanText(originalData.debtAmount) || 'المبلغ';

    return deepMap(aiResponse, (text) =>
        text
            .split(CREDITOR_TOKEN)
            .join(creditor)
            .split(DEBTOR_TOKEN)
            .join(debtor)
            .split(AMOUNT_TOKEN)
            .join(amount)
    ) as T;
}
