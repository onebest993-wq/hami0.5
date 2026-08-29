/** Lawyer requests, trash, trials, verdict cards — slice of CriminalStoreState */
import type { LawyerRequest } from './criminalCaseModel';
import type {
    CreateLawyerRequestInput,
    CreateLawyerRequestResult,
    FinalizeLawyerRequestInput,
} from './lawyerRequestsEngine';
import type { OrderEnforcementTracking } from '@/app/types/criminal';
import type {
    AddTrialSessionInput,
    FinalizeTrialVerdictInput,
    TrialSessionPreparatoryDecisionInput,
} from './trialSessionsEngine';
import type {
    AddTrialDepositionInput,
    UpdateTrialDepositionPatch,
} from './trialDepositionsEngine';
import type { ModifyTrialChargeInput } from './trialChargeEngine';
import type {
    VerdictCorrectionAppealTrack,
    VerdictInterventionAppealTrack,
    VerdictOrdinaryAppealTrack,
} from './verdictCardsEngine';
import type { VerdictCassationResultSaveInput } from './verdictCassationResultEngine';
import type { StageFinalDecisionFormPayload } from './stageFinalDecisionEngine';
import type { RegisterStageFinalDecisionMeta } from './criminalStageFinalMutations';

export type CriminalStoreStateRequestTrialActions = {
    addOrUpdateRequest: (caseId: string, request: LawyerRequest) => void;
    /** إنشاء طلب جديد — حالة قيد النظر فقط (منفصل زمنياً عن هامش القاضي). */
    createLawyerRequest: (caseId: string, input: CreateLawyerRequestInput) => CreateLawyerRequestResult;
    /** تدوين هامش القاضي وقفل الطلب — بعد صدور القرار لاحقاً. */
    finalizeLawyerRequest: (caseId: string, requestId: string, input: FinalizeLawyerRequestInput) => string | null;
    /** إغلاق التوقيف النشط — إطلاق سراح بكفالة (وكيل المتهم). */
    releaseDefendantsFromDetention: (caseId: string, defendantIds: string[]) => string | null;
    /** تمديد توقيف على نفس البطاقة — تحديث تاريخ الانتهاء دون إنشاء قرار جديد. */
    extendDetentionOnDecision: (caseId: string, decisionId: string, newEndDate: string) => string | null;
    /** توثيق إطلاق سراح على البطاقة — إغلاق العداد وتحديث حالة المتهم. */
    documentDetentionReleaseOnDecision: (caseId: string, decisionId: string) => string | null;
    updateOrderEnforcementOnDecision: (
    caseId: string,
    decisionId: string,
    patch: Partial<OrderEnforcementTracking>,
    ) => string | null;
    updateLawyerRequest: (caseId: string, requestId: string, updatedData: Partial<Omit<LawyerRequest, 'id'>>) => void;
    deleteLawyerRequest: (caseId: string, requestId: string) => void;
    moveLawyerRequestToTrash: (caseId: string, requestId: string) => string | null;
    moveJudicialDecisionToTrash: (caseId: string, decisionRef: string) => string | null;
    restoreTrashItem: (caseId: string, trashItemId: string) => string | null;
    purgeTrashItem: (caseId: string, trashItemId: string) => string | null;
    addTrialSession: (caseId: string, sessionData: AddTrialSessionInput) => string | null;
    updateTrialSession: (caseId: string, sessionId: string, sessionData: AddTrialSessionInput) => string | null;
    documentTrialSessionPreparatoryDecision: (
    caseId: string,
    input: {
    sessionId?: string;
    session: AddTrialSessionInput;
    preparatory: TrialSessionPreparatoryDecisionInput;
    },
    ) => string | null;
    postponeTrialSession: (
    caseId: string,
    sessionId: string,
    nextDate: string,
    reason: string,
    prepNote: string,
    ) => string | null;
    /** تسجيل موعد المحاكمة (location.nextHearingDate) دون إنشاء جلسة مرافعة */
    registerInitialTrialHearingDate: (caseId: string, nextHearingDate: string) => string | null;
    prunePhantomScheduledTrialSessions: (caseId: string) => void;
    finalizeTrialVerdict: (caseId: string, sessionId: string, verdictData: FinalizeTrialVerdictInput) => string | null;
    /** ربط جلسة المرافعة بقرار ختامي صادر عبر StageFinalDecisionModal — دون إعادة إصدار القرار. */
    syncTrialSessionVerdictFromStageFinal: (
    caseId: string,
    sessionId: string,
    input: { kind: string; issuedAt: string; presenceType?: string },
    ) => string | null;
    updateVerdictCardDraft: (caseId: string, cardId: string, draft: string) => void;
    patchVerdictCardOrdinaryAppeal: (
    caseId: string,
    cardId: string,
    patch: Partial<VerdictOrdinaryAppealTrack>,
    ) => void;
    recordVerdictCardCassationResult: (
    caseId: string,
    cardId: string,
    input: VerdictCassationResultSaveInput,
    ) => string | null;
    patchVerdictCardInterventionAppeal: (
    caseId: string,
    cardId: string,
    patch: Partial<VerdictInterventionAppealTrack>,
    ) => void;
    patchVerdictCardCorrectionAppeal: (
    caseId: string,
    cardId: string,
    patch: Partial<VerdictCorrectionAppealTrack>,
    ) => void;
    /** منظومة إصدار القرار الختامي — نموذج ديناميكي + بطاقة ذكية. */
    registerStageFinalDecision: (
    caseId: string,
    payload: StageFinalDecisionFormPayload,
    meta: RegisterStageFinalDecisionMeta,
    ) => string | null;
    recordVerdictAbsentiaPublication: (caseId: string, cardId: string, publicationDate: string) => string | null;
    recordVerdictAbsentiaObjection: (caseId: string, cardId: string) => string | null;
    refreshVerdictCardLifecycles: (caseId: string) => void;
    ensureCaseSovereignContext: (caseId: string) => void;
    addTrialDeposition: (caseId: string, input: AddTrialDepositionInput) => string | null;
    updateTrialDeposition: (caseId: string, depositionId: string, patch: UpdateTrialDepositionPatch) => string | null;
    deleteTrialDeposition: (caseId: string, depositionId: string) => string | null;
    modifyTrialChargeDescription: (caseId: string, input: ModifyTrialChargeInput) => string | null;
    addRequestMargin: (caseId: string, requestId: string, text: string) => void;
    toggleRequestStar: (caseId: string, requestId: string) => void;
    addRequestAttachment: (caseId: string, requestId: string, name: string) => void;
    removeRequestAttachment: (caseId: string, requestId: string, attachmentId: string) => void;
};
