/**
 * ExecutionFile domain slice: ExecutionFileDecisions.
 */


export interface ExecutionFileDecisions {
    /** محضر المتابعة — التنفيذ الجبري الشخصي (طلبات المنفذ) */
    forced_bring_in_personal_outcome?: 'brought' | 'absconded' | 'dismissed' | null;
    /** سجّل مرة واحدة: مسودة مذكرة إحضار + مهمة ميدانية بعد موافقة المنفذ على طلب الإحضار */
    forced_bring_in_personal_followup_logged?: boolean;
    /** مفاتحة محكمة التحقيق لأمر قبض */
    personal_arrest_warrant_stage?: 'none' | 'pending_court' | 'issued' | null;
    /** شارة المدين: مطلوب بمذكرة قبض */
    debtor_wanted_arrest_warrant?: boolean;
    /** منع سفر فعّال (بعد موافقة المنفذ) */
    debtor_travel_ban_active?: boolean;
    /** منع سفر — لكل مدين في الذمة المقسومة */
    debtor_travel_ban_active_by_debtor?: Record<string, boolean>;
    /** تراجع عن منع سفر — لكل مدين */
    travel_ban_withdrawn_at_by_debtor?: Record<string, string>;
    /** تراجع عن دورة طلب منع سفر — لكل مدين */
    travel_ban_request_cycle_withdrawn_at_by_debtor?: Record<string, string>;
    /** حبس تنفيذي — تاريخ انتهاء المدة (YYYY-MM-DD) */
    executive_detention_until?: string | null;
    executive_detention_days_total?: number | null;
    debtor_executive_detention_active?: boolean;
    /** إخلاء سبيل / إغلاق دورة التنفيذ الجبري — إخفاء شارات الطلبات النشطة */
    personal_coercive_cycle_closed_at?: string | null;
    /** انتهاء مدة الحبس أو إغلاق مسار الحبس — إخفاء شارة «حبس تنفيذي» من القرارات */
    executive_detention_released_or_closed_at?: string | null;
    /** تراجع المحامي عن طلب منع السفر — إعادة الدورة */
    travel_ban_withdrawn_at?: string | null;
    /** تراجع عن دورة الطلب مع إبقاء إشارة المنع حتى سداد الدين */
    travel_ban_request_cycle_withdrawn_at?: string | null;
    /** تذكير قبل انتهاء الحبس بيومين */
    executive_detention_reminder_sent?: boolean;
    /** تأكيد يدوي: المدين حاضر أمام المنفذ (شرط طلب الحبس التنفيذي) */
    debtor_marked_present_for_detention?: boolean;
    /**
     * بعد إلقاء القبض فعلياً على المدين أو بدء حبس حضوري (غير غيابي) — تُخفى شارة «مذكرة قبض».
     * لا تُضبط عند الحبس الغيابي؛ تُعاد إلى false عند تسجيل «تم صدور أمر قبض» من جديد.
     */
    debtor_arrest_warrant_cleared_after_custody?: boolean;
    /** طلب الحبس التنفيذي بصفة غيابي — يُذكر في الطلب والشارة والسجل */
    executive_detention_request_in_absentia?: boolean;
    /**
     * بعد موافقة المنفذ على مفاتحة التحقيق: الجلسة مفتوحة حتى «تم حضور المدين» أو إكمال مسار القبض.
     * false يعيد إتاحة «إنشاء طلب مفاتحة» رغم بقاء صف موافَق عليه في التخزين.
     */
    personal_arrest_investigation_session_open?: boolean;
    /** بعد موافقة المنفذ على الحبس التنفيذي: موافقة أو رفض قاضي البداءة قبل تثبيت مدة الحبس */
    executive_detention_judge_outcome?: 'approved' | 'rejected' | null;
    /** معرّف صف قرار المنفذ الذي يُسمح بعده بتسجيل قرار قاضي البداءة (دورة واحدة) */
    executive_detention_judge_eligible_decision_id?: string | null;
    /** معرّف صف قرار قاضي البداءة المستقل عن طلب المنفذ */
    executive_detention_judge_decision_id?: string | null;
    /** سبب إخلاء سبيل المدين من الحبس التنفيذي */
    executive_detention_release_reason?: string | null;
    /** سبب رفض قاضي البداءة للحبس */
    executive_detention_judge_rejection_reason?: string | null;
    /**
     * مرحلة مسار عرض الإضبارة/الحبس — منفصلة عن صفوف القرارات
     * idle: لا مسار | handed_to_judge: وافق المنفذ | judge_decided: سُجّل قرار القاضي | detention_active: المدة جارية
     */
    executive_dossier_phase?:
        | 'handed_to_judge'
        | 'judge_decided'
        | 'detention_active'
        | null;

    /** استئخار تنفيذ — تعطيل أدوات التنفيذ في الإضبارة */
    stay_of_execution?: {
        active: boolean;
        decision_number?: string;
        court_name?: string;
        next_hearing_date?: string;
    } | null;
}
