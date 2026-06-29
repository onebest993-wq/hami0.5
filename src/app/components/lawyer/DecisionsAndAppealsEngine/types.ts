import type { ExecutionDecisionAppealPhase, ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';

export interface Decision {
    id: string;
    title: string;
    body: string;
    date: string;
    status?: ExecutionDecisionHubStatus | null;
    appealPhase?: ExecutionDecisionAppealPhase;
    grievanceRejectedAwaitingTamyeez?: boolean;
    grievanceAcceptedAwaitingDebtorTamyeez?: boolean;
    awaitingCassationEntryBy?: 'lawyer' | 'debtor' | null;
    tamyeezDecisionNumber?: string;
    appealActor?: 'lawyer' | 'debtor' | null;
    appealMethod?: 'tadhallum' | 'tamyeez' | null;
    noAppealChosen?: boolean;
    appealRequestOrigin?: 'creditor_side' | 'debtor_side' | 'executor_side';
    appealBaseBranch?: 'after_approval' | 'after_rejection';
    appealWorkflowState?:
        | 'NONE'
        | 'PENDING_APPEAL_LAWYER'
        | 'PENDING_APPEAL_DEBTOR'
        | 'FINAL_ACCEPTED'
        | 'FINAL_REJECTED'
        | 'REVOKED_BY_APPEAL';
    appealTimelineLogs?: Array<{
        id: string;
        at: string;
        message: string;
        tone: 'emerald' | 'rose' | 'amber' | 'slate';
    }>;
    appealStatus: 'pending' | 'tadhallum_filed' | 'tamyeez_filed' | 'upheld' | 'overturned' | 'modified' | 'final';
    appealResult?:
        | 'تصديق القرار'
        | 'نقض القرار'
        | 'تعديل'
        | 'رد اللائحة'
        | 'قبول التظلم'
        | 'رد التظلم';
    /** تاريخ صدور قرار الطعن (مثل: 2026-04-30) */
    appealDecisionDate?: string;
    executorOutcome?: 'pending' | 'approved' | 'rejected' | 'alternative' | 'withdrawn';
    lawyerWithdrawn?: boolean;
    personalCoerciveWithdrawnAt?: string;
    executorNote?: string;
    resolvedAt?: string;
    alternativeActionId?: string;
    alternativeActionLabel?: string;
    requestKind?:
        | 'seizure'
        | 'eviction_procedure'
        | 'lawyer_fee_payout'
        | 'case_expense'
        | 'trust_disburse'
        | 'unified_collection'
        | 'personal_coercive'
        | 'special_followup'
        | 'guarantor_request'
        | 'creditor_party_death'
        | 'debtor_party_death'
        | 'general';
    creditorPartyDeathPayloadJson?: string;
    seizureSubtype?: string;
    seizurePayloadJson?: string;
    seizureRequestSavedAt?: string;
    seizureRequestDetails?: string;
    heirSubstitutionCompletedAt?: string;
    personalCoerciveSubtype?: string;
    evictionWorkflowKey?: EvictionExecutorWorkflowKey;
    executorScheduleLabel?: string;
    evictionGraceSavedAt?: string;
    evictionGraceStartYmd?: string;
    evictionGraceEndYmd?: string;
    evictionGraceDays?: number;
    policeAssistanceSavedAt?: string;
    policeAssistanceAgency?: string;
    appealSourceDecisionId?: string | null;
    activeAppealCopyId?: string | null;
    manualExecutorLedgerEntry?: boolean;
    /**
     * قرار «إضافة قرار» — منظومة الحالات الثلاث:
     * 1 = ساري النفاذ | 2 = موقوف لحين حسم الطعن | 3 = ملغى/منتهٍ
     */
    executorDecisionStatusFlag?: 1 | 2 | 3;
    /** @deprecated استُبدل بـ executorDecisionStatusFlag */
    manualExecutorEnforced?: boolean;
    /** مَن الطاعن — بعد تسجيل الطعن على قرار «إضافة قرار» */
    manualExecutorAppealAppellant?: 'lawyer' | 'debtor';
    /** نوع الطعن — تظلم أو تمييز */
    manualExecutorAppealKind?: 'tadhallum' | 'tamyeez';
    /** مرحلة مسار التظلم/التمييز داخل العلم 2 */
    manualExecutorWorkflowPhase?:
        | 'grievance_pending'
        | 'cassation_unlocked'
        | 'cassation_pending';
    /** نتيجة تظلم المنفذ — بعد المرحلة 2 */
    manualExecutorGrievanceOutcome?: 'accepted' | 'rejected';
    /** لمن يصبّ قرار المنفذ المُدخل يدوياً */
    manualExecutorBeneficiary?: 'creditor' | 'debtor' | 'neutral';
    /** أطراف الطاعنين المسجّلين يدوياً لقرار المنفذ — مرحلة التظلم */
    manualGrievanceAppellants?: Array<'lawyer' | 'debtor'>;
    /** أطراف الطاعنين المسجّلين يدوياً لقرار المنفذ — مرحلة التمييز */
    manualCassationAppellants?: Array<'lawyer' | 'debtor'>;
    /** مُفعَّل بقرار المنفذ دون طلب دائن مسبق */
    activatedByExecutorOrder?: boolean;
    /** قرار قاضي البداءة بالحبس التنفيذي — تمييز فقط دون تظلم */
    cassationOnlyAppeal?: boolean;
    executiveDetentionJudgeOutcome?: 'approved' | 'rejected' | null;
    /** طُرحت الإضبارة على قاضي البداءة — انتهى دور المنفذ على هذا الطلب */
    executorDetentionHandedToJudge?: boolean;
    parentExecutorDecisionId?: string;
    /** أُغلقت الدورة — طلب مرفوض/منتهٍ لا يُعاد التعامل معه بعد تقديم طلب جديد */
    requestCycleSuperseded?: boolean;
    requestCycleSupersededAt?: string;
    /** أرشفة القرار لإخفائه من القائمة الرئيسية */
    isArchived?: boolean;
    /** سلّة تخزين namespace — يثبّت مكان الصف بعد إعادة التحميل */
    domainNamespace?: string;
    /** انقضت مهلة التمييز — القرار نافذٌ نهائياً (لا يُعاد فتح طعن) */
    appealDeadlinePerpetuallyEnforced?: boolean;
    /** تاريخ صدور/تسجيل التظلم (Y-m-d) */
    grievanceIssuedYmd?: string;
    /** تاريخ إصدار قرار التظلم من المنفذ — معيار بدء مهلة التمييز بعد نتيجة التظلم */
    grievanceOutcomeIssuedYmd?: string;
    /** ساعة احتساب التمييز بعد التظلم (Y-m-d) */
    cassationAppealClockYmd?: string;
    /** الإنابة التنفيذية — اسم الدائرة المُنابة */
    deputationTargetDirectorate?: string;
    /** الإنابة التنفيذية — تاريخ الإرسال */
    deputationReferralDate?: string;
    /** الإنابة التنفيذية — تفاصيل النتيجة */
    deputationResultDetails?: string;
    /** الإنابة التنفيذية — تم إرسال الإنابة */
    deputationSent?: boolean;
    /** الإنابة التنفيذية — تم إنهاء الإنابة */
    deputationClosed?: boolean;
    /** مخاطبة جهة — إخفاء أزرار متابعة النتيجة (تجاهل) */
    deputationFollowupDismissed?: boolean;
    /** مخاطبة جهة — تأكيد عدم ورود إجابة */
    deputationNoResponseConfirmed?: boolean;
}
