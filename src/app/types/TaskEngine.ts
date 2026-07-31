/**
 * Phase 31–36 — Quantum Task Engine + تفرع إجرائي ومتطلبات ورسوم.
 */

import type {
    CollaborationStatus,
    ShareScope,
    SharedTaskNote,
} from '@/app/types/taskHelpTypes';

export type LegalTaskStatus = 'pending' | 'completed' | 'delegated';

/** فرع إجرائي (خطوة ميدانية ضمن المسار) */
export interface LegalSubTask {
    id: string;
    title: string;
    location: string | null;
    isCompleted: boolean;
    /** إجراء ميداني (أجندة) vs تفريع يدوي */
    kind?: 'field' | 'branch';
}

/** بند في حقيبة المستندات */
export interface DocumentRequirementItem {
    id: string;
    text: string;
    isChecked: boolean;
}

/** مصروف سريع (للفوترة/التذكير) */
export interface TaskExpenseEntry {
    id: string;
    amount: number;
    label: string;
}

export interface LegalTask {
    id: string;
    rawText: string;
    title: string;
    location: string | null;
    parsedDate: Date | null;
    /** تذكير للمهام المؤجلة في الركن؛ عند تجاوز اليوم يُعرض تنبيه */
    reminderAt: Date | null;
    isFatalDeadline: boolean;
    linkedCaseId: string | null;
    status: LegalTaskStatus;
    /** وقت إنجاز المهمة — للأرشيف (30 يوماً) */
    completedAt: Date | null;
    /** مهام مثبتة على ستارة الميدان — تنتهي بانتهاء يوم المهمة أو عند الإنجاز */
    pinnedToFieldCurtain: boolean;
    /** يوم تثبيت الستارة (لمهام بلا تاريخ محدد) */
    fieldCurtainPinnedAt: Date | null;
    /** مسار إجرائي متفرع */
    subTasks: LegalSubTask[];
    /** متطلبات ميدانية سريعة */
    documentRequirements: DocumentRequirementItem[];
    /** مصروفات مسجلة */
    expenses: TaskExpenseEntry[];
    /** مرجع تسجيل صوتي (hami-voice-ref:task-voice-{id}) — blob في IndexedDB */
    voiceRef: string | null;
    voiceTranscript: string | null;
    voiceDurationSec: number | null;
    /** طلب مساعدة / تفويض — حقول اختيارية للتوافق مع المهام القديمة */
    helpRequestId?: string;
    requesterId?: string;
    assigneeId?: string;
    shareScope?: ShareScope;
    collaborationStatus?: CollaborationStatus;
    isSanitised?: boolean;
    sharedNotes?: SharedTaskNote[];
}
