import type { SparkNudge } from '@/app/spark/types';
import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskDayOverdueIncomplete, isTaskMarkedDone } from '@/app/services/tasks/taskAgendaStatusLite';
import { fieldTaskDueYmd } from '@/app/services/fieldTaskAlerts';
import { localTodayYmd } from '@/app/services/alertFutureGate';

export type FieldTaskSparkHit = {
    taskId: string;
    dossierKey: string;
    caseLabel: string;
    nudge: SparkNudge;
};

function resolveTaskLabel(task: LegalTask): string {
    const title = String(task.title ?? task.rawText ?? '').trim();
    return title || 'مهمة ميدانية';
}

function isFieldTaskActive(task: LegalTask): boolean {
    return !isTaskMarkedDone(task) && task.status !== 'completed';
}

/** مسح خفيف للمهام الميدانية النشطة */
export function scanFieldTasksForSpark(
    tasks: unknown[],
    options?: { maxHits?: number },
): FieldTaskSparkHit[] {
    const maxHits = options?.maxHits ?? 16;
    const hits: FieldTaskSparkHit[] = [];
    const today = localTodayYmd();

    for (const raw of tasks) {
        if (hits.length >= maxHits) break;
        const task = raw as LegalTask;
        if (!task?.id || !isFieldTaskActive(task)) continue;

        const dueYmd = fieldTaskDueYmd(task);
        const overdue = isTaskDayOverdueIncomplete(task);
        const dueToday = dueYmd === today;
        const fatal = Boolean(task.isFatalDeadline);

        let kind: SparkNudge['kind'] | null = null;
        let message = '';
        let missing = '';

        if (fatal && (overdue || dueToday)) {
            kind = 'field.fatal_deadline';
            message = overdue
                ? `مهمة حرجة متأخرة: «${resolveTaskLabel(task)}» — هل تود متابعتها؟`
                : `مهلة حرجة اليوم: «${resolveTaskLabel(task)}» — هل تود متابعتها؟`;
            missing = 'إنجاز المهمة الحرجة';
        } else if (overdue) {
            kind = 'field.overdue_incomplete';
            message = `مهمة ميدانية متأخرة: «${resolveTaskLabel(task)}» — هل تود إنهاءها أو تأجيلها؟`;
            missing = 'إنجاز المهمة';
        } else if (dueToday) {
            kind = 'field.due_today';
            message = `مهمة ميدانية اليوم: «${resolveTaskLabel(task)}» — هل تود فتحها؟`;
            missing = 'متابعة مهمة اليوم';
        }

        if (!kind) continue;

        hits.push({
            taskId: task.id,
            dossierKey: `field:${task.id}`,
            caseLabel: resolveTaskLabel(task),
            nudge: {
                id: `field-task:${task.id}:${kind}`,
                kind,
                surface: 'field',
                priority: fatal ? 9 : overdue ? 7 : 5,
                message,
                presence: {
                    present: dueYmd ? [`موعد: ${dueYmd}`] : [],
                    missing: [missing],
                },
                source: 'fieldTasksSparkScan',
                dossierKey: `field:${task.id}`,
                targetFileId: task.id,
                action: { label: 'فتح المهمة', actionId: 'open_field_task' },
            },
        });
    }

    return hits.sort((a, b) => b.nudge.priority - a.nudge.priority);
}

export function buildFieldTasksArchiveAttentionNudge(hits: FieldTaskSparkHit[]): SparkNudge | null {
    if (!hits.length) return null;
    const first = hits[0];
    const count = hits.length;
    const message =
        count === 1
            ? first.nudge.message
            : `يبدو أن ${count} مهام ميدانية تحتاج متابعة — أولها: ${first.caseLabel}. هل يهمك الأمر؟`;

    return {
        id: `field-archive-attention:${first.taskId}`,
        kind: 'field.archive_attention_summary',
        surface: 'field',
        priority: 5,
        message,
        presence: {
            present: [`${count} مهمة في المسح`],
            missing: ['متابعة ميدانية'],
        },
        source: 'fieldTasksSparkScan',
        dossierKey: first.dossierKey,
        targetFileId: first.taskId,
        hitCount: count,
        action: { label: 'فتح المهام', actionId: 'open_field_tasks' },
    };
}
