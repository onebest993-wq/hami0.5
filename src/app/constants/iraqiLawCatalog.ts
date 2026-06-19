/** أنواع القوانين المعروضة في LegalCodesTab ولوحة حقن المواد. */
import {
    JAFSARI_CODE_CANONICAL_NAME,
    PERSONAL_STATUS_LAW_188_CANONICAL_NAME,
    PERSONAL_STATUS_SUPPLEMENTARY_CANONICAL_NAME,
} from '@/app/constants/personalStatusLawCatalog';

export type IraqiLawCodeType = 'penal' | 'procedure' | 'juvenile';

/** قوانين الدعاوى المدنية — مرجع إضبارة الدعوى. */
export type CivilLawCodeType = 'civil_procedure' | 'evidence';
export const IRAQI_LAW_CANONICAL_NAMES: Record<IraqiLawCodeType, string> = {
    penal: 'قانون العقوبات العراقي رقم 111 لسنة 1969',
    procedure: 'قانون أصول المحاكمات الجزائية العراقي رقم 23 لسنة 1971',
    juvenile: 'قانون رعاية الأحداث العراقي رقم 76 لسنة 1983',
};

export const CIVIL_PROCEDURE_LAW_CANONICAL_NAME =
    'قانون المرافعات المدنية العراقي رقم 83 لسنة 1969';

export const EVIDENCE_LAW_CANONICAL_NAME = 'قانون الإثبات العراقي رقم 107 لسنة 1979';

export const CIVIL_LAW_CANONICAL_NAMES: Record<CivilLawCodeType, string> = {
    civil_procedure: CIVIL_PROCEDURE_LAW_CANONICAL_NAME,
    evidence: EVIDENCE_LAW_CANONICAL_NAME,
};

export const EXECUTION_LAW_CANONICAL_NAME =
    'قانون التنفيذ العراقي رقم 45 لسنة 1980';

/** القوانين المسموح بها — لا تُعرض/تُحمَّل غيرها من iraqi_laws. */
export const ALLOWED_IRAQI_LAW_NAMES: readonly string[] = [
    EXECUTION_LAW_CANONICAL_NAME,
    IRAQI_LAW_CANONICAL_NAMES.penal,
    IRAQI_LAW_CANONICAL_NAMES.procedure,
    IRAQI_LAW_CANONICAL_NAMES.juvenile,
    CIVIL_PROCEDURE_LAW_CANONICAL_NAME,
    EVIDENCE_LAW_CANONICAL_NAME,
    PERSONAL_STATUS_LAW_188_CANONICAL_NAME,
    PERSONAL_STATUS_SUPPLEMENTARY_CANONICAL_NAME,
    JAFSARI_CODE_CANONICAL_NAME,
];

const ALLOWED_IRAQI_LAW_NAME_SET = new Set<string>(ALLOWED_IRAQI_LAW_NAMES);

export const LAW_NAME_TO_CODE_TYPE: Record<string, IraqiLawCodeType> = {
    [IRAQI_LAW_CANONICAL_NAMES.penal]: 'penal',
    [IRAQI_LAW_CANONICAL_NAMES.procedure]: 'procedure',
    [IRAQI_LAW_CANONICAL_NAMES.juvenile]: 'juvenile',
};

export const CIVIL_LAW_NAME_TO_CODE_TYPE: Record<string, CivilLawCodeType> = {
    [CIVIL_PROCEDURE_LAW_CANONICAL_NAME]: 'civil_procedure',
    [EVIDENCE_LAW_CANONICAL_NAME]: 'evidence',
};

export function isAllowedIraqiLawName(lawName: string): boolean {
    return ALLOWED_IRAQI_LAW_NAME_SET.has(String(lawName ?? '').trim());
}

export function resolveLawCodeTypeFromName(lawName: string): IraqiLawCodeType | null {
    const trimmed = String(lawName ?? '').trim();
    return LAW_NAME_TO_CODE_TYPE[trimmed] ?? null;
}

export function resolveCivilLawCodeTypeFromName(lawName: string): CivilLawCodeType | null {
    const trimmed = String(lawName ?? '').trim();
    return CIVIL_LAW_NAME_TO_CODE_TYPE[trimmed] ?? null;
}
