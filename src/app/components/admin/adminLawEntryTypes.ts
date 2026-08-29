import {
    CIVIL_LAW_CANONICAL_NAMES,
    EXECUTION_LAW_CANONICAL_NAME,
    IRAQI_LAW_CANONICAL_NAMES,
} from '@/app/constants/iraqiLawCatalog';
import { PERSONAL_STATUS_LAW_CANONICAL_NAMES } from '@/app/constants/personalStatusLawCatalog';

export type AdminLawEntryTab = 'single' | 'bulk' | 'browse';

export type BrowseLawRow = {
    id: string;
    lawName: string;
    articleNumber: string;
    content: string;
};

export const BROWSE_TABLE_PAGE_SIZE = 40;

export type LawDomain = 'execution' | 'criminal' | 'civil' | 'personal';
export type CriminalLawTab = 'penal' | 'procedure' | 'juvenile';
export type CivilLawTab = 'civil_procedure' | 'evidence';
export type PersonalLawTab =
    | 'personal_status_188'
    | 'personal_status_supplementary'
    | 'jaafari_code';

export type BulkProgress = {
    rawTotal: number;
    total: number;
    skipped: number;
    processed: number;
    success: number;
    failed: number;
};

export const EMPTY_BULK_PROGRESS: BulkProgress = {
    rawTotal: 0,
    total: 0,
    skipped: 0,
    processed: 0,
    success: 0,
    failed: 0,
};

export type AddLawInvokeBody = {
    law_name: string;
    article_number: string;
    content: string;
};

export type AddLawResponse = {
    ok?: boolean;
    error?: string;
    message?: string;
    details?: string;
    record?: unknown;
    deletedCount?: number;
};

export type ImportBundleResponse = {
    ok?: boolean;
    error?: string;
    message?: string;
    details?: string;
    imported?: number;
    rawCount?: number;
    skipped?: number;
    skippedDetails?: Array<{ index: number; reason: string }>;
};

export type ClearLawsInvokeBody = {
    law_name: string;
    article_from?: number;
    article_to?: number;
};

export type AddLawInvokeResult = {
    message: string;
};

type LawsListItem = {
    id?: string;
    law_name?: string;
    article_number?: string;
    content?: string;
};

export type LawsListResponse = {
    ok?: boolean;
    error?: string;
    details?: string;
    items?: LawsListItem[];
};

export const LAW_DOMAIN_LABELS: Record<LawDomain, string> = {
    execution: 'قسم التنفيذ',
    criminal: 'القسم القضائي الجزائي',
    civil: 'الدعاوى المدنية',
    personal: 'الأحوال الشخصية',
};

export const CRIMINAL_LAW_TAB_LABELS: Record<CriminalLawTab, string> = {
    penal: 'قانون العقوبات',
    procedure: 'أصول المحاكمات الجزائية',
    juvenile: 'قانون رعاية الأحداث',
};

export const CIVIL_LAW_TAB_LABELS: Record<CivilLawTab, string> = {
    civil_procedure: 'المرافعات المدنية',
    evidence: 'قانون الإثبات',
};

export const PERSONAL_LAW_TAB_LABELS: Record<PersonalLawTab, string> = {
    personal_status_188: 'قانون 188',
    personal_status_supplementary: 'قوانين تطبيقية',
    jaafari_code: 'المدونة الجعفرية',
};

/** يطابق `lawName` في `LAW_STRUCTURE` */
const LAW_NAME_BY_TARGET: Record<LawDomain, string | null> &
    Record<CriminalLawTab, string> &
    Record<CivilLawTab, string> &
    Record<PersonalLawTab, string> = {
    execution: EXECUTION_LAW_CANONICAL_NAME,
    criminal: null,
    civil: null,
    personal: null,
    penal: IRAQI_LAW_CANONICAL_NAMES.penal,
    procedure: IRAQI_LAW_CANONICAL_NAMES.procedure,
    juvenile: IRAQI_LAW_CANONICAL_NAMES.juvenile,
    civil_procedure: CIVIL_LAW_CANONICAL_NAMES.civil_procedure,
    evidence: CIVIL_LAW_CANONICAL_NAMES.evidence,
    personal_status_188: PERSONAL_STATUS_LAW_CANONICAL_NAMES.personal_status_188,
    personal_status_supplementary: PERSONAL_STATUS_LAW_CANONICAL_NAMES.personal_status_supplementary,
    jaafari_code: PERSONAL_STATUS_LAW_CANONICAL_NAMES.jaafari_code,
};

export function resolveAdminLawTargetName(
    activeDomain: LawDomain,
    activeCriminalLawTab: CriminalLawTab,
    activeCivilLawTab: CivilLawTab,
    activePersonalLawTab: PersonalLawTab,
): string | null {
    if (activeDomain === 'execution') return LAW_NAME_BY_TARGET.execution;
    if (activeDomain === 'criminal') return LAW_NAME_BY_TARGET[activeCriminalLawTab];
    if (activeDomain === 'civil') return LAW_NAME_BY_TARGET[activeCivilLawTab];
    return LAW_NAME_BY_TARGET[activePersonalLawTab];
}
