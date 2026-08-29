/**
 * ExecutionFile domain slice: ExecutionFileGuarantor.
 */


export interface GuarantorFollowupState {
        executor_approved: boolean;
        /** مصدر السجل — يمنع اختلاط الكفيل المالي مع التعهد الإجرائي */
        channel?: 'financial' | 'procedural';
        /** بعد موافقة المنفذ: لا تُعاد دورة الطلب حتى يُكمَل الحفظ هنا */
        details_saved?: boolean;
        guarantee_type?: 'amount' | 'attendance';
        guarantor_name?: string;
        guarantor_workplace?: string;
        /** راتب الكفيل الشهري (د.ع) إن وُجد */
        guarantor_salary_iqd?: number | null;
        /** مقدار الاستقطاع من راتب الكفيل (د.ع) إن وُجد */
        guarantor_deduction_iqd?: number | null;
        /** تعليم الدائن في الشارات بعد حفظ البيانات */
        creditor_notation_registered?: boolean;
    }

export type GuarantorFollowupHistoryEntry = GuarantorFollowupState & { archivedAt: string };

export interface ProceduralGuaranteeState {
        enabled: boolean;
        purpose?: string;
        guarantor_name?: string;
        pledge_amount_iqd?: number | null;
        deadline_ymd?: string | null;
        saved_at?: string;
        /** بعد الحفظ الناجح — تُغلق الحاوية وتُنقل البيانات لبطاقة الضامن */
        committed_to_followup?: boolean;
    }

export type ProceduralGuaranteeHistoryEntry = ProceduralGuaranteeState & { archivedAt: string };

export interface ExecutionFileGuarantor {
    // ─── التبليغ والإحضار الجبري (محرك الحصانة) ───
    /** طبيعة المطالبة لغرض الإحضار؛ إن لم تُحدَّد تُستنتج من نوع الدعوى */
    summoningClaimNature?: 'مالي' | 'غير مالي';
    /** تعليم صريح: مطالبة نفقة (يُكمّل استنتاج claimType) */
    isAlimony?: boolean;
    /** هل راتب الموظف المحجوز يغطي النفقة المستحقة؟ */
    salaryCoversAlimony?: boolean;
    /** كفيل ضامن على مستوى الملف (يُكمّل بيانات المدين و executionTarget) */
    hasGuarantor?: boolean;
    /** طلب كفيل من محضر المتابعة — بيانات الكفيل تُكمَل في الملف بعد موافقة المنفذ */
    guarantor_followup?: GuarantorFollowupState | null;
    guarantor_followup_history?: GuarantorFollowupHistoryEntry[];
    /** كفالة/تعهد إجرائي عام — غير مرتبط بالمركز المالي أو نوع قرار محدد */
    procedural_guarantee?: ProceduralGuaranteeState | null;
    procedural_guarantee_history?: ProceduralGuaranteeHistoryEntry[];
    guarantor_notification?: {
        noticeDateYmd: string;
        reason: string;
        endedAt?: string | null;
        attendedAt?: string | null;
    } | null;
    forcedAttendanceIssued?: boolean;
    activeNoticeState?: string | null;
    debtorAttendedVoluntarily?: boolean;
    debtorEvaded?: boolean;
    arrestWarrantUnlocked?: boolean;
    executionTarget?: string;
    debtorArrested?: boolean;
    nonInterferenceIssued?: boolean;
    /** بعد أول إخبار = 1؛ يزيد مع كل إعادة إحالة بعد تحقق الغرض (تبليغ لاحق بلا مهلة) */
    summoningRound?: number;
    voluntaryAttendanceCount?: number;
    /** مسار الكاسب بعد مذكرة الإحضار الجبري */
    investigationCourtRequested?: boolean;
    /** تنازل صريح عن مسار مفاتحة التحقيق — تُخفى البطاقة حتى إعادة تسجيل «متخفي» */
    investigation_court_withdrawn_at?: string | null;
    investigationMemoIssued?: boolean;
    investigationPathDebtorPresent?: boolean;
    forcedPathAttendanceSecured?: boolean;
}

/** موافقة منفذ على الكفيل مع بيانات لم تُثبَّت بعد — حتى يُضغط «حفظ» صراحةً */
export function guarantorFollowupAwaitingDetailsSave(
    gf: GuarantorFollowupState | null | undefined
): boolean {
    if (!gf?.executor_approved) return false;
    return gf.details_saved !== true;
}

/** إظهار شارة الكفيل لدى الدائن الأول بعد موافقة المنفذ (قبل أو بعد تثبيت البيانات) */
export function guarantorFollowupCreditorNotationActive(
    gf: GuarantorFollowupState | null | undefined
): boolean {
    return gf?.executor_approved === true;
}
