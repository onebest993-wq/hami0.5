/** المراحل القطعية لدورة حياة الدعوى الجزائية (نفس الإضبارة). */
export type CaseStage =
    | 'investigation'
    | 'misdemeanor'
    | 'felony'
    | 'cassation'
    /** مسار تفريق غيابي — متهم هارب */
    | 'evading_arrest'
    | 'absentia_trial';

/** سبب تفريق الدعاوى بموجب أصول المحاكمات الجزائية (شطر الإضبارة م/132). */
export type SeveranceReason =
    | 'juvenile_mixed_with_adult'
    | 'defendant_absconding'
    | 'unrelated_crimes_or_acts'
    | 'court_type_jurisdiction'
    | 'death_or_amnesty'
    | 'justice_interests'
    | 'other'
    /** @deprecated — إضابير قديمة */
    | 'distinct_acts'
    /** @deprecated — إضابير قديمة */
    | 'distinct_times_places';

/** حقول تفريق الدعاوى على الإضبارة — مرحلة 1. */
export interface CriminalCaseSeverance {
    /** الإضبارة الأم عند كون هذه إضبارة تابعة مفرّقة. */
    parentCaseId?: string;
    /** وليدة قرار تفريق دعاوى. */
    isSeveredChild: boolean;
    /** سبب التفريق القانوني. */
    severanceReason?: SeveranceReason;
    /** تفصيل يدوي عند اختيار «أخرى». */
    severanceReasonDetail?: string;
    /** تاريخ قرار التفريق (YYYY-MM-DD). */
    severedAt?: string;
    /** معرّفات الأضابير التابعة المفرّعة (على الإضبارة الأم). */
    severedChildCaseIds?: string[];
}

/**
 * طبقة المرحلة النشطة الاستثنائية (لا تستبدل CaseStage — تُركّب على العقدة الحالية).
 * - frozen_prejudicial: استئخار م 183
 * - default_judgment_opposition: معارضة غيابية بعد القبض/التسليم
 * - reopened_new_evidence: إعادة فتح تحقيق مغلق مؤقتاً
 */
export type JourneyPhaseOverlay =
    | 'frozen_prejudicial'
    | 'default_judgment_opposition'
    | 'reopened_new_evidence'
    | 'under_intervention_review'
    | 'cassation_channel_pending';

/** قناة الطعن/التدخل التمييزي — أصول 23/1971. */
export type CassationType =
    | 'federal_cassation_felony'
    | 'criminal_cassation_misdemeanor'
    | 'investigation_judge_appeal'
    | 'prosecution_intervention_264b';

/** نتيجة ختامية للطعن التمييزي — قرارات حاسمة (مرحلة المحاكمة/الإحالة). */
export type DispositiveCassationAppealResult = 'affirmation' | 'quash_remand' | 'quash_dismissal' | 'quash_modify';

/** نتيجة تمييزية على قرار إجرائي تحقيقي (قبض، توقيف، كفالة...). */
export type ProceduralCassationAppealResult =
    | 'procedural_affirmation'
    | 'procedural_annulment'
    | 'procedural_remand_direction';

export type CassationAppealResult = DispositiveCassationAppealResult | ProceduralCassationAppealResult;

/** مرحلة إعادة المسار عند النقض والإحالة. */
export type CassationAppealRemandTarget = 'investigation' | 'misdemeanor' | 'felony';

/**
 * طعن/تدخل تمييزي — م/269 وقنوات 254/264.
 * (مستقل عن CassationProceeding على مستوى الإضبارة — يُدمجان في المراحل اللاحقة).
 */
export interface CassationAppeal {
    id: string;
    cassationType: CassationType;
    result?: CassationAppealResult;
    /** أسباب نقض موضوعية مشتركة — يستفيد جميع المتهمين م/269/ب. */
    isObjectiveGrounds: boolean;
    remandTargetStage?: CassationAppealRemandTarget;
    modifiedCharge?: string;
    modifiedArticle?: string;
}

/** نتيجة ختامية للطعن — توافق المحرك الحالي (يُرحَّل تدريجياً إلى CassationAppealResult). */
export type CassationOutcome = 'confirm' | 'quash_remand' | 'quash_final_release' | 'quash_modify_legal';

/** أساس التدخل التمييزي م 264/ب. */
export type ProsecutionInterventionBasis =
    | 'prosecutor_general_review'
    | 'parties_request'
    | 'court_sua_sponte';

export type CassationProceedingStatus = 'pending' | 'under_intervention_review' | 'concluded';

/** سجل الطعن/التدخل التمييزي النشط للإضبارة. */
export type CassationProceeding = {
    id: string;
    cassationType: CassationType;
    status: CassationProceedingStatus;
    filedAt: string;
    cassationNumber: string;
    panelName?: string;
    sentDate?: string;
    interventionBasis?: ProsecutionInterventionBasis;
    appellantDefendantIds: string[];
    /** المرحلة القضائية قبل الطعن (لإعادة الفتح عند النقض). */
    stageBeforeCassation: CaseStage;
    journeyFilterNodeId?: string;
    outcome?: CassationOutcome;
    /** المادة 269/ب — أسباب نقض موضوعية مشتركة. */
    sharedObjectiveGrounds269b?: boolean;
    concludedAt?: string;
    conclusionDetails?: string;
};

/** متابعة تنفيذ أمر الاستقدام أو القبض. */
export type OrderEnforcementKind = 'summons' | 'arrest';

export type OrderEnforcementTracking = {
    kind?: OrderEnforcementKind;
    legalArticleBasis?: string;
    notificationStatus?: 'pending' | 'notified';
    notifiedAt?: string;
    attendanceStatus?: 'pending' | 'attended' | 'absent';
    arrestExecuted?: 'pending' | 'executed' | 'not_executed';
    postArrestOutcome?: 'bailed' | 'detained';
};

/** نوع القرار القضائي في السجل الزمني الموحد. */
export type JudicialDecisionKind = 'preparatory' | 'dispositive';

/** هوية الطاعن في الطعن التمييزي على قرار واحد. */
export type JudicialAppellantType = 'complainant' | 'defendant';

/** حالة متابعة الطعن التمييزي المرتبط بقرار. */
export type JudicialCassationStatus = 'pending' | 'under_review' | 'concluded';

/** مسار الطعن/الإجراء — تمييز عادي، تدخل 264-ب، تصحيح 266. */
export type JudicialCassationAppealPath = 'ordinary' | 'intervention_264b' | 'correction_266';

/** طعن تمييزي مُسجَّل على قرار قضائي (متعدد لكل قرار). */
export type JudicialDecisionAppeal = {
    id: string;
    appellantType: JudicialAppellantType;
    appellantIds: string[];
    /** هوية الطاعن/المستهدف — متهمون أو مشتكون حسب صفة الطاعن. */
    targetDefendantIds?: string[];
    cassationStatus: JudicialCassationStatus | string;
    result?: CassationAppealResult | string;
    beneficiaryIds?: string[];
    filedAt?: string;
    /** مسار الإجراء — طعن عادي | تدخل | تصحيح. */
    appealPath?: JudicialCassationAppealPath;
    /** م 269/ب — أسباب نقض موضوعية مشتركة. */
    isObjectiveGrounds269b?: boolean;
    remandTargetStage?: CassationAppealRemandTarget;
    modifiedCharge?: string;
    modifiedArticle?: string;
    concludedAt?: string;
    /** توجيهات محكمة التمييز عند النقض وإعادة القرار للتوجيه الإجرائي. */
    cassationDirectives?: string;
    /** اسم الطاعن عند اختيار «إدخال يدوي» — بلا ربط ببطاقة طرف. */
    appellantManualLabel?: string;
};

/** مصير القرار تجاه الأطراف — لحوكمة إتاحة الطعن. */
export type JudicialDecisionDisposition = 'favors_defendant' | 'favors_complainant' | 'neutral';

/** وجاهي / غيابي — لاحتساب مدد الطعن (م 249). */
export type DecisionPresenceType = 'وجاهي' | 'غيابي';

export type DecisionCaseType = 'جناية' | 'جنحة' | 'مخالفة';

export type DecisionAppealabilityCategory =
    | 'قابل للطعن على انفراد'
    | 'غير قابل للطعن على انفراد'
    | 'قرار تمييزي';

/** قرار قضائي في السجل الزمني الموحد (محمي بعد القفل). */
export type JudicialDecision = {
    id: string;
    issuedAt: string;
    title: string;
    summary: string;
    decisionType: JudicialDecisionKind;
    appeals: JudicialDecisionAppeal[];
    isLocked: boolean;
    disposition?: JudicialDecisionDisposition;
    beneficiaryPartyIds?: string[];
    defendantIds?: string[];
    proceduralNodeId?: string;
    sourceRequestId?: string;
    /** قالب نوع الإجراء من القائمة الميدانية (يُميّز الإجراء المخصص). */
    proceduralTemplate?: string;
    /** للإجراء المخصص فقط — هل يقبل الطعن التمييزي الاستقلالي. */
    isAppealable?: boolean;
    /** نتيجة طلب المحامي عند القفل (موافقة/رفض) — للشارة فقط، لا تمييز. */
    requestOutcomeStatus?: 'approved' | 'rejected';
    /** تاريخ بدء التوقيف — قرار توقيف المتهم. */
    detentionStartDate?: string;
    /** تاريخ انتهاء التوقيف — محرك الموقوفية الذكي. */
    detentionEndDate?: string;
    /** تفاصيل كفالة المتهم — قرار تكفيل موحّد أو فردي. */
    defendantBail?: {
        kind?: 'financial' | 'personal';
        bailAmount?: string;
        guarantors?: Array<{ id?: string; fullName?: string }>;
    };
    /** تاريخ توثيق إطلاق السراح — يغلق العداد على هذه البطاقة. */
    detentionReleasedAt?: string;
    /** متابعة تنفيذ أمر الاستقدام/القبض. */
    orderEnforcement?: OrderEnforcementTracking;
    /** المادة القانونية المستند عليها. */
    legalArticleBasis?: string;
    /** المحكمة المحال إليها — إحالة الشكوى. */
    referredCourtName?: string;
    /** يُكتب عند ترحيل القرار من إضبارة مَضمومة إلى الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
    /** إضبارة وليدة التفريق — لنقض قرار الشطر وإعادتها. */
    linkedSeveranceCaseId?: string;
    /** معرّفات المتهمين في الأم قبل التفريق — لاستعادتهم عند النقض. */
    severanceParentDefendantIds?: string[];
    /** إضبارة مضمومة — لنقض قرار التوحيد وإعادتها. */
    linkedMergedCaseId?: string;
    /** نوع الحضور — وجاهي أو غيابي. */
    decisionPresenceType?: DecisionPresenceType;
    /** نوع الجريمة لاحتساب مدة الغياب. */
    decisionCaseType?: DecisionCaseType;
    /** تصنيف قابلية الطعن — م 249 / 267. */
    decisionAppealability?: DecisionAppealabilityCategory;
    /** هل سُجّل طعن أو تدخل تمييزي. */
    isAppealed?: boolean;
    /** نتيجة الطعن المختصرة للعرض. */
    appealResult?: string;
    /** إعلان حكم بات يدوي — تنازل عن المدد. */
    isJudgmentFinalDeclared?: boolean;
    /** تاريخ إعلان الحكم باتاً. */
    judgmentFinalDeclaredAt?: string;
    /** اسم المُعلِن عند الإدخال اليدوي. */
    judgmentFinalDeclaredByLabel?: string;
    /** معرّفات الأطراف المُعلِنين. */
    judgmentFinalDeclaredByIds?: string[];
    /** تاريخ وصول أوراق الدعوى — م 266 (30 يوماً للتصحيح). */
    cassationPapersReceivedAt?: string;
    /** طلب تدخل تمييزي قيد النظر (م 264-ب). */
    interventionCassationPending?: boolean;
    /** طلب تصحيح قرار تمييزي — م 266. */
    cassationCorrectionPending?: boolean;
};

import type { InvestigationDefendantStatus } from '@/app/types/investigationDefendant';

/** المصير الإجرائي الفردي للمتهم داخل الإضبارة الموحدة. */
export type DefendantPersonalStage =
    | 'under_investigation'
    | 'referred_to_trial'
    | 'acquitted'
    | 'convicted'
    | 'released_temporary'
    | 'lawsuit_dropped_death'
    | 'lawsuit_dropped';

/**
 * المتهم في الإضبارة الجزائية — الحالة الفردية إلزامية في النموذج المرحلي 1.
 * (التخزين الحالي في criminalStore يُكمّل القيمة عند التحميل إن وُجدت قديماً).
 */
export interface Defendant {
    id: string;
    personalStage: DefendantPersonalStage;
    /** حالة المتهم داخل التحقيق — تصفية الخصوم (افتراضي: active). */
    investigationStatus?: InvestigationDefendantStatus;
}

/** حالة محطة مسار الإضبارة في رأس اللوحة. */
export type JourneyNodeStatus = 'past' | 'current';

/**
 * عقدة مسار الرأس — الشكل الأساسي لـ stageJourney (مرحلة 1).
 * arrowLabel: نص المحرك القانوني فوق الواصل؛ targetDefendantIds: نطاق المتهمين لهذه المحطة.
 */
export type StageJourneyNode = {
    id: string;
    stage: CaseStage;
    label: string;
    status: JourneyNodeStatus;
    arrowLabel?: string;
    targetDefendantIds?: string[];
};

/**
 * نوع حركة محرّك التنقلات الجزائية (9 مسارات معتمدة عبر القرار الختامي).
 * - forward_referral: إحالة 130/ب — تقدم أفقي
 * - backward_reversal: إعادة للنقص — ارتداد علوي برتقالي
 * - jurisdiction_swap: عدم اختصاص نوعي — تحويل بين المحكمتين
 * - cassation_ascend: طعن تمييزي — صعود للتمييز
 * - cassation_descend: نقض وإعادة — هبوط أحمر طويل
 * - cassation_confirm: تصديق حكم تمييزي
 */
export type JourneyTransitionKind =
    | 'forward_referral'
    | 'backward_reversal'
    | 'jurisdiction_swap'
    | 'cassation_ascend'
    | 'cassation_descend'
    | 'cassation_confirm'
    | 'parallel_fork'
    | 'cassation_parallel_ascend';

/** عقدة مسار موسّعة — حقول المحرك والتفرع (توافق خلفي مع stageJourney الحالي). */
export type JourneyNode = StageJourneyNode & {
    /** @deprecated prefer arrowLabel — نص المحرك القانوني فوق الواصل. */
    transitionText?: string;
    /** هندسة السهم في الحاوية العلوية. */
    transitionKind?: JourneyTransitionKind;
    /** تاريخ بدء الحقبة — فلترة Time-Tenure. */
    startedAt?: string;
    /** تاريخ إغلاق الحقبة عند الانتقال (past فقط). */
    endedAt?: string;
    /** معرّف العقدة الأم عند التشعب. */
    parentId?: string;
    /** مسار فرعي مستقل (تجزئة إضبارة / انشطار مصائر). */
    branchId?: string;
    branchLabel?: string;
    /** @deprecated prefer targetDefendantIds — المتهمون المشمولون بهذا المسار فقط. */
    defendantIds?: string[];
    /** مرحلة نشطة استثنائية فوق المرحلة القضائية. */
    phaseOverlay?: JourneyPhaseOverlay;
    /** العقدة التي أنشأت تفرعاً متوازياً. */
    isForkRoot?: boolean;
    /** معرّفات العقد الفرعية النشطة المتوازية. */
    forkChildIds?: string[];
    /** قناة تمييز — للفلترة والرسم. */
    cassationType?: CassationType;
    /** عقدة فلتر لوائح التمييز (قراءة فقط عند النقر). */
    isCassationFilterNode?: boolean;
};

export type ProceduralNodeStatus = 'completed' | 'active';

export type ProceduralArrowType = 'forward_referral' | 'backward_reversal' | 'cassation_override';

export type ProceduralNode = {
    id: string;
    stage: CaseStage;
    label: string;
    status: ProceduralNodeStatus;
    arrivalArrowType: ProceduralArrowType;
    arrowLabel: string;
    /** تاريخ بدء نشاط العقدة (YYYY-MM-DD). */
    startedAt: string;
    /** تاريخ إغلاق العقدة عند الانتقال للتالية. */
    endedAt?: string;
    parentId?: string;
    branchId?: string;
    branchLabel?: string;
    defendantIds?: string[];
    phaseOverlay?: JourneyPhaseOverlay;
    isForkRoot?: boolean;
    forkChildIds?: string[];
};

/** معرّف إجراء تحويل المسار — يُختار من القائمة الديناميكية. */
export type ProceduralTransitionActionId =
    | 'refer_misdemeanor'
    | 'refer_felony'
    | 'return_investigation_deficiency'
    | 'misdemeanor_to_felony_jurisdiction'
    | 'felony_to_misdemeanor_jurisdiction'
    | 'trial_cassation_appeal'
    | 'cassation_quash_investigation'
    | 'cassation_quash_trial_misdemeanor'
    | 'cassation_quash_trial_felony'
    | 'cassation_confirm';

/** أحداث التحقيق — لا تُعدَّل بعد قفل التحقيق. */
export const INVESTIGATION_EVENT_CATEGORIES = [
    'تدوين إفادة',
    'تدوين أقوال',
    'مفاتحة رسمية',
    'طب عدلي',
    'كشف دلالة',
    'ضبط مبرز',
] as const;

export type InvestigationEventCategory = (typeof INVESTIGATION_EVENT_CATEGORIES)[number];

/** أحداث المحاكمة (جنح / جنايات). */
export const TRIAL_EVENT_CATEGORIES = [
    'جلسة مرافعة',
    'تأجيل لتدقيق',
    'إمهال لتقديم لائحة',
    'استماع لشهود المحكمة',
    'قرار حكم غيابي',
    'قرار حكم وجاهي',
    'قرار إفراج',
    'إحالة لعدم الاختصاص',
] as const;

export type TrialEventCategory = (typeof TRIAL_EVENT_CATEGORIES)[number];

export const INVESTIGATION_REFERRAL_MISDEMEANOR_LABEL = 'إحالة إلى محكمة الجنح';
export const INVESTIGATION_REFERRAL_FELONY_LABEL = 'إحالة إلى محكمة الجنايات';
export const INVESTIGATION_REFERRAL_JUVENILE_LABEL = 'إحالة إلى محكمة الأحداث';

/** تحويل نتيجة المحرك القديم إلى واجهة CassationAppealResult. */
export const CASSATION_OUTCOME_TO_APPEAL_RESULT: Record<CassationOutcome, CassationAppealResult> = {
    confirm: 'affirmation',
    quash_remand: 'quash_remand',
    quash_final_release: 'quash_dismissal',
    quash_modify_legal: 'quash_modify',
};

/** تحويل عكسي — للترحيل التدريجي من المرحلة 1 (قرارات الحسم الختامية فقط). */
export const CASSATION_APPEAL_RESULT_TO_OUTCOME: Record<DispositiveCassationAppealResult, CassationOutcome> = {
    affirmation: 'confirm',
    quash_remand: 'quash_remand',
    quash_dismissal: 'quash_final_release',
    quash_modify: 'quash_modify_legal',
};
