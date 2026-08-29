/**
 * Timeline event and decision-hub status types.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TimelineEventType = 
    | 'notification'
    | 'payment'
    | 'decision'
    | 'coercive'
    | 'settlement'
    | 'appointment'
    | 'appeal'
    | 'other_party'
    /** تكليف بالحضور وتبليغات الموظف/المدين */
    | 'summons'
    /** محاضر وإجراءات (وفاة طرف، حالة الإضبارة، كفيل…) */
    | 'procedure'
    /** مخاطبات الجهات الرسمية */
    | 'communication'
    /** التخلية: مهلة سكنية واستعانة بالشرطة */
    | 'eviction'
    /** حركات المركز المالي غير الدفعات (فتح وعاء المطالبة…) */
    | 'action'
    | 'other';

/** حالة البطاقة في تبويبي مركز القرارات (طلبات حالية / قرارات سابقة) */
export type ExecutionDecisionHubStatus = 'pending' | 'accepted' | 'rejected';

/** مرحلة الطعن على قرار المنفذ: تظلم ثم تمييز */
export type ExecutionDecisionAppealPhase = 'grievance' | 'cassation' | null;

/** أولوية العرض في «رادار» السجل الذكي — منفصل عن نوع الحدث (تبليغ/دفعة/…) */
export type TimelineSmartPriority = 'normal' | 'urgent' | 'deadline';

export interface TimelineEvent {
    id: string;
    /** يسمح بقيم إضافية من واجهة التنفيذ حتى تتم مواءمة السجل تدريجياً */
    type: TimelineEventType | string;
    title: string;
    description?: string;
    details?: string;
    date: string;
    /** وقت تسجيل الحدث في السجل الزمني (ISO) */
    timestamp?: string;
    /** القسم أو الأداة التي أُنشئ منها السجل */
    source?: string;
    isNew?: boolean;
    /** تثبيت يدوي في أعلى الرادار */
    isPinned?: boolean;
    /** تاريخ انتهاء مهلة قانونية (يُفضّل YYYY-MM-DD أو ISO) */
    deadlineDate?: string;
    /** أولوية بطاقة الرادار — تُحدَّث آلياً عند اقتراب deadlineDate */
    smartPriority?: TimelineSmartPriority;
    /** اسم أيقونة Lucide اختياري للعرض المخصص */
    icon?: string;
    /** مثال ذمة مقسومة: `metadata.timelineDebtorKey` = مفتاح المدين في `debtorWorkspaceEntries` */
    metadata?: Record<string, unknown>;
    /** نقل إلى سلة مهملات الإضبارة — لا يُعرض في السجل الفعّال */
    trashedAt?: string;
    /**
     * لقطة حالة الإضبارة وقت تسجيل الحدث — لمعاينة «آلة الزمن» (سيتم تقوية النوع لاحقاً).
     * يُخزَّن مكافئها في Supabase كعمود `snapshot_data` (jsonb).
     */
    snapshot?: unknown;
}
