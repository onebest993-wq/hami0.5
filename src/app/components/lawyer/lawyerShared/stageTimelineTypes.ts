import type { Party, ConsolidationSecondaryRef } from './fileDataTypes';
import type { IncidentalCase } from './incidentalTypes';

export type EventType =
    | 'appointment'
    | 'note'
    | 'document'
    | 'decision'
    | 'expert'
    | 'milestone'
    | 'alert'
    | 'action';
export type AppointmentType = 'pleading' | 'investigation' | 'witness' | 'verdict' | 'other';
export type DocumentCategory = 'agency' | 'regulations' | 'identity' | 'evidence' | 'decision';

export type NotificationStatus = 'pending' | 'in_person' | 'via_media' | 'publication';

export interface TimelineEvent {
    id: string;
    type: EventType;
    subType?: AppointmentType;
    date: string;
    time?: string;
    /** مدة الجلسة بالدقائق — من الإضبارة أو metadata */
    durationMinutes?: number;
    title: string;
    details?: string;
    isNew?: boolean;
    isDeleted?: boolean;
    docCategory?: DocumentCategory;
    isSystemLog?: boolean;
    tags?: string[]; // 🔥 New: Evidence Tags
    isStayed?: boolean; // 🔥 New: Stay of Proceedings
    isSessionRecord?: boolean; // 🔥 New: To distinguish session records
    /** محضر تحركات وكيل الخصم / الطرف الآخر */
    isOpponentProceedings?: boolean;
    evidentiaryWeight?: 'official' | 'ordinary' | 'beginning' | 'other'; // 🔥 New: Smart Evidence Portfolio
    color?: string;
    isAttachment?: boolean;
    attachmentStatus?: string;
    isFastTrack?: boolean;
    fastTrackStatus?: string;
    description?: string;
    icon?: string;
    text?: string;
    isPause?: boolean;
    metadata?: Record<string, unknown>;
}

export interface ProvisionalOrder {
    id: string;
    type: string;
    targetParty: string;
    date: string;
}

export interface ThirdParty {
    id: string;
    name: string;
    role: string;
}

export interface CaseStage {
    id: string;
    name: string;
    status: 'locked' | 'active' | 'completed' | 'abandoned' | 'future' | 'voided';
    defendantNotificationStatus?: NotificationStatus;
    hasCrossAppeal?: boolean;
    incidentalCases?: IncidentalCase[];
    timeline?: TimelineEvent[];
    stageName?: string;
    extraordinaryAppealType?: string;
    // 🎯 CRITICAL: First Instance Data Preservation for Appellate Stages
    firstInstanceCaseNumber?: string;
    firstInstanceCourt?: string;
    appealCaseNumber?: string;
    appealCourtName?: string;
    // New Features
    provisionalOrders?: ProvisionalOrder[];
    thirdParties?: ThirdParty[];
    lastJudgmentType?: 'حضوري' | 'غيابي';
    // Abandonment Logic
    abandonmentDate?: string;
    abandonmentCount?: number;
    isVoided?: boolean;
    /** Smart File — بيانات المرحلة النشطة */
    caseNo?: string;
    court?: string;
    judge?: string;
    parties?: Array<Party & { notificationStatus?: NotificationStatus }>;
    tasks?: Task[];
    createdDate?: string;
    finalDecision?: string | null;
    decisionDate?: string | null;
    type?: string;
    docType?: string;
    claimValue?: string;
    isUndeterminedValue?: boolean;
    isFixedFee?: boolean;
    isPleadingsClosed?: boolean;
    /** مرحلة البداءة مقفولة بانتظار طعن الخصم — ليست مؤرشفة */
    awaitingOpponentAppeal?: boolean;
    appealDeadline?: string;
    /** تاريخ تبليغ الحكم الغيابي للمدعى عليه */
    absentJudgmentNotificationDate?: string;
    /** بانتظار تسجيل تبليغ الحكم الغيابي قبل احتساب مهلة الاعتراض */
    awaitingAbsentJudgmentNotification?: boolean;
    judgmentForm?: string;
    wasReopened?: boolean;
    isUnderObjection?: boolean;
    interruptionDate?: string;
    consolidatedWith?: string;
    consolidatedSecondaryRefs?: ConsolidationSecondaryRef[];
    fastTrackPetitions?: unknown[];
    attachments?: unknown[];
    legalTimers?: {
        appealDeadline?: string;
        cassationDeadline?: string;
        reviewDeadline?: string;
        finalAppealDeadline?: string;
        defaultObjectionDeadline?: string;
    };
    previousCaseNumber?: string;
    appealMetadata?: {
        appealType?: string;
        appellant?: string;
        filingDate?: string;
        previousCaseNumber?: string;
        previousStage?: string;
        priorJudgmentType?: string;
        initialAppellantPartyIds?: Array<number | string>;
        hasCrossAppeal?: boolean;
        crossAppealDate?: string;
        crossAppealReceipt?: string;
        crossAppealPartyIds?: Array<number | string>;
    };
    isJudgeRecusalPending?: boolean;
    judgeRecusalData?: { reason: string; requestDate: string };
    isAttorneyResigned?: boolean;
    resignationData?: Record<string, unknown>;
    isInExecution?: boolean;
    executionData?: Record<string, unknown>;
    stayReason?: string;
    /** إحالة لعدم الاختصاص — المحكمة المحال إليها */
    referredToCourt?: string;
    courtReferralDate?: string;
    courtReferralNotes?: string;
    /** اسم المحكمة قبل الإحالة (للعرض عند الضغط على المؤشر) */
    previousCourtName?: string;
    courtReferralAcceptance?: 'pending' | 'accepted' | 'rejected';
    courtReferralDecisionDate?: string;
    /** إبطال العريضة عبر سير الدعوى — طعن ثم تأييد/نقض */
    petitionVoidFlow?: {
        status: 'registered' | 'appeal_pending' | 'upheld_closed' | 'quash_revived' | 'waived';
        voidLabel: string;
        registeredDate: string;
        appealFiledDate?: string;
        revivalDeadline?: string;
    };
}

export interface Task {
    id: string;
    title: string;
    details?: string;
    dueDate?: string;
    isCompleted: boolean;
    priority?: string;
    isNew?: boolean;
    /** بيانات طعن تمييزي في قرار إعدادي */
    appealDecisionType?: string;
    appealDecisionNo?: string;
    appealDecisionDate?: string;
    appealBriefFiled?: boolean;
    appealOutcome?: 'quashed' | 'upheld';
    /** مهمة متابعة مخاطبة */
    taskKind?: 'correspondence';
    correspondenceEntity?: string;
    correspondenceDate?: string;
    correspondenceContent?: string;
    correspondenceResponseReceived?: boolean | null;
}
