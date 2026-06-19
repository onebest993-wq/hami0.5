/** قوانين الأحوال الشخصية — حقن وعرض منفصل عن المدني. */
export const PERSONAL_STATUS_LAW_188_CANONICAL_NAME =
    'قانون الأحوال الشخصية رقم 188 لسنة 1959';

export const JAFSARI_CODE_CANONICAL_NAME = 'المدونة الجعفرية';

/** قوانين تطبيقية/فرعية تُعرض مع قانون 188 عند اختياره. */
export const PERSONAL_STATUS_SUPPLEMENTARY_CANONICAL_NAME =
    'قوانين الأحوال الشخصية التطبيقية';

export type PersonalStatusLawCodeType =
    | 'personal_status_188'
    | 'personal_status_supplementary'
    | 'jaafari_code';

export const PERSONAL_STATUS_LAW_CANONICAL_NAMES: Record<
    PersonalStatusLawCodeType,
    string
> = {
    personal_status_188: PERSONAL_STATUS_LAW_188_CANONICAL_NAME,
    personal_status_supplementary: PERSONAL_STATUS_SUPPLEMENTARY_CANONICAL_NAME,
    jaafari_code: JAFSARI_CODE_CANONICAL_NAME,
};

export const PERSONAL_STATUS_LAW_NAME_TO_CODE: Record<string, PersonalStatusLawCodeType> = {
    [PERSONAL_STATUS_LAW_188_CANONICAL_NAME]: 'personal_status_188',
    [PERSONAL_STATUS_SUPPLEMENTARY_CANONICAL_NAME]: 'personal_status_supplementary',
    [JAFSARI_CODE_CANONICAL_NAME]: 'jaafari_code',
};

export function resolvePersonalStatusLawCodeType(lawName: string): PersonalStatusLawCodeType | null {
    return PERSONAL_STATUS_LAW_NAME_TO_CODE[String(lawName ?? '').trim()] ?? null;
}
