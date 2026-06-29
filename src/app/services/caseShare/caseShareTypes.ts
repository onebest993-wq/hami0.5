/** نوع الإضبارة المشارَكة */
export type CaseShareDossierModule = 'execution' | 'lawsuit' | 'criminal' | 'personal';

/** full = إظهار كامل | partial = تجهيل جزئي | hidden = إخفاء كامل */
export type CaseShareVisibilityMode = 'full' | 'partial' | 'hidden';

export type ShareSectionKey =
    | 'timeline'
    | 'notes'
    | 'documents'
    | 'parties'
    | 'court'
    | 'meta'
    | 'followup'
    | 'decisions'
    | 'appointments'
    | 'financial';

export type ShareCatalogItemKind = 'timeline' | 'note' | 'document' | 'hearing' | 'meta';

export type ShareCatalogItem = {
    id: string;
    kind: ShareCatalogItemKind;
    label: string;
    preview?: string;
};

export type ShareCatalogSection = {
    key: ShareSectionKey;
    title: string;
    items: ShareCatalogItem[];
};

export type CaseShareSectionMode = 'all' | 'none' | 'pick';

/** إعدادات قناع الخصوصية — يُحفظ في visible_fields */
export type CaseShareVisibleFields = {
    documents: boolean;
    case_numbers: boolean;
    parties_names: CaseShareVisibilityMode;
    court_details: CaseShareVisibilityMode;
    /** ملخص موجّه للزميل (يُعرض بدل النص الكامل عند التجهيل) */
    text_masking?: string;
    /** كلمات/عبارات إضافية لاستبدالها برموز */
    masked_terms?: string[];
    /** تحكم بكل قسم: كامل / مخفي / اختيار عناصر */
    sectionMode?: Partial<Record<ShareSectionKey, CaseShareSectionMode>>;
    /** عناصر مخفية عند sectionMode = pick */
    hiddenItemIds?: string[];
};

export type CaseShareStatus = 'pending' | 'accepted' | 'declined' | 'ended';

/** مصدر خام قبل التجهيل — لا يُرسل للمستلم */
export type DossierShareSource = {
    module: CaseShareDossierModule;
    dossierId: string;
    title: string;
    caseNumbers: string[];
    partyNames: string[];
    courtLabel: string;
    courtProvince?: string;
    narrativeText: string;
    documentCount: number;
    /** فهرس محتويات الإضبارة للاختيار التفصيلي */
    catalog: ShareCatalogSection[];
    /** بيانات عرض الإضبارة التنفيذية (بدون أطراف) */
    executionMeta?: ExecutionShareMeta;
};

export type ExecutionShareMeta = {
    directorate: string;
    fileNumber: string;
    fileYear: string;
    claimType: string;
    documentType: string;
    lifecycleStatus: string;
    docNumber: string;
};

/** العرض المقنّع للمستلم */
export type CaseShareMaskedView = {
    module: CaseShareDossierModule;
    dossierId: string;
    title: string;
    caseNumbers: string[];
    parties: string[];
    court: string;
    narrative: string;
    documentsIncluded: boolean;
    ownerDisplayName?: string;
    /** أقسام وعناصر سيظهرها الزميل بعد التصفية */
    visibleCatalog?: ShareCatalogSection[];
    sessionDurationMinutes?: number;
};

export type CaseShareRecord = {
    id: string;
    ownerId: string;
    ownerName: string;
    recipientId: string;
    recipientName: string;
    dossierModule: CaseShareDossierModule;
    dossierId: string;
    dossierTitle: string;
    visibleFields: CaseShareVisibleFields;
    maskedView: CaseShareMaskedView;
    status: CaseShareStatus;
    createdAt: string;
    respondedAt?: string;
    /** مدة الجلسة المتوقعة بالدقائق (15–180) */
    sessionDurationMinutes?: number;
    /** بداية الجلسة عند الموافقة */
    sessionStartedAt?: string;
    /** نهاية الجلسة (إنهاء يدوي أو انتهاء الوقت) */
    sessionEndedAt?: string;
    /** من أنهى الجلسة */
    endedByUserId?: string;
};

export const DEFAULT_CASE_SHARE_VISIBLE_FIELDS: CaseShareVisibleFields = {
    documents: true,
    case_numbers: true,
    parties_names: 'full',
    court_details: 'full',
    text_masking: '',
    masked_terms: [],
    sectionMode: {
        timeline: 'all',
        notes: 'all',
        documents: 'all',
        parties: 'all',
        court: 'all',
        meta: 'all',
        followup: 'all',
        decisions: 'all',
        appointments: 'all',
        financial: 'all',
    },
    hiddenItemIds: [],
};

/** إعدادات افتراضية لاستشارة زميل في إضبارة تنفيذ — كل الأقسام مخفية ما عدا بيانات الإضبارة في الترويسة */
export const DEFAULT_EXECUTION_CONSULT_VISIBLE_FIELDS: CaseShareVisibleFields = {
    documents: false,
    case_numbers: true,
    parties_names: 'hidden',
    court_details: 'hidden',
    text_masking: '',
    masked_terms: [],
    sectionMode: {
        followup: 'none',
        decisions: 'none',
        notes: 'none',
        appointments: 'none',
        documents: 'none',
        timeline: 'none',
        financial: 'none',
        parties: 'none',
        court: 'none',
        meta: 'none',
    },
    hiddenItemIds: [],
};

export const EXECUTION_CONSULT_SECTION_DEFS: Array<{ key: ShareSectionKey; title: string }> = [
    { key: 'followup', title: 'محضر المتابعة' },
    { key: 'decisions', title: 'القرارات والطعون' },
    { key: 'notes', title: 'ملاحظات' },
    { key: 'appointments', title: 'المواعيد' },
    { key: 'documents', title: 'المستندات' },
    { key: 'timeline', title: 'السجل الزمني' },
    { key: 'financial', title: 'المركز المالي' },
];

export const EXECUTION_CONSULT_SECTION_KEYS: ShareSectionKey[] = EXECUTION_CONSULT_SECTION_DEFS.map(
    (s) => s.key,
);

export function defaultConsultVisibleFields(module?: CaseShareDossierModule): CaseShareVisibleFields {
    if (module === 'execution') {
        return {
            ...DEFAULT_EXECUTION_CONSULT_VISIBLE_FIELDS,
            sectionMode: { ...DEFAULT_EXECUTION_CONSULT_VISIBLE_FIELDS.sectionMode },
            hiddenItemIds: [],
        };
    }
    return {
        ...DEFAULT_CASE_SHARE_VISIBLE_FIELDS,
        sectionMode: { ...DEFAULT_CASE_SHARE_VISIBLE_FIELDS.sectionMode },
        hiddenItemIds: [],
    };
}

export type NetworkColleague = {
    id: string;
    name: string;
    relation: 'following' | 'follower' | 'both';
};
