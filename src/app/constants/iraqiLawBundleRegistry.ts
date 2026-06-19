import {
    CIVIL_PROCEDURE_LAW_CANONICAL_NAME,
    EVIDENCE_LAW_CANONICAL_NAME,
    EXECUTION_LAW_CANONICAL_NAME,
    IRAQI_LAW_CANONICAL_NAMES,
    isAllowedIraqiLawName,
} from '@/app/constants/iraqiLawCatalog';
import {
    JAFSARI_CODE_CANONICAL_NAME,
    PERSONAL_STATUS_LAW_188_CANONICAL_NAME,
    PERSONAL_STATUS_SUPPLEMENTARY_CANONICAL_NAME,
} from '@/app/constants/personalStatusLawCatalog';

/** معرّف ملف مستقل لكل قانون — بدون تداخل بين الملفات. */
export type IraqiLawBundleSlug =
    | 'execution'
    | 'penal'
    | 'criminal-procedure'
    | 'juvenile'
    | 'civil-procedure'
    | 'evidence'
    | 'personal-status-188'
    | 'personal-status-supplementary'
    | 'jaafari-code';

export type IraqiLawBundleArticle = {
    article_number: string;
    content: string;
};

export type IraqiLawBundleFile = {
    schemaVersion: 1;
    law_name: string;
    articles: IraqiLawBundleArticle[];
};

export const IRAQI_LAW_BUNDLE_FILE_SUFFIX = '.articles.json';

export const LAW_NAME_TO_BUNDLE_SLUG: Record<string, IraqiLawBundleSlug> = {
    [EXECUTION_LAW_CANONICAL_NAME]: 'execution',
    [IRAQI_LAW_CANONICAL_NAMES.penal]: 'penal',
    [IRAQI_LAW_CANONICAL_NAMES.procedure]: 'criminal-procedure',
    [IRAQI_LAW_CANONICAL_NAMES.juvenile]: 'juvenile',
    [CIVIL_PROCEDURE_LAW_CANONICAL_NAME]: 'civil-procedure',
    [EVIDENCE_LAW_CANONICAL_NAME]: 'evidence',
    [PERSONAL_STATUS_LAW_188_CANONICAL_NAME]: 'personal-status-188',
    [PERSONAL_STATUS_SUPPLEMENTARY_CANONICAL_NAME]: 'personal-status-supplementary',
    [JAFSARI_CODE_CANONICAL_NAME]: 'jaafari-code',
};

const SLUG_TO_LAW_NAME: Record<IraqiLawBundleSlug, string> = {
    execution: EXECUTION_LAW_CANONICAL_NAME,
    penal: IRAQI_LAW_CANONICAL_NAMES.penal,
    'criminal-procedure': IRAQI_LAW_CANONICAL_NAMES.procedure,
    juvenile: IRAQI_LAW_CANONICAL_NAMES.juvenile,
    'civil-procedure': CIVIL_PROCEDURE_LAW_CANONICAL_NAME,
    evidence: EVIDENCE_LAW_CANONICAL_NAME,
    'personal-status-188': PERSONAL_STATUS_LAW_188_CANONICAL_NAME,
    'personal-status-supplementary': PERSONAL_STATUS_SUPPLEMENTARY_CANONICAL_NAME,
    'jaafari-code': JAFSARI_CODE_CANONICAL_NAME,
};

export const ALL_IRAQI_LAW_BUNDLE_SLUGS: readonly IraqiLawBundleSlug[] = [
    'execution',
    'penal',
    'criminal-procedure',
    'juvenile',
    'civil-procedure',
    'evidence',
    'personal-status-188',
    'personal-status-supplementary',
    'jaafari-code',
];

export function resolveLawBundleSlug(lawName: string): IraqiLawBundleSlug | null {
    const trimmed = String(lawName ?? '').trim();
    return LAW_NAME_TO_BUNDLE_SLUG[trimmed] ?? null;
}

export function lawNameForBundleSlug(slug: IraqiLawBundleSlug): string {
    return SLUG_TO_LAW_NAME[slug];
}

export function bundleFileNameForSlug(slug: IraqiLawBundleSlug): string {
    return `${slug}${IRAQI_LAW_BUNDLE_FILE_SUFFIX}`;
}

export function bundleFileNameForLawName(lawName: string): string | null {
    const slug = resolveLawBundleSlug(lawName);
    return slug ? bundleFileNameForSlug(slug) : null;
}

export function assertAllowedLawBundleName(lawName: string): IraqiLawBundleSlug {
    const slug = resolveLawBundleSlug(lawName);
    if (!slug || !isAllowedIraqiLawName(lawName)) {
        throw new Error('اسم القانون غير مسجل في نظام الحزم المحلية.');
    }
    return slug;
}

export function emptyLawBundle(lawName: string): IraqiLawBundleFile {
    return {
        schemaVersion: 1,
        law_name: lawName,
        articles: [],
    };
}
