/**
 * Phase 31–36 — Quantum Task Engine + تفرع إجرائي ومتطلبات ورسوم.
 */

export type LegalTaskStatus = 'pending' | 'completed' | 'delegated';

/** فرع إجرائي (خطوة ميدانية ضمن المسار) */
export interface LegalSubTask {
    id: string;
    title: string;
    location: string | null;
    isCompleted: boolean;
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
    /** مهام مثبتة على ستارة الميدان (تُعرض اليوم بغض النظر عن التاريخ) */
    pinnedToFieldCurtain: boolean;
    /** مسار إجرائي متفرع */
    subTasks: LegalSubTask[];
    /** متطلبات ميدانية سريعة */
    documentRequirements: DocumentRequirementItem[];
    /** مصروفات مسجلة */
    expenses: TaskExpenseEntry[];
}
