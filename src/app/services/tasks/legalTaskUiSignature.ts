import type { LegalTask } from '@/app/types/TaskEngine';

/**
 * توقيع الحقول التي ترسم بطاقة المهمة / ستارة الميدان.
 * إن نقص حقل ظاهر هنا تتجمّد البطاقة بعد التعديل (React.memo).
 */
export function legalTaskUiSignature(task: LegalTask): string {
    return [
        task.id,
        task.title,
        task.rawText,
        task.location ?? '',
        task.status,
        task.completedAt?.getTime() ?? '',
        task.isFatalDeadline ? '1' : '0',
        task.pinnedToFieldCurtain ? '1' : '0',
        task.parsedDate?.getTime() ?? '',
        task.reminderAt?.getTime() ?? '',
        task.linkedCaseId ?? '',
        (task.subTasks ?? [])
            .map(
                (st) =>
                    `${st.id}:${st.isCompleted}:${st.title}:${st.location ?? ''}:${st.kind ?? ''}:${st.planStatus ?? ''}`,
            )
            .join('|'),
        (task.documentRequirements ?? []).map((d) => `${d.id}:${d.isChecked}:${d.text}`).join('|'),
        (task.expenses ?? []).map((e) => `${e.id}:${e.amount}`).join('|'),
        task.voiceRef ?? '',
        task.voiceTranscript ?? '',
        task.voiceDurationSec ?? '',
    ].join('~');
}
