import type { CaseStage, TimelineEvent, Task } from './stageTimelineTypes';
import type { IncidentalCase, IncidentalFileLink } from './incidentalTypes';

export type CaseType = 'lawsuit' | 'transaction' | 'execution';

export interface FileData {
    id: number;
    type: CaseType;
    status: 'active' | 'archived' | 'archived_stage' | 'deleted' | 'paused';
    stayReason?: string;
    stayDate?: string;
    stayReviewDate?: string;
    deletedAt?: number;
    // Structured Case Number
    caseNoParts?: { year: string; type: string; seq: string };
    caseNo: string; // Compiled string for display
    court: string; 
    judge?: string;
    docType?: string; // Type of lawsuit (e.g. Tamleek)
    subInfo?: string; 
    parties: Party[];
    currentStage?: string;
    /**
     * شكلان يتعايشان: الإضبارات المنشأة اليوم تُكتب أحداث خط زمني، والمحفوظ
     * من نسخ أقدم يحمل {stage,result}. القارئ الوحيد يقرأ `date` وهو مشترك
     * بينهما، فالاتّحاد يصف الواقع بدل أن يصف أحد نصفيه.
     */
    history: ({ id: number; stage: string; result: string; date: string } | TimelineEvent)[];
    notes: { id: number; text: string; meta: string; stageCtx: string; date: string; apptDate?: string; isPinned?: boolean }[];
    images: { url: string; name: string }[];
    date: string;
    /** تاريخ أول مرافعة / جلسة عند إنشاء الإضبارة */
    firstHearingDate?: string;
    nextDate?: string;
    isPinned?: boolean;
    tasks?: Task[];
    incidentalCases?: IncidentalCase[];
    feesTotal?: number | string;
    feesPaid?: number | string;
    /** القيمة التقديرية للدعوى (د.ع) */
    claimValue?: string;
    /** دعوى غير مقدرة القيمة — تمييز فقط */
    isUndeterminedValue?: boolean;
    /** دعوى خاضعة للرسم المقطوع — تمييز فقط */
    isFixedFee?: boolean;
    /** مرحلة الحكم الأصلي عند الطعن الاستثنائي (إعادة محاكمة / اعتراض غيابي / اعتراض الغير) */
    retrialTargetStage?: string;
    clientPhone?: string;
    /** اختصاص الدعوى عند الإنشاء (القضاء المدني أو الأحوال الشخصية) — لفلترة مخزن الإضابير */
    lawsuitJurisdiction?: 'civil' | 'personal';
    /** القانون المطبق في دعاوى الأحوال الشخصية */
    applicableLaw?: 'law_188_1959' | 'jaafari_code';
    /** إضبارة منبثقة من دعوى أم (منضمة / متقابلة) */
    parentId?: number;
    incidentalLink?: IncidentalFileLink;
    /** أُدمجت هذه الإضبارة ضمن إضبارة أخرى (توحيد دعاوى) */
    consolidationMergedInto?: number;
    /** معرّفات الإضابير المدمجة في هذه الإضبارة */
    mergedConsolidatedFileIds?: number[];
    /** روابط دعاوى (موجودة بالمخزن أو مرجعية) */
    caseLinks?: CaseLinkRecord[];
    /** دعاوى ثانوية موحّدة مع هذه الإضبارة */
    consolidationSecondaryRefs?: ConsolidationSecondaryRef[];
    stages?: CaseStage[];
    activeStageIndex?: number;
}

export interface ConsolidationSecondaryRef {
    id: string;
    caseNo: string;
    peerFileId?: number;
    isExternal: boolean;
    consolidationDate: string;
    reason?: string;
}

export interface CaseLinkRecord {
    id: string;
    peerFileId?: number;
    peerCaseNo: string;
    linkDate: string;
    reason?: string;
    isExternal: boolean;
    /** الإضبارة التي أنشأت الربط — تبقى قابلة للتحرير؛ المربوطة للاطلاع فقط */
    originFileId?: number;
    /** نوع الإضبارة المربوطة في المخزن */
    peerDossierKind?: 'lawsuit' | 'criminal';
    /** معرّف الإضبارة الجزائية عند الربط عبر مخزن الجزائي */
    peerCriminalId?: string;
}

export interface Party {
    id: number;
    name: string;
    role: string; 
    isClient: boolean;
    phone?: string;
    address?: string;
    side?: 'right' | 'left';
    lawyer?: {
        name: string;
        phone: string;
        isMyOffice: boolean;
    };
}

export interface Alert {
    id: number;
    title: string;
    subtitle: string;
    time: string;
    urgent: boolean;
}
