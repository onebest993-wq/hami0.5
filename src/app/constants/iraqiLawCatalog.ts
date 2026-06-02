/** أنواع القوانين المعروضة في LegalCodesTab ولوحة حقن المواد. */
export type IraqiLawCodeType = 'penal' | 'procedure' | 'juvenile';

/** الأسماء الرسمية المخزّنة في iraqi_laws.law_name — يجب أن تطابق add-law و list-laws. */
export const IRAQI_LAW_CANONICAL_NAMES: Record<IraqiLawCodeType, string> = {
    penal: 'قانون العقوبات العراقي رقم 111 لسنة 1969',
    procedure: 'قانون أصول المحاكمات الجزائية العراقي رقم 23 لسنة 1971',
    juvenile: 'قانون رعاية الأحداث العراقي رقم 76 لسنة 1983',
};

export const LAW_NAME_TO_CODE_TYPE: Record<string, IraqiLawCodeType> = {
    [IRAQI_LAW_CANONICAL_NAMES.penal]: 'penal',
    [IRAQI_LAW_CANONICAL_NAMES.procedure]: 'procedure',
    [IRAQI_LAW_CANONICAL_NAMES.juvenile]: 'juvenile',
};

export function resolveLawCodeTypeFromName(lawName: string): IraqiLawCodeType | null {
    const trimmed = String(lawName ?? '').trim();
    return LAW_NAME_TO_CODE_TYPE[trimmed] ?? null;
}
