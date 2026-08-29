import type { LegalTask } from '@/app/types/TaskEngine';

/** Stub اختبار لمهمة قانونية — حقول الصوت فارغة افتراضياً */
export function legalTaskStub(partial: Partial<LegalTask> & Pick<LegalTask, 'id' | 'title'>): LegalTask {
    return {
        id: partial.id,
        rawText: partial.rawText ?? partial.title,
        title: partial.title,
        location: partial.location ?? null,
        parsedDate: partial.parsedDate ?? null,
        reminderAt: partial.reminderAt ?? null,
        isFatalDeadline: partial.isFatalDeadline ?? false,
        linkedCaseId: partial.linkedCaseId ?? null,
        status: partial.status ?? 'pending',
        completedAt: partial.completedAt ?? null,
        pinnedToFieldCurtain: partial.pinnedToFieldCurtain ?? false,
        fieldCurtainPinnedAt: partial.fieldCurtainPinnedAt ?? null,
        subTasks: partial.subTasks ?? [],
        documentRequirements: partial.documentRequirements ?? [],
        expenses: partial.expenses ?? [],
        voiceRef: partial.voiceRef ?? null,
        voiceTranscript: partial.voiceTranscript ?? null,
        voiceDurationSec: partial.voiceDurationSec ?? null,
    };
}
