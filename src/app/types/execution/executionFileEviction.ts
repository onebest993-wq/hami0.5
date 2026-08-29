/**
 * ExecutionFile domain slice: ExecutionFileEviction.
 */
import type { EvictionEarnerFeeCollectionSM } from '@/app/utils/evictionEarnerFeeCollectionMachine';

export interface ExecutionFileEviction {
    /** تخلية مأجور / تسليم عقار — بيانات العين (إلزامية عند فتح الإضبارة بهذا النوع) */
    property_number?: string;
    /** المقاطعة */
    district?: string;
    property_type?: string;
    full_address?: string;

    /** تخلية: تجاري (لا مهلة تخلية سكنية) | سكني (مهلة تخلية بحد أقصى 90 يوماً) */
    eviction_premises_use?: 'commercial' | 'residential';
    /** تاريخ انتهاء مهلة التخلية التي يحددها المنفذ للعقار السكني (YYYY-MM-DD) */
    eviction_vacate_deadline?: string | null;
    /** أول يوم احتساب مدة مهلة التخلية السكنية (YYYY-MM-DD) — للعرض والسجل والتقويم */
    eviction_residential_grace_period_start?: string | null;
    /** سكني: موافقة المنفذ على منح المهلة (بعد تسجيل تاريخ انتهائها) */
    eviction_executor_vacate_grant_approved?: boolean;
    /** سكني: المحامي أنهى المهلة يدوياً قبل تاريخ الانتهاء (ISO) */
    eviction_residential_grace_manually_ended_at?: string | null;
    /** تخلية: القوة الجبرية (مرافقة جهة أمنية) — تظهر كشارة حتى الإتمام */
    eviction_police_assistance?: {
        decisionId: string;
        agencyName: string;
        dueYmd: string;
        savedAt: string;
        completedAt?: string | null;
    } | null;
    /** إظهار تبويب المحجوزات/الأموال في واجهة التخلية بعد طلب أتعاب أو مصاريف */
    eviction_assets_tab_unlocked?: boolean;
    /** مصاريف مباشرة على إضبارة التخلية (تتبع — لا تُدمج تلقائياً في المتبقي إلا إذا ربطت لاحقاً بدفعة) */
    eviction_case_expenses?: Array<{ id: string; amount: number; note: string; date: string }>;
    encroachment_case_expenses?: Array<{
        id: string;
        amount: number;
        note: string;
        date: string;
        requestTitle: string;
        workflowKey: string;
    }>;
    /** طُلِب صراحةً من المحامي صرف الأتعاب المحكومة (يشغّل احتساب رسم التحصيل 3% في مسار التخلية) */
    eviction_lawyer_fee_requested?: boolean;
    /** تاريخ أول إخبار بالتنفيذ — ثابت لحساب مهلة الـ7 أيام ولا يُستبدل بالتبليغات اللاحقة */
    eviction_first_notice_date?: string | null;
    /**
     * تخلية + كاسب — أول إخبار: هل أتعاب المحاماة مشمولة صراحةً في مذكرة الإخبار الأصلية.
     * false/غير مُحدَّد = مسار اعتيادي دون اعتبار الأتعاب جزءاً من صياغة المذكرة الأولى.
     */
    eviction_initial_notice_lawyer_fees_included?: boolean;
    /** آخر تبليغ لاحق (تخلية): هل عُيِّن صراحةً أن الغاية استحصال مؤيد من المنفذ */
    eviction_last_summons_for_collection?: boolean;
    /** عند تبليغ لاستحصال: فرع التبليغ العادي مقابل مسار الإحضار الجبري */
    eviction_last_collection_summons_branch?: 'ordinary' | 'coercive' | null;
    /** آلة حالات تبليغ الكاسب لاستحصال الأتعاب/المصاريف (واجهة التخلية) */
    eviction_earner_fee_collection_sm?: EvictionEarnerFeeCollectionSM;
    /** تخلية: عدم المطالبة بالأتعاب المحكومة عند فتح الإضبارة — إخفاء الأتعاب من الوعاء حتى التفعيل */
    eviction_lawyer_fee_waived_at_intake?: boolean;

    /**
     * تخلية: المحامي أعلن يدوياً انتهاء مدة التنفيذ الرضائي (بعد مرور 7 أيام تقويمية من اليوم التالي لتاريخ الإخبار الفعلي).
     * لا يُستبدل الاحتساب التلقائي بهذا الحقل إلا بعد الضغط على الزر المخصص.
     */
    eviction_voluntary_period_end_declared?: boolean;

    /** تخلية: تاريخ تبليغ الورثة (YYYY-MM-DD) — يضبطه المحامي دون إجبار */
    eviction_heirs_notification_date_ymd?: string | null;

    /**
     * حراس قضائيون — يدعم أكثر من حارس؛ كل سجل له اسم وراتب.
     */
    eviction_judicial_custodians?: Array<{
        id: string;
        fullName: string;
        salary: string;
        decisionId?: string;
        savedAt: string;
    }>;
    /** @deprecated يُستبدل بـ eviction_judicial_custodians — يُقرأ للتوافق مع ملفات قديمة */
    eviction_judicial_custodian?: {
        decisionId?: string;
        fullName: string;
        salary: string;
        savedAt: string;
    } | null;
}


/** وصفية تبليغ لاحق في تخلية — كاسب */
export interface EvictionSubsequentSummonsMeta {
    forCollection: boolean;
    branch: 'ordinary' | 'coercive' | null;
}
