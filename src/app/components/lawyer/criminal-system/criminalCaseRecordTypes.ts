import type {
    CassationProceeding,
    CaseStage,
    JourneyNode,
    JudicialDecision,
    SeveranceReason,
} from '@/app/types/criminal';
import type { CaseClassification, MisdemeanorType } from './caseClassificationEngine';
import type { ComplaintCourtReferralMeta } from './complaintCourtReferralEngine';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import type { CriminalTrashItem } from './criminalCaseTrash';
import type { OurRepresentation } from './criminalProceduralPartyUtils';
import type { InvestigationClosureReason } from './criminalStageUtils';
import type { StageExpirationReason } from './stageExpirationReasons';
import type { ProceduralContainer } from './proceduralContainersEngine';
import type { ProceduralCanvasAuditEntry } from './proceduralSandboxToolkit';
import type { TrialChargeModification } from './trialChargeEngine';
import type { TrialDeposition } from './trialDepositionsEngine';
import type { TrialSession } from './trialSessionsEngine';
import type { VerdictCard } from './verdictCardsEngine';
import type {
    CriminalCaseStage,
    CriminalComplainant,
    CriminalDefendant,
    CriminalLawyerRole,
    CrimeType,
    InvestigationPapersAt,
    PhysicalLocation,
} from './criminalCasePartyTypes';
import type {
    OtherEvidenceItem,
    Statement,
    TimelineEvent,
} from './criminalCaseEvidenceTypes';
import type {
    InvestigationLog,
    LawyerRequest,
    LegalArticleChange,
} from './criminalCaseProcedureTypes';

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
    /** محامي مالك الإضبارة — يُختم عند الإنشاء من sessionOwnerLawyerId */
    ownerLawyerId?: string;
    /**
     * عرض فقط: صف من فهرس البطاقات حُقن في الذاكرة — لا يُكتب كـ shard كامل.
     * @see CRIMINAL_CARD_INDEX_STUB_FLAG
     */
    _cardIndexStub?: true;
    /** علامات عرض داخلية للجسر/اللوحة — غير persisted كعقد إلزامي */
    _isMergedDossier?: boolean;
    _isArticle3Offense?: boolean;
    isFrozen?: boolean;
    /** استئخار م 183 — يحجب الإجراءات الجنائية الجديدة. */
    isPrejudicialPostponed?: boolean;
    /** أرشفة بحكم غيابي — يُفتح بها طعن المعارضة. */
    isDefaultJudgmentArchived?: boolean;
    verdictDate?: string;
    isSentToCassation?: boolean;
    /**
     * @deprecated KEEP — يُرحَّل إلى cassationProceeding عبر `criminalStorePersistMigrate` + cassationEngine.
     * ما زال يُعرض في CriminalDashboardDossierBody للسجلات القديمة.
     */
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
    /**
     * @deprecated KEEP — يُدمَج إلى mergedCaseIds عبر `criminalCaseMergeUtils` / resolveMergedCaseIds.
     */
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
