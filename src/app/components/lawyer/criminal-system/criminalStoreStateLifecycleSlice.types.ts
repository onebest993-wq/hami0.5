/** Referrals, case ops, severance, lifecycle — slice of CriminalStoreState */
import type { SeveranceReason } from '@/app/types/criminal';
import type {
    CriminalCase,
    CriminalCaseStage,
    InvestigationPapersAt,
    JudicialSeveranceDraft,
    LegalArticleChange,
    StageConclusion,
} from './criminalCaseModel';
import type {
    InitiateCassationPayload,
    RecordCassationResultPayload,
} from './cassationEngine';
import type { InvestigationReferralTargetStage } from './juvenileInvestigationRules';
import type { MisdemeanorType } from './caseClassificationEngine';
import type { CriminalActionParty } from './criminalStageUtils';

export type CriminalStoreStateLifecycleActions = {
    applyInvestigationReferral: (
    caseId: string,
    payload: {
    targetCaseStage: InvestigationReferralTargetStage;
    courtName: string;
    courtCaseNumber: string;
    publicProsecutionNumber?: string;
    referralLegalArticle?: string;
    decisionDate: string;
    decisionDetails: string;
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'];
    defendantIds: string[];
    defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>;
    /** إلزامي عند الإحالة إلى محكمة الجنح. */
    referralMisdemeanorType?: MisdemeanorType;
    },
    ) => void;
    /** إحالة المتهمين النشطين إلى إضبارة محكمة موضوع جديدة. */
    referInvestigationDefendantToTrial: (
    caseId: string,
    payload: {
    defendantIds: string[];
    targetCaseStage: InvestigationReferralTargetStage;
    courtName: string;
    courtCaseNumber: string;
    decisionDate: string;
    decisionDetails: string;
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'];
    publicProsecutionNumber?: string;
    referralLegalArticle?: string;
    referralMisdemeanorType?: MisdemeanorType;
    },
    ) => string | null;
    registerPartyDeath: (caseId: string, defendantId: string, date?: string) => void;
    /** @alias registerPartyDeath */
    recordPartyDeath: (caseId: string, defendantId: string, date?: string) => void;
    /** تفريق الدعاوى — إنشاء إضبارة ابنة ونقل المتهمين المحددين من الأم. */
    severCase: (
    parentCaseId: string,
    payload: {
    defendantIds: string[];
    severanceReason: SeveranceReason;
    date: string;
    details: string;
    },
    ) => string | null;
    referAndGenerateCase: (
    currentCaseId: string,
    targetCourt: string,
    decisionDetails: StageConclusion,
    referralMeta?: { courtName: string; caseNumber: string },
    ) => string | null;
    reopenClosedCase: (caseId: string, reopenReason: string) => void;
    /** إنهاء الغلق المؤقت وإعادة تفعيل الإضبارة التحقيقية. */
    endInvestigationTemporaryClosure: (caseId: string) => string | null;
    /**
     * @deprecated ALIAS_ONLY — غلاف توافقي فوق initiateCassationProceeding (criminalStoreCaseCassationOpsActions).
     * ما زال يُستدعى من اختبارات الدمج/المتجر؛ لا تحذف حتى يُرحَّل الاستدعاء.
     */
    sendCaseToCassation: (
    caseId: string,
    data: { cassationNumber: string; sentDate: string; panelName: string },
    ) => void;
    initiateCassationProceeding: (caseId: string, payload: InitiateCassationPayload) => void;
    updateCaseLocation: (
    caseId: string,
    newLocationType: 'police' | 'court',
    newLocationName: string,
    reason: string,
    ) => void;
    correctCasePartyName: (
    caseId: string,
    payload: {
    partyKind: 'complainant' | 'defendant';
    partyId: string;
    newFullName: string;
    newPhone?: string;
    newAddress?: string;
    reason: string;
    },
    ) => string | null;
    correctCaseCourtName: (
    caseId: string,
    payload: { newCourtName: string; reason: string; scope: 'investigation' | 'trial' },
    ) => string | null;
    correctCaseDepositionLocation: (
    caseId: string,
    payload: { papersAt: InvestigationPapersAt; entityName: string; reason: string },
    ) => string | null;
    correctCaseLegalArticle: (caseId: string, payload: { newArticle: string; reason: string }) => string | null;
    correctCaseReferenceNumbers: (
    caseId: string,
    payload: { courtCaseNumber?: string; publicProsecutionNumber?: string; reason: string },
    ) => string | null;
    updateCaseStage: (caseId: string, stage: CriminalCaseStage) => void;
    updateLegalArticle: (caseId: string, change: LegalArticleChange) => void;
    waivePrivateRight: (caseId: string, waiverDate: string) => void;
    /** ضم الإضبارة التابعة (child) في الإضبارة الأم النشطة (parent) */
    mergeCases: (parentCaseId: string, childCaseId: string, mergeReason: string) => void;
    severJuvenileDefendantToJuvenileCourt: (caseId: string, defendantId: string, date: string, details: string) => string | null;
    /** قرار ختامي مع نطاق متهمين — يحدّث personalStage للمستهدفين فقط. */
    issueStageDecision: (
    caseId: string,
    conclusion: StageConclusion,
    referral?: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
    /** مزامنة مسار الرأس مع قرار إحالة/انتقال مسجّل ولم يُطبَّق بعد. */
    applyPendingJourneyOrder: (caseId: string) => string | null;
    recordCassationResult: (caseId: string, payload: RecordCassationResultPayload) => string | null;
    /** عرض مشتق للإضبارة (وراثة الأم للتابعة). */
    getCaseForDisplay: (caseId: string) => CriminalCase | null;
    /** أطراف أحياء فقط — إفادات، طلبات، توقيف، كفالة. */
    getActiveParties: (caseId: string) => CriminalActionParty[];
    /** جميع الأطراف مع علامة المتوفى — أدلة، طب عدلي، مبرزات. */
    getAllParties: (caseId: string) => CriminalActionParty[];
    concludeStage: (
    caseId: string,
    conclusion: StageConclusion,
    referral?: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
    referCaseToTrial: (
    caseId: string,
    referralData: { decisionNumber: string; decisionDate: string },
    newCourtData: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
    createCaseFromDraft: () => string | null;
    deleteCase: (id: string) => boolean;
    resetDraft: () => void;
    /**
    * يفتح عملية تفريق الدعوى: يلتقط لقطة المتهمين، يضع السياق في الحالة،
    * ويُعيد تهيئة المسودّة لإحضار شاشة «إضبارة جديدة» فارغة مع المتهمين فقط.
    * يُعيد `true` عند النجاح و`false` إذا تعذّر الإجراء (الأم غير موجودة / لم يُحدَّد متهمون).
    */
    beginSeveranceFromDossier: (
    parentCaseId: string,
    defendantIds: string[],
    options?: {
    judicialSeveranceDraft?: JudicialSeveranceDraft;
    severanceReason?: SeveranceReason;
    severanceReasonDetail?: string;
    },
    ) => boolean;
    /**
    * يُنفّذ تفريق الدعوى الكامل:
    *   أ) ينشئ الإضبارة الجديدة من المسودّة الحالية.
    *   ب) يحذف المتهمين المنقولين من الإضبارة الأم نهائياً.
    *   ج) يُرحّل (يُغيّر caseId) أي طلب/قرار/إفادة/حدث تايم‑لاين/سجل تحقيق
    *      كان مرتبطاً حصرياً بهؤلاء المتهمين فقط.
    * يُعيد معرّف الإضبارة الجديدة عند النجاح، أو `null` عند فشل التحقق.
    */
    commitSeveranceFromDossier: () => string | null;
    /** يحفظ مسودّة التفريق ويُفرّغ مسودّة الإضبارة العادية (عند الخروج دون إتمام الشطر). */
    stashPendingSeveranceForm: () => void;
    /** يستأنف تعبئة الإضبارة المفرّقة في المسودّة النشطة. */
    resumePendingSeveranceForm: () => boolean;
    /**
    * يُجهّز مسودّة «إضبارة جديدة» العادية فقط — لا يمسّ formDraft المعلّقة للتفريق.
    * يُستدعى قبل فتح النموذج العام (أرشيف / زر إضافة ملف).
    */
    prepareNormalCriminalCaseForm: () => void;
    /** يلغي عملية التفريق المعلّقة ويُصفّر المسودّة. */
    cancelPendingSeverance: () => void;
    /** يحدّث سبب التفريق في السياق المعلّق (اختياري). */
    setPendingSeveranceReason: (reason?: SeveranceReason, detail?: string) => void;
};
