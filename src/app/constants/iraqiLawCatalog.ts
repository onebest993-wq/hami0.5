/** أنواع القوانين المعروضة في LegalCodesTab ولوحة حقن المواد. */
export type IraqiLawCodeType = 'penal' | 'procedure' | 'juvenile';

/** الأسماء الرسمية المخزّنة في iraqi_laws.law_name — يجب أن تطابق add-law و list-laws. */
export const IRAQI_LAW_CANONICAL_NAMES: Record<IraqiLawCodeType, string> = {
    penal: 'قانون العقوبات العراقي رقم 111 لسنة 1969',
    procedure: 'قانون أصول المحاكمات الجزائية العراقي رقم 23 لسنة 1971',
    juvenile: 'قانون رعاية الأحداث العراقي رقم 76 لسنة 1983',
};

export const EXECUTION_LAW_CANONICAL_NAME =
    'قانون التنفيذ العراقي رقم 45 لسنة 1980';

/** القوانين المسموح بها في V1 — لا تُعرض/تُحمَّل غيرها من iraqi_laws. */
export const ALLOWED_IRAQI_LAW_NAMES: readonly string[] = [
    EXECUTION_LAW_CANONICAL_NAME,
    IRAQI_LAW_CANONICAL_NAMES.penal,
    IRAQI_LAW_CANONICAL_NAMES.procedure,
    IRAQI_LAW_CANONICAL_NAMES.juvenile,
];

const ALLOWED_IRAQI_LAW_NAME_SET = new Set<string>(ALLOWED_IRAQI_LAW_NAMES);

export const LAW_NAME_TO_CODE_TYPE: Record<string, IraqiLawCodeType> = {
    [IRAQI_LAW_CANONICAL_NAMES.penal]: 'penal',
    [IRAQI_LAW_CANONICAL_NAMES.procedure]: 'procedure',
    [IRAQI_LAW_CANONICAL_NAMES.juvenile]: 'juvenile',
};

export function isAllowedIraqiLawName(lawName: string): boolean {
    return ALLOWED_IRAQI_LAW_NAME_SET.has(String(lawName ?? '').trim());
}

export function resolveLawCodeTypeFromName(lawName: string): IraqiLawCodeType | null {
    const trimmed = String(lawName ?? '').trim();
    return LAW_NAME_TO_CODE_TYPE[trimmed] ?? null;
}
