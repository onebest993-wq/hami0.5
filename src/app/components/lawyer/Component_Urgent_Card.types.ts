export type UrgentCaseStatus = 'critical' | 'warning' | 'safe' | 'expired' | 'completed';
export type UrgentCaseType = 'urgent_action' | 'state_order';
export type ActionPhase = 'notification_pending' | 'grievance_window' | 'cassation_window' | 'completed';
export type LegalState = 'Awaiting_Grievance' | 'Grievance_Filed' | 'Awaiting_Cassation';

export type CaseNote = {
    id: string;
    text: string;
    createdAt: string;
};

export type CaseAttachment = {
    id: string;
    kind: 'file' | 'link';
    name: string;
    url?: string;
    createdAt: string;
};

export type CaseFollowup = {
    id: string;
    title: string;
    date: string;
    completed: boolean;
    createdAt: string;
};

export type InitialNotificationMethod = 'personal' | 'by_agent' | 'publication';

export type HearingStage = 'pre_decision' | 'grievance';

export type CaseHearing = {
    id: string;
    stage: HearingStage;
    sessionDate: string;
    notes: string;
    nextSessionDate: string;
    createdAt: string;
};

export type ExpertModule = {
    enabled: boolean;
    expertName: string;
    depositAmount: string;
    inspectionDate: string;
    reportDueDate: string;
    reportReceivedDate: string;
};

export type CasePartyEntry = {
    name: string;
    type?: string;
    phone?: string;
    address?: string;
    isRepresented?: boolean;
    /** يُشتق من موكلي المطلوب ضده في النموذج */
    isClient?: boolean;
};

export interface UrgentCase {
    id: string;
    type: UrgentCaseType;
    actionType: string; // "الكشف المستعجل", "الحجز الاحتياطي", etc.
    applicantName: string;
    court: string;
    requestNumber?: string;
    requestDate?: string;
    courtName?: string;
    judgeName?: string;
    specificActionType?: string;
    /** تصنيف ثنائي: أوامر على عرائض | قضاء مستعجل — يتحكم بمسار التظلم والتمييز */
    procedureCategory?: 'petition_orders' | 'urgent_judiciary' | null;
    /** Phase 25 — تفاصيل جوهرية للإجراء (مرتبطة بنوع الطلب) */
    procedureDetails?: string | null;
    requestSubject?: string;
    urgentReason?: string;
    legalBasis?: string;
    requestNotes?: string;
    feeReceiptNumber?: string | null;
    feeReceiptDate?: string | null;
    initialNotificationMethod?: InitialNotificationMethod | null;
    initialNotificationDate?: string | null;
    party1Name?: string;
    party1Phone?: string;
    party1Address?: string;
    party2Name?: string;
    party2Address?: string;
    allParty1?: CasePartyEntry[];
    allParty2?: CasePartyEntry[];
    representedParty?: 'client' | 'opponent' | null;
    /** Phase 22 — وكيل المطلوب ضده: نقطة الدوران */
    defenderEntryPhase?: 1 | 2 | 3 | null;
    clientRole?: 'respondent' | 'applicant' | null;
    /** تاريخ صدور الأمر عند الدخول من مرحلة التظلم */
    stateOrderIssuedDate?: string | null;
    deadlineDate?: Date | null;
    /** يُكتب سلسلة YYYY-MM-DD في كل المشروع؛ الإعلان بـDate وحده كان مخالفاً للواقع */
    sessionDate?: Date | string | null;
    notificationDate?: Date | string | null;
    deadlineDays?: number | null;
    firstHearingDate?: string | null;
    preDecisionClosed?: boolean;
    expectedDecisionDate?: string | null;
    judgeDecision?: 'accepted' | 'rejected' | 'partially_accepted' | null;
    judgeDecisionDate?: string | null;
    hasIntervention?: boolean;
    isMainLawsuitFiled?: boolean;
    guaranteeKind?: 'cash' | 'personal' | 'real_estate' | 'none' | null;
    guaranteeDetailsText?: string | null;
    legalState?: LegalState | null;
    rejectionNotificationDate?: string | null;
    grievanceOutcome?: 'filed' | 'expired' | null;
    grievanceFiledBy?: 'client' | 'opponent' | null;
    grievanceFilingDate?: string | null;
    /** تاريخ أول جلسة تظلم (منفصل تماماً عن firstHearingDate) */
    grievanceFirstHearingDate?: string | null;
    grievanceSessionDate?: string | null;
    grievanceDecision?: 'confirmed' | 'modified' | 'canceled' | null;
    grievanceDecisionDate?: string | null;
    cassationOutcome?: 'filed' | 'expired' | null;
    cassationFiledBy?: 'client' | 'opponent' | null;
    cassationFilingDate?: string | null;
    cassationFileNumber?: string | null;
    cassationDecision?: 'confirmed' | 'modified' | 'canceled' | null;
    cassationDecisionDate?: string | null;
    archived?: boolean;
    archivedAt?: string | null;
    archivedReason?: string | null;
    deleted?: boolean;
    deletedAt?: string | null;
    deletedReason?: string | null;
    guaranteeStatus?: boolean;
    requiresGuarantee?: boolean;
    guaranteeSubmitted?: boolean;
    guaranteeRecovered?: boolean;
    guaranteeRecoveryDate?: string | null;
    orderLifted?: boolean;
    orderLiftDate?: string | null;
    hearings?: CaseHearing[];
    expertModule?: ExpertModule;
    notes?: CaseNote[];
    events?: Array<{ id: string; kind: 'system' | 'action' | 'edit'; message: string; createdAt: string }>;
    attachments?: CaseAttachment[];
    followups?: CaseFollowup[];
    phase: ActionPhase;
    isNotificationConfirmed?: boolean;
    grievanceResult?: 'affirmed' | 'modified' | 'cancelled' | null;
    status: UrgentCaseStatus;
    createdAt: Date;
}
