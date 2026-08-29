import type { LegalTask } from '@/app/types/TaskEngine';

/** حقول الصوت الفارغة — مصدر واحد لمسارات الإنشاء */
export const EMPTY_TASK_VOICE = {
    voiceRef: null,
    voiceTranscript: null,
    voiceDurationSec: null,
} as const;

export function newTaskId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `qt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type PendingTaskShell = Pick<
    LegalTask,
    | 'status'
    | 'completedAt'
    | 'pinnedToFieldCurtain'
    | 'fieldCurtainPinnedAt'
    | 'subTasks'
    | 'documentRequirements'
    | 'expenses'
    | 'voiceRef'
    | 'voiceTranscript'
    | 'voiceDurationSec'
>;

/** صدفة مهمة معلّقة — المتداخلات والصوت فارغة ما لم يُمرَّر خلاف ذلك */
export function pendingTaskShell(overrides?: Partial<PendingTaskShell>): PendingTaskShell {
    return {
        status: 'pending',
        completedAt: null,
        pinnedToFieldCurtain: false,
        fieldCurtainPinnedAt: null,
        subTasks: [],
        documentRequirements: [],
        expenses: [],
        ...EMPTY_TASK_VOICE,
        ...overrides,
    };
}
