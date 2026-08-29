/**
 * ExecutionFile domain slice: ExecutionFileDebtor.
 */
import type { DossierLifecycleStatus } from './core';
import type { OtherPartyActionLogEntry, OtherPartyRequestTrackEntry } from './financial';
import type { EmployeeSummonsAssignmentState, PublicationNoticeDebtorState } from './seizure';

export interface ExecutionFileDebtor {
    // State Machine
    gracePeriodActive?: boolean;
    gracePeriodEnded?: boolean;
    debtorNotificationDate?: string | null;
    /** آخر تبليغ للمدين — للشارة بجانب الاسم (تعديل/حذف) */
    debtor_summons_marker?: {
        id: string;
        date: string;
        purpose: string;
        recordedAt?: string;
        badgeHiddenAt?: string;
        periodEndedAt?: string;
    } | null;
    /** آخر تبليغ لكل مدين (ذمة مقسومة) */
    debtor_summons_marker_by_debtor?: Record<
        string,
        {
            id: string;
            date: string;
            purpose: string;
            recordedAt?: string;
            badgeHiddenAt?: string;
            periodEndedAt?: string;
        } | null
    >;
    /** عدد التبليغات لكل مدين */
    notification_count_by_debtor?: Record<string, number>;

    /**
     * تكليف بالحضور — مسار المدين الموظف بعد تسجيل مذكرة الإخبار بالتنفيذ (أي تنفيذ).
     * يُدار من تبويب «التكليف بالحضور» داخل مركز التبليغ.
     * @deprecated لصالح `employee_summons_assignments_by_debtor` — يُقرأ للتوافق مع الملفات القديمة فقط.
     */
    employee_summons_assignment?: EmployeeSummonsAssignmentState | null;
    /**
     * تكليف حضور لكل مدين (ذمة مقسومة) — المفتاح يطابق مفاتيح `debtorWorkspaceEntries`.
     */
    employee_summons_assignments_by_debtor?: Record<string, EmployeeSummonsAssignmentState>;

    /**
     * تبليغ بالنشر (جريدتان) — لكل مدين عند تعدد الخصوم؛ المفتاح يطابق مفاتيح مساحة عمل المدين.
     * المدة ١٥ يوماً تقويمياً من اليوم التالي لتاريخ النشر.
     */
    publication_notice_by_debtor?: Record<string, PublicationNoticeDebtorState>;
    /** تاريخ التبليغ الفعلي لكل مدين (ذمة مقسومة) */
    debtor_notification_date_by_debtor?: Record<string, string>;
    /** مرجع تاريخ مذكرة الإخبار لكل مدين (ذمة مقسومة) */
    execution_memo_anchor_date_by_debtor?: Record<string, string>;
    /** حالة مسار التبليغ/الإحضار لكل مدين (initial_notice | forced_attendance | arrest_warrant) */
    active_notice_state_by_debtor?: Record<string, string>;
    /** إعلان انتهاء المهلة الرضائية لكل مدين (غير تخلية) */
    notice_voluntary_period_end_declared_by_debtor?: Record<string, boolean>;
    /** إخفاء شارة عدم الحضور لكل مدين */
    debtor_absence_badge_dismissed_by_debtor?: Record<string, boolean>;

    /**
     * غير تخلية: تاريخ مذكرة الإخبار بالتنفيذ الفعلي (أول تسجيل أو إعادة تبليغ بالمذكرة).
     * يُستخدم لاحتساب 7 أيام تقويمية من اليوم التالي له — وليس من تاريخ الضغط.
     */
    execution_memo_anchor_date?: string | null;
    /**
     * غير تخلية: أعلن المحامي انتهاء مدة التنفيذ الرضائي (بعد 7 أيام تقويمية دون حضور).
     * يفتح مسار «تبليغ» لاحق دون اشتراط إجراء إكراهي.
     */
    notice_voluntary_period_end_declared?: boolean;

    /** محضر المتابعة — سجل تحركات الطرف الآخر (نص حر) */
    other_party_actions_log?: OtherPartyActionLogEntry[] | null;

    /** وكيل المدين — تتبع يدوي لطلبات الدائن وقرار المنفذ */
    other_party_request_tracks?: OtherPartyRequestTrackEntry[] | null;

    /** آلة حياة الإضبارة: نشطة | متوقفة | مستأخرة | انتهاء */
    dossier_lifecycle_status?: DossierLifecycleStatus;
    /** سبب الحالة عند عدم كون الإضبارة نشطة */
    dossier_status_reason?: string;
    /** تاريخ مرتبط بالحالة (YYYY-MM-DD) */
    dossier_status_date?: string;
    /** تاريخ آخر إجراء قاطع للتقادم (YYYY-MM-DD) — يُزامن مع رادار المادة 112 */
    dossier_last_action_date?: string;
    /** Legacy: يُستخدم في لوحة التنفيذ لحساب التقادم */
    lastActionDate?: string | null;

    /** وفاة المدين — للعرض والتوافق مع بيانات قديمة؛ لا يُستخدم لتعطيل الإجراءات */
    is_debtor_deceased?: boolean;
    /** صفة المدين الأساسي: طبيعي | معنوي */
    debtor_entity_kind?: 'natural_person' | 'legal_entity';
    /** @deprecated — استخدم debtor_entity_kind */
    debtor_entity_type?: string;
    /** صفة كل مدين في تعدّد الخصوم */
    debtor_entity_kind_by_debtor?: Record<string, 'natural_person' | 'legal_entity'>;
    /** وفاة الدائن — للعرض والتوافق */
    is_creditor_deceased?: boolean;
    /** ورثة مسجّلون — يُزامَن مع مسار الوفاة */
    dossier_heirs_list?: string[];
    /** اسم المدين عند تسجيل الوفاة (مرجع عرض) */
    deceased_debtor_legal_name_snapshot?: string;
    /** اسم الدائن عند تسجيل الوفاة (مرجع عرض) */
    deceased_creditor_legal_name_snapshot?: string;
}
