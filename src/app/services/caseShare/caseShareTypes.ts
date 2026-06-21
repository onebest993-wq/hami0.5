/** نوع الإضبارة المشارَكة */
export type CaseShareDossierModule = 'execution' | 'lawsuit' | 'criminal' | 'personal';

/** full = إظهار كامل | partial = تجهيل جزئي | hidden = إخفاء كامل */
export type CaseShareVisibilityMode = 'full' | 'partial' | 'hidden';

export type ShareSectionKey = 'timeline' | 'notes' | 'documents' | 'parties' | 'court' | 'meta';

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
    },
    hiddenItemIds: [],
};

export type NetworkColleague = {
    id: string;
    name: string;
    relation: 'following' | 'follower' | 'both';
};
