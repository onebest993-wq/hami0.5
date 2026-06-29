import type {
    CassationProceeding,
    CaseStage,
    DefendantPersonalStage,
    JudicialDecision,
    JourneyNode,
    OrderEnforcementTracking,
    SeveranceReason,
} from '@/app/types/criminal';
import type { InvestigationDefendantStatus } from '@/app/types/investigationDefendant';
import type { CaseClassification, MisdemeanorType } from './caseClassificationEngine';
import type { ComplaintCourtReferralMeta } from './complaintCourtReferralEngine';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import type { CriminalTrashItem } from './criminalCaseTrash';
import type { GuarantorBailKind, GuarantorDetails, GuarantorPerson } from './criminalGuarantorModel';
import type { OurRepresentation } from './criminalProceduralPartyUtils';
import type { SeizedAsset } from './criminalSeizedAssetModel';
import type { InvestigationClosureReason } from './criminalStageUtils';
import type { StageExpirationReason } from './stageExpirationReasons';
import type { ProceduralContainer } from './proceduralContainersEngine';
import type { ProceduralCanvasAuditEntry } from './proceduralSandboxToolkit';
import type { TrialChargeModification } from './trialChargeEngine';
import type { TrialDeposition } from './trialDepositionsEngine';
import type { TrialSession } from './trialSessionsEngine';
import type { VerdictCard } from './verdictCardsEngine';

export type CriminalLawyerRole = 'وكيل المشتكي' | 'وكيل المشكو منه' | 'شكوى متقابلة';
export type PhysicalLocation = 'judge_desk' | 'investigator_room' | 'prosecution' | 'police_station' | 'archive' | 'custom';
export type CriminalCaseStage =
    | 'مرحلة التحقيق'
    | 'تحقيق الأحداث'
    | 'محكمة الأحداث'
    | 'محكمة الجنح'
    | 'محكمة الجنايات'
    | 'cassation_court';
export type CrimeType = 'مخالفة' | 'جنحة' | 'جناية';
export type DefendantStatus =
    | 'حر'
    | 'مستقدم'
    | 'هارب'
    | 'ملقى القبض عليه'
    | 'موقوف'
    | 'مكفل'
    | 'bailed_pending_appeal'
    | 'psychiatric_eval'
    | 'provisional_delivery'
    | 'behavioral_surveillance'
    | 'juvenile_detention'
    | 'متوفى'
    | 'مشمول بالعفو';
export type InvestigationPapersAt = '' | 'مركز شرطة' | 'مكتب تحقيق قضائي';

export type CriminalComplainant = {
    id: string;
    fullName: string;
    address: string;
    phone: string;
    /** المكتب يُمثّل هذا الطرف (توكل) — يُحدَّد من الواجهة بجانب الاسم. */
    isOfficeClient?: boolean;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    birthDate?: string;
    guardianName?: string;
    guardianRelationship?: string;
    /**
     * ⚖️ ازدواجية الصفة — «شكوى متقابلة» على مستوى المشتكي.
     * عند `true` يَكتسب هذا المشتكي صفة المتهم أيضاً (يبقى داخل مصفوفة complainants
     * ولا يُنقل إلى defendants — منع تخريب الداتا)، وتُستخدم الحقول accused* أدناه
     * لتخزين حالته الإجرائية كمتهم بشكل مستقل عن صفته الأصلية كمشتكي.
     *
     * ملاحظة: عند `caseRecord.isMutualComplaint === true` كل المشتكين يُعامَلون
     * كأنّ لديهم `isCrossComplaint = true` (سلوك تراثي).
     */
    isCrossComplaint?: boolean;
    /**
     * متهمون مُستهدفون بشكوى هذا المشتكي المتقابلة (إنشاء الإضبارة).
     * `undefined` = لا شكوى متقابلة على هذا المشتكي.
     * قائمة غير فارغة = الأطراف المقصودون بالشكوى المتقابلة فقط (متهمون و/أو مشتكون).
     */
    counterComplaintTargetDefendantIds?: string[];
    /** حالة المشتكي كمتهم (موقوف/مكفل/حر/هارب…) — منفصلة عن صفته كمشتكي. */
    accusedStatus?: DefendantStatus | '';
    /** جهة الإيداع للتوقيف — مرتبطة بـ accusedStatus. */
    accusedDetentionAuthority?: string;
    /** تاريخ انتهاء التوقيف لهذا المشتكي حين يكون موقوفاً. */
    accusedDetentionExpiryDate?: string;
    /** سجل دفعات التوقيف — مماثل لـ CriminalDefendant.detentionHistoryLog. */
    accusedDetentionHistoryLog?: DetentionHistory[];
    /** مجموع أيام التوقيف — للحساب التراكمي. */
    accusedTotalDetentionDays?: number;
    /** تفاصيل الكفالة عند كون المشتكي «مكفلاً» كمتهم. */
    accusedGuarantorDetails?: GuarantorDetails;
    /**
     * 🔒 قُفل سجل المشتكي بصفته متهماً (شكوى متقابلة) — يُفعَّل عند توثيق الوفاة
     *    أو سقوط الدعوى الفرعية بحقّه. مَفهومه مماثل لـ `isPartyRecordLocked` على المتهم.
     */
    accusedIsPartyRecordLocked?: boolean;
    /** مَرحلة المشتكي الشخصية بصفته متهماً (مثل lawsuit_dropped_death عند الوفاة). */
    accusedPersonalStage?: string;
    /**
     * 📦 محجوزات الأموال على المشتكي المتقابل (يَوازي `seizedAssets` للمتهم). يَظهر
     * فقط عندما يَكون المشتكي «هارباً» في شكوى متقابلة وتُصدر بحقّه أوامر حَجز.
     */
    accusedSeizedAssets?: SeizedAsset[];
};

export interface DetentionHistory {
    id: string;
    location: string;
    startDate: string;
    endDate?: string;
}

export type InAbsentiaDetails = {
    verdictDate: string;
    objectionDeadline: string;
    isObjectionFiled: boolean;
    notifiedDate?: string;
    notificationMethod?: string;
};

export type SocialInquiryWorkflowStatus = 'not_requested' | 'under_preparation' | 'submitted';

export type JuvenileDetentionPlacement = 'juvenile_observation' | 'rehabilitation_school';

export type SocialInquiryReport = {
    workflowStatus?: SocialInquiryWorkflowStatus;
    isAttached: boolean;
    receivedDate?: string;
    investigatorName?: string;
    recommendations?: string;
};

export type CriminalDefendant = {
    id: string;
    fullName: string;
    address: string;
    birthYear: string;
    status: DefendantStatus | '';
    detentionAuthority: string;
    detentionExpiryDate: string;
    detentionHistoryLog: DetentionHistory[];
    totalDetentionDays: number;
    hasFelonyCourtPermit?: boolean;
    guarantorDetails?: GuarantorDetails;
    inAbsentiaDetails?: InAbsentiaDetails;
    /** قائمة الأموال المحجوزة على المتهم الهارب — تُملأ عبر قرار «حجز الأموال». */
    seizedAssets?: SeizedAsset[];
    /** المكتب يُمثّل هذا الطرف (توكل) — يُحدَّد من الواجهة بجانب الاسم. */
    isOfficeClient?: boolean;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    birthDate?: string;
    guardianName?: string;
    guardianRelationship?: string;
    socialInquiryReport?: SocialInquiryReport;
    /** المصير الإجرائي الفردي داخل الإضبارة الموحدة. */
    personalStage?: DefendantPersonalStage;
    /** قفل بيانات الطرف (شمع أحمر) — مثلاً بعد وفاة المتهم. */
    isPartyRecordLocked?: boolean;
    /** حالة المتهم داخل التحقيق — تصفية الخصوم (افتراضي active). */
    investigationStatus?: InvestigationDefendantStatus;
    /** هوية المتهم مجهولة حتى «كشف الهوية». */
    isIdentityUnknown?: boolean;
};

/** فئة العمر الإجرائية للمتهم المعلوم — بالغ (افتراضي) | حدث | دون 7 سنوات. */
export type DefendantAgeCategory = 'adult' | 'juvenile' | 'under_seven';

export type StatementHighlightColor = 'red' | 'blue' | 'yellow';

export interface StatementContentHighlight {
    start: number;
    end: number;
    color: StatementHighlightColor;
}

export interface Statement {
    id: string;
    date: string;
    giverType: 'complainant' | 'defendant' | 'witness' | 'informant';
    giverName: string;
    content: string;
    notes?: string;
    /** مقاطع مميزة داخل نص الإفادة (توضيح المحامي). */
    contentHighlights?: StatementContentHighlight[];
    proceduralNodeId?: string;
    isJudiciallyRatified?: boolean;
    /** مكان تدوين الإفادة — مرحلة التحقيق (ضابط تحقيق / محقق قضائي). */
    statementRecordingPlace?: 'investigation_officer' | 'judicial_investigator';
    /** اسم الشاهد الثلاثي — حقل سجل الإفادات فقط. */
    witnessName?: string;
    /** عمر / سكن / صلة قرابة — اختياري للشاهد. */
    witnessDetails?: string;
    /**
     * @deprecated — استُبدل بـ witnessPartySide + witnessPartyIds
     *  - `prosecution`: شاهد إثبات (يَدعم الادعاء).
     *  - `defense`:     شاهد نفي  (يَدعم الدفاع).
     */
    witnessKind?: 'prosecution' | 'defense';
    /** جهة الشهادة — مشتكي أو متهم (لا يجتمع الطرفان). */
    witnessPartySide?: 'complainant' | 'defendant';
    /** الأطراف التي يخصّهم الشاهد — اختيار متعدد ضمن جهة واحدة. */
    witnessPartyIds?: string[];
    /** مُعَيَّن بعد الضم: مُعرّف الإضبارة الأصلية التي رُحِّلت منها هذه الإفادة. */
    mergedFromCaseId?: string;
    /** مُعَيَّن بعد الضم: الرقم الرسمي للإضبارة الأصلية (لشارة التتبّع). */
    mergedFromCaseNumber?: string;
}

export type OtherEvidenceItem = {
    id: string;
    evidenceType: string;
    isLinkedToDossier: boolean;
    attachmentDate?: string;
    notes: string;
    proceduralNodeId?: string;
    /** تاريخ الإنشاء — للترتيب عند غياب تاريخ الإرفاق. */
    createdAt?: string;
};

export interface TimelineEvent {
    id: string;
    date: string;
    type: 'investigation' | 'court_session' | 'decision';
    category: string;
    title: string;
    description: string;
    nextDate?: string;
    defendantIds?: string[];
    /**
     * ⚖️ مُعرّفات المشتكين المتقابلين (ازدواجية الصفة) المُرتبطين بهذا الحدث.
     * يُملأ حصراً عند تَفعيل الشكوى المتقابلة. يَسمح بِفلتَرة التايملاين بطَرف
     * من جانِبَي القضية دون نَقل أيّ كائن بين المَصفوفات.
     */
    complainantIds?: string[];
    appealedDecision?: string;
    postponementReason?: string;
    guarantorDetails?: GuarantorDetails;
    extensionDays?: number;
    socialWorkerPresent?: boolean;
    suspendedExecution?: boolean;
    probationYears?: number;
    transferredToStage?: CriminalCaseStage;
    notifiedDate?: string;
    notificationMethod?: string;
    summonsStatus?: 'served_valid' | 'not_served_invalid' | 'served_to_official';
    summonsDate?: string;
    summonsDocumentRef?: string;
    detentionPlacement?: JuvenileDetentionPlacement;
    isConfidential?: boolean;
    /** طرف مستهدف للإجراء المخصص (تحقيق) — null = إجراء غير شخصي. */
    targetDefendantId?: string | null;
    /** حقل عرض يُحقن في العرض الموحَّد لتايم لاين الأم (true إذا كان مُرحَّلاً). */
    isMerged?: boolean;
    /** يُكتب عند نَقل أحداث «تفريق الدعاوى» إلى الإضبارة التابعة (severance) — تتبّع دائم. */
    originCaseNumber?: string;
    originCaseId?: string;
    /** يُكتب عند تَرحيل الحدث من إضبارة مَضمومة إلى الإضبارة الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
    /** عقدة المسار النشطة عند إنشاء الحدث. */
    proceduralNodeId?: string;
    /** رقم الجلسة — محاكمة. */
    sessionNumber?: string;
    /** اسم القاضي / الهيئة — محاكمة. */
    judgeOrPanelName?: string;
    /** طلبات الجلسة القادمة — محاكمة. */
    nextSessionRequests?: string;
}

export interface LegalArticleChange {
    id: string;
    article: string;
    changedAtDate: string;
    changedBy: 'police' | 'investigation_judge' | 'trial_court';
}

export type ExhibitLifecycleStatus = 'seized_at_station' | 'sent_to_lab' | 'lab_result_received';

export interface InvestigationLog {
    id: string;
    date: string;
    category: 'official_letter' | 'forensic_report' | 'site_inspection' | 'exhibit_seizure' | 'other';
    title: string;
    details: string;
    status: 'awaiting_response' | 'response_received' | 'returned_for_revision';
    attachmentRef?: string;
    defendantIds?: string[];
    /** ربط إجباري بالخصم — معرّف الطرف في الإضبارة. */
    linkedPartyId?: string;
    /** رقم محضر الضبط — عند تصنيف «ضبط مبرز». */
    seizureRecordNumber?: string;
    /** رقم وتاريخ كتاب الطب العدلي — عند تصنيف «طب عدلي». */
    forensicLetterRef?: string;
    /** وصف المبرز الدقيق. */
    exhibitDescription?: string;
    /** الكمية / العدد. */
    exhibitQuantity?: string;
    /** دورة حياة المبرز — خزانة الأدلة فقط. */
    exhibitLifecycle?: ExhibitLifecycleStatus;
    /** تاريخ ورود الجواب — مخاطبات (تحديث أمامي فقط). */
    responseReceivedAt?: string;
    responseNotes?: string;
    /** يُكتب عند ترحيل السجل من إضبارة مَضمومة إلى الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
}

export interface LawyerRequest {
    id: string;
    requestDate: string;
    type: string;
    lawyerNote: string;
    status: 'pending' | 'approved' | 'rejected' | 'executed';
    judgeMargin?: string;
    decisionDate?: string;
    defendantIds?: string[];
    /** قفل نهائي — لا تعديل بعد التأكيد. */
    isLocked?: boolean;
    /** @deprecated — يُحوَّل إلى isLocked عند التحميل. */
    decisionArchived?: boolean;
    proceduralNodeId?: string;
    /** قالب نوع الطلب من القائمة (بما فيها «إجراء مخصص»). */
    proceduralTemplate?: string;
    /** للإجراء المخصص — قابلية الطعن التمييزي. */
    isAppealable?: boolean;
    /** تاريخ انتهاء التوقيف/التمديد عند اختيار نوع توقيف. */
    detentionStartDate?: string;
    detentionEndDate?: string;
    /** هوامش ومتابعات إجرائية متسلسلة على الطلب (منفصلة عن هامش القاضي الختامي). */
    margins?: { id: string; date: string; text: string }[];
    /** مرفقات موثقة (محاكاة رفع — اسم المستند فقط). */
    attachments?: { id: string; name: string }[];
    /** تمييز قرار/طلب مصيري في الواجهة. */
    isStarred?: boolean;
    /** المادة القانونية المستند عليها — استقدام/قبض. */
    legalArticleBasis?: string;
    /** متابعة تنفيذ أمر الاستقدام/القبض. */
    orderEnforcement?: OrderEnforcementTracking;
    /** المحكمة المحال إليها — إحالة الشكوى إلى محكمة أخرى. */
    referredCourtName?: string;
    /** بيانات قرار «تكفيل المتهم» المهيكلة — مالية أو شخص ضامن. */
    defendantBail?: {
        kind: GuarantorBailKind;
        bailAmount?: string;
        guarantors?: GuarantorPerson[];
    };
    /**
     * بيانات قرار «حجز الأموال» المهيكلة — قائمة أموال محجوزة لكل طَرَف هارب مُستهدف.
     *
     * 🛈 ملاحظة دلالية: حقل `defendantId` تَراثياً يَحوي مُعرّف متهم؛ لكن في حالة
     *    الشكوى المتقابلة (isMutualComplaint أو isCrossComplaint) يَجوز أن يَحمل
     *    مُعرّف مشتكٍ مُتقابل (الحجز يَكتب على `complainant.accusedSeizedAssets`).
     *    تَفسير المُعرّف يَتمّ ديناميكياً عبر مُطابقته مع `defendants[].id` ثم
     *    `complainants[].id`. أيّ كود مُستقبلي يَفترض «مُعرّف متهم حَتماً» سَيُخطئ.
     */
    assetSeizure?: {
        perDefendant: Array<{
            /** مُعرّف الطَرَف المُستهدف (متهم أصلي، أو مشتكٍ متقابل في القَضايا المُتقابلة). */
            defendantId: string;
            assets: SeizedAsset[];
        }>;
    };
    /** يُكتب عند ترحيل الطلب من إضبارة مَضمومة إلى الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
}

export interface StageConclusion {
    id: string;
    stageType: 'investigation' | 'misdemeanor' | 'felony' | 'juvenile' | 'cassation';
    decisionType:
        | 'referral'
        | 'closing'
        | 'temporary_closing'
        | 'conviction'
        | 'juvenile_deliver_guardian'
        | 'juvenile_behavioral_surveillance'
        | 'juvenile_reform_boys'
        | 'juvenile_youth_school'
        | 'juvenile_fine'
        | 'juvenile_severance_referral'
        | 'acquittal'
        | 'release'
        | 'expiration'
        | 'cassation_confirm'
        | 'cassation_quash_remand'
        | 'cassation_quash_reduce'
        | 'cassation_quash_acquit_release'
        | 'return_investigation_deficiency'
        | 'misdemeanor_to_felony_jurisdiction'
        | 'felony_to_misdemeanor_jurisdiction'
        | 'trial_cassation_appeal'
        | 'cassation_quash_investigation'
        | 'cassation_quash_trial_misdemeanor'
        | 'cassation_quash_trial_felony'
        | 'case_split_fugitive_referral'
        | 'temporary_release_insufficient_evidence'
        | 'postpone_article_183'
        | 'default_judgment_issue'
        | 'default_judgment_opposition';
    date: string;
    details: string;
    defendantStatusAtDecision: 'detained' | 'bailed' | 'fugitive';
    defendantIds?: string[];
    /** نطاق المستفيدين من النقض عند أسباب شخصية (م 269/ب). */
    targetDefendantIds?: string[];
    /** أسباب نقض موضوعية مشتركة — يستفيد جميع المتهمين. */
    sharedObjectiveGrounds269b?: boolean;
    punishmentType?: 'death' | 'life' | 'other';
    expirationReason?: StageExpirationReason;
    /**
     * حالة كل متهم لحظة القرار (موقوف/مكفل/هارب) — Per-Defendant.
     * يُستخدم عندما يحتاج القرار حالات فردية مختلفة لكل متهم.
     * يُلغي قيمة `defendantStatusAtDecision` العامة عند توفّره.
     */
    defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>;
    /** سبب غلق الدعوى — إجباري في قرارات [غلق نهائي / غلق مؤقت]. */
    closureReason?: InvestigationClosureReason;
}

export type CriminalCaseLocation = {
    investigationCourtName: string;
    investigationPapersAt: InvestigationPapersAt;
    policeStationName: string;
    baseRegisterNumberAndDate: string;
    investigationOfficeName: string;
    investigationDossierNumber: string;
    courtName: string;
    caseNumber: string;
    /** رقم الادعاء العام — بجانب رقم الدعوى بعد الإحالة. */
    publicProsecutionNumber: string;
    /** اسم القاضي — محكمة الموضوع. */
    trialJudgeName: string;
    /** موعد المرافعة القادمة (YYYY-MM-DD). */
    nextHearingDate: string;
};

export type { CriminalCaseUserRole } from './complainantCassationGovernance';

export type CriminalCaseDraft = {
    basics: {
        role: CriminalLawyerRole | '';
        ourRepresentation: OurRepresentation | '';
        /** صفة المحامي في الإضبارة — يُشتق من ourRepresentation عند الغياب. */
        userRole?: CriminalCaseUserRole | '';
        stage: CriminalCaseStage | '';
        legalArticle: string;
        crimeType: CrimeType | '';
    };
    location: CriminalCaseLocation;
    complainants: CriminalComplainant[];
    unknownDefendant: boolean;
    defendants: CriminalDefendant[];
    statements: Statement[];
    otherEvidenceItems: OtherEvidenceItem[];
    timelineEvents: TimelineEvent[];
    investigationLogs: InvestigationLog[];
    /** حاويات إجرائية متداخلة — لوحة المتابعة (Recursive Canvas). */
    proceduralContainers: ProceduralContainer[];
    /** سجل تغييرات لوحة المسارات (اختياري — شفافية). */
    proceduralCanvasAudit?: ProceduralCanvasAuditEntry[];
    lawyerRequests: LawyerRequest[];
    /** سجل جلسات المحاكمة الرسمي — مستقل عن الساندبوكس الإجرائي. */
    trials: TrialSession[];
    /** بطاقات الأحكام (براءة/إفراج/إدانة) ومسارات الطعن — تبويب القرارات والطعون. */
    verdictCards?: VerdictCard[];
    /** إفادات واستجواب الشهود — محكمة الموضوع (تبويب المحاكمات فقط). */
    trialDepositions: TrialDeposition[];
    /** مادة الإحالة الأصلية — ثابتة للقراءة (تبويب المحاكمات). */
    referralArticle?: string;
    /** مادة الاتهام الحالية للمحاكمة — قابلة للتعديل (م 187). */
    currentAccusationArticle?: string;
    /** سجل تعديلات الوصف القانوني أثناء المرافعة. */
    chargeModifications?: TrialChargeModification[];
    /** السجل الزمني الموحد للقرارات القضائية (محمي). */
    judicialDecisions?: JudicialDecision[];
    physicalLocation: PhysicalLocation;
    physicalLocationCustomName?: string;
    isArticle3Offense?: boolean;
    crimeDiscoveryDate?: string;
    /** شكوى متقابلة (مشاجرة/تبادل أفعال) — الأطراف يبقون في مصفوفتين منفصلتين */
    isMutualComplaint: boolean;
    /** المشتكي هو الحق العام / الادعاء العام — لا يُدخل مشتكٍ عادي. */
    isPublicProsecutionComplainant?: boolean;
    /** المادة تتضمن حقاً عاماً — يُفعِّل إظهار الحق العام بعد تنازل المشتكين. */
    articleIncludesPublicRight?: boolean;
    /** إضبارة سرية — تُفعَّل تلقائياً عند وجود متهم/مشتكٍ حدث. */
    isConfidential?: boolean;
};

export type CriminalDossierStatus = 'active' | 'merged';

export type InvestigationDossierClosureKind = 'temporary' | 'final' | 'waiver';

/** حالة إغلاق/تجميد الإضبارة التحقيقية — مستقلة عن حالة كل متهم. */
export type InvestigationDossierClosure = {
    kind: InvestigationDossierClosureKind;
    closedAt: string;
    sourceRequestId?: string;
    defendantIds?: string[];
};

export type CriminalCase = CriminalCaseDraft & {
    id: string;
    createdAt: string;
    isFrozen?: boolean;
    /** استئخار م 183 — يحجب الإجراءات الجنائية الجديدة. */
    isPrejudicialPostponed?: boolean;
    /** أرشفة بحكم غيابي — يُفتح بها طعن المعارضة. */
    isDefaultJudgmentArchived?: boolean;
    verdictDate?: string;
    isSentToCassation?: boolean;
    /** @deprecated — يُرحَّل إلى cassationProceeding */
    cassationCaseDetails?: {
        cassationNumber: string;
        sentDate: string;
        panelName: string;
    };
    /** سجل الطعن/التدخل التمييزي النشط. */
    cassationProceeding?: CassationProceeding;
    isArchived?: boolean;
    notes?: string;
    /** حالة الارتباط الإداري — merged = إضبارة مضمومة ومغلقة */
    dossierStatus?: CriminalDossierStatus;
    /** أرقام الأضابير المضمومة في هذه الإضبارة الأم (للشارات) */
    mergedCasesTexts?: string[];
    mergedIntoCaseId?: string;
    mergedIntoCaseNumber?: string;
    /** معرّفات الأضابير المضمومة (ضم متعدد — الإضبارة الأم). */
    mergedCaseIds?: string[];
    /** @deprecated — يُدمَج عند التحميل إلى mergedCaseIds */
    mergedFromCaseIds?: string[];
    legalArticleHistory: LegalArticleChange[];
    isPrivateRightWaived?: boolean;
    waiverDate?: string;
    finalDecision?: StageConclusion;
    /** المرحلة القطعية (تحقيق / جنح / جنايات). */
    caseStage?: CaseStage;
    /** نوع الجريمة السيادي — جnaية / جنحة / مخalفة. */
    case_classification?: CaseClassification;
    /** طريقة الجنحة — موjزة (م 201-211) أو غير موjزة. */
    misdemeanor_type?: MisdemeanorType;
    /** رقم دعوى المحكمة بعد الإحالة. */
    courtCaseNumber?: string;
    /** رقم التحقيق السابق (لقطة عند الإحالة). */
    investigationCaseNumber?: string;
    /** قفل أمان — يمنع تعديل أحداث التحقيق. */
    isInvestigationLocked?: boolean;
    /** غلق/تجميد الإضبارة التحقيقية (مؤقت / نهائي / تنازل). */
    investigationDossierClosure?: InvestigationDossierClosure;
    /** مسار تنقل الإضبارة في رأس اللوحة. */
    stageJourney?: JourneyNode[];
    /** الإضبارة الأم عند تفريق الدعاوى (إضبارة تابعة). */
    parentCaseId?: string;
    /** وليدة قرار تفريق — لا تُعدّل المشتكين/التايم لاين القديم في التخزين. */
    isSeveredChild?: boolean;
    severanceReason?: SeveranceReason;
    /** تفصيل يدوي عند اختيار «أخرى». */
    severanceReasonDetail?: string;
    /** تاريخ قرار التفريق (YYYY-MM-DD) — حد الوراثة من الأم. */
    severedAt?: string;
    /** معرّفات الإضابير المفرّعة التابعة (الأم فقط). */
    severedChildCaseIds?: string[];
    /** لقطة إحالة الشكوى — لاستعادة اسم المحكمة عند النقض. */
    complaintCourtReferral?: ComplaintCourtReferralMeta;
    /** سلة مهملات — عناصر محذوفة من الطلبات/الإفادات/التتبع قابلة للاسترجاع. */
    trashBin?: CriminalTrashItem[];
};

/**
 * سياق تفريق الدعوى (شطر إضبارة) — يجسر بين:
 *   1. فتح المودال من ترويسة الإضبارة الأم،
 *   2. التوجيه إلى شاشة «إضبارة جديدة» مع تعبئة المتهمين فقط،
 *   3. تنفيذ الترحيل (createNew + deleteFromParent + migrateExclusiveItems) عند الحفظ.
 * يبقى في الحالة حتى يتم Commit أو Cancel بشكل صريح.
 */
export type JudicialSeveranceDraft = {
    requestDate: string;
    lawyerNote: string;
    isAppealable: boolean;
};

export type PendingSeveranceContext = {
    parentCaseId: string;
    /** معرّفات المتهمين في الإضبارة الأم — للحذف من الأم وقت الـ Commit. */
    parentDefendantIds: string[];
    /** لقطة المتهمين المنقولين (لإعادة استخدام بياناتهم الكاملة في الإضبارة الجديدة). */
    defendantSnapshots: CriminalDefendant[];
    /** ختم زمني لمعرفة عمر السياق وكشف أي تسريب محتمل. */
    initiatedAt: string;
    /** بيانات قرار التفريق من يوميات التحقيق — تُسجَّل على الأم بعد إتمام الشطر. */
    judicialSeveranceDraft?: JudicialSeveranceDraft;
    /** مسودّة تعبئة الإضبارة المفرّقة — منفصلة عن مسودّة «إضبارة جديدة» العادية. */
    formDraft: CriminalCaseDraft;
    /** اختياري — مسار `severCase` القديم أو تكامل خارجي. */
    severanceReason?: SeveranceReason;
    /** تفصيل يدوي عند اختيار «أخرى». */
    severanceReasonDetail?: string;
    /** مرحلة الإضبارة الأم عند بدء التفريق — تُقفل على المفرّقة. */
    lockedCaseStage: CriminalCaseStage;
};

