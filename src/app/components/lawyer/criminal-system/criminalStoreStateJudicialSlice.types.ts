/** Judicial lifecycle, party status, seized assets — slice of CriminalStoreState */
import type {
    JudicialAppellantType,
    JudicialCassationAppealPath,
    JudicialDecision,
    OrderEnforcementTracking,
} from '@/app/types/criminal';
import type { DefendantStatus, PhysicalLocation } from './criminalCaseModel';
import type { SeizedAsset } from './criminalSeizedAssetModel';
import type { RecordJudicialCassationResultPayload } from './cassationJudicialForm';

export type CriminalStoreStateJudicialActions = {
    fileJudicialDecisionAppeal: (
    caseId: string,
    decisionId: string,
    payload: {
    appellantType: JudicialAppellantType;
    appellantIds: string[];
    targetDefendantIds: string[];
    filedAt?: string;
    appellantManualLabel?: string;
    appealPath?: JudicialCassationAppealPath;
    },
    ) => string | null;
    declareJudicialDecisionFinal: (
    caseId: string,
    decisionId: string,
    payload: {
    declarerType: JudicialAppellantType;
    declarerIds: string[];
    declarerManualLabel?: string;
    declaredAt?: string;
    },
    ) => string | null;
    patchJudicialDecisionLifecycle: (
    caseId: string,
    decisionId: string,
    patch: Partial<
    Pick<
    JudicialDecision,
    | 'decisionPresenceType'
    | 'decisionCaseType'
    | 'decisionAppealability'
    | 'isAppealed'
    | 'appealResult'
    | 'isJudgmentFinalDeclared'
    | 'judgmentFinalDeclaredAt'
    | 'judgmentFinalDeclaredByLabel'
    | 'judgmentFinalDeclaredByIds'
    | 'cassationPapersReceivedAt'
    | 'interventionCassationPending'
    | 'cassationCorrectionPending'
    >
    >,
    ) => string | null;
    recordJudicialAppealResult: (
    caseId: string,
    decisionId: string,
    appealId: string,
    payload: RecordJudicialCassationResultPayload,
    ) => string | null;
    updateCaseDefendantStatus: (caseId: string, defendantId: string, status: DefendantStatus) => void;
    /**
    * ⚖️ شكوى متقابلة — يُحدّث الحالة الإجرائية لمشتكٍ يَكتسب صفة المتهم،
    * مع الحفاظ على بقاء سجله داخل مصفوفة `complainants` (لا نقل/تخريب للداتا).
    * يُحدّث `accusedStatus` و`accusedDetentionHistoryLog` بصورة منفصلة عن سجله كمشتكي.
    */
    updateCrossComplainantAccusedStatus: (
    caseId: string,
    complainantId: string,
    status: DefendantStatus,
    ) => void;
    /**
    * 💀 تسجيل وفاة المشتكي المتقابل بصفته متهماً — يَقفل سجله الفرعي
    * (accusedIsPartyRecordLocked + accusedPersonalStage='lawsuit_dropped_death')
    * مع توثيق الحدث على السجل الزمني. لا يَنقل الكائن من مصفوفة المشتكين.
    */
    registerCrossComplainantAccusedDeath: (
    caseId: string,
    complainantId: string,
    date?: string,
    ) => void;
    /**
    * 📦 حجز الأموال على مشتكٍ متقابل «هارب» — مقابل addDefendantSeizedAssets.
    * يُخزَّن على حقل `accusedSeizedAssets` ضمن سجل المشتكي نفسه.
    */
    addCrossComplainantSeizedAssets: (
    caseId: string,
    complainantId: string,
    assets: Array<Omit<SeizedAsset, 'id' | 'createdAt'> & { id?: string; createdAt?: string }>,
    sourceRequestId?: string,
    ) => void;
    updateCrossComplainantSeizedAsset: (
    caseId: string,
    complainantId: string,
    assetId: string,
    patch: Partial<Pick<SeizedAsset, 'description' | 'referenceNumber' | 'seizureDate' | 'notes'>>,
    ) => void;
    releaseCrossComplainantSeizedAssets: (
    caseId: string,
    complainantId: string,
    assetIds?: string[],
    ) => void;
    confirmBailAfterAppeal: (caseId: string, defendantIds?: string[]) => void;
    fileInAbsentiaObjection: (caseId: string, defendantId: string) => void;
    /**
    * يضيف صنفاً (أو أكثر) من الأموال المحجوزة على متهم هارب.
    * يُستخدم داخل قرار «حجز الأموال» (إجراء قاضٍ منفّذ).
    * كل صنف يلتقط `sourceRequestId` لربطه بقرار القاضي.
    */
    addDefendantSeizedAssets: (
    caseId: string,
    defendantId: string,
    assets: Array<Omit<SeizedAsset, 'id' | 'createdAt'> & { id?: string; createdAt?: string }>,
    sourceRequestId?: string,
    ) => void;
    /** يُعدّل صنف حجز واحد (تصحيح خطأ — قبل/بعد فك الحجز لا يهم). */
    updateDefendantSeizedAsset: (
    caseId: string,
    defendantId: string,
    assetId: string,
    patch: Partial<Pick<SeizedAsset, 'description' | 'referenceNumber' | 'seizureDate' | 'notes'>>,
    ) => void;
    /** يفكّ الحجز عن صنف واحد أو عدة أصناف (أو جميعها إذا تُرك `assetIds` فارغاً). */
    releaseDefendantSeizedAssets: (caseId: string, defendantId: string, assetIds?: string[]) => void;
    updateBailForfeiture: (caseId: string, defendantId: string, data: { forfeitureNote?: string }) => void;
    updateCasePhysicalLocation: (caseId: string, location: PhysicalLocation, customName?: string) => void;
    setDraftArticle3Offense: (value: boolean) => void;
    setDraftMutualComplaint: (value: boolean) => void;
    setDraftPublicProsecutionComplainant: (value: boolean) => void;
    setDraftArticleIncludesPublicRight: (value: boolean) => void;
    setDraftCrimeDiscoveryDate: (value: string) => void;
};
