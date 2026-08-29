import type { LegalSubTask, LegalTask } from '@/app/types/TaskEngine';
import { parseTaskInput, startOfLocalDay } from '@/app/utils/nlpParser';
import {
    applySilentPracticalEnrichment,
    type TaskEnrichmentOptions,
} from '@/app/utils/quantumTaskEnrichment';
import {
    clampTaskText,
    MAX_NESTED_ITEMS,
    MAX_TASK_LINE_LENGTH,
    MAX_TASK_LOCATION_LENGTH,
    MAX_TASK_RAW_LENGTH,
    MAX_TASK_TITLE_LENGTH,
} from '@/app/services/tasks/taskInputGuard';
import { newTaskId, pendingTaskShell } from '@/app/services/tasks/quantumPendingTaskFactory';

export type { TaskEnrichmentOptions };

/** يبني مهمة معلّقة من نص خام — بدون إلحاق بالقائمة */
export function buildPendingTaskFromRaw(
    rawText: string,
    options?: TaskEnrichmentOptions,
): LegalTask | null {
    const trimmed = String(rawText ?? '').trim();
    if (!trimmed || trimmed.length > MAX_TASK_RAW_LENGTH) return null;

    const parsed = parseTaskInput(trimmed);
    const enriched = applySilentPracticalEnrichment(trimmed, parsed, options);
    return {
        id: newTaskId(),
        ...enriched,
        linkedCaseId: enriched.linkedCaseId ?? null,
        reminderAt: null,
        ...pendingTaskShell(),
    };
}

/** حزمة موقع أسبوعية: تفاصيل نصية أو إجراءات فرعية ميدانية */
export function buildWeeklyLocationBundleTask(
    scheduledFor: Date,
    location: string,
    mainTitleOrActions: string | string[],
    legacyMainTitle?: string,
): LegalTask | null {
    const loc = clampTaskText(location, MAX_TASK_LOCATION_LENGTH);
    let details = '';
    let actionTitles: string[] = [];

    if (typeof mainTitleOrActions === 'string') {
        details = clampTaskText(mainTitleOrActions, MAX_TASK_TITLE_LENGTH);
    } else {
        actionTitles = mainTitleOrActions
            .map((x) => clampTaskText(x, MAX_TASK_LINE_LENGTH))
            .filter((x) => x.length > 0)
            .slice(0, MAX_NESTED_ITEMS);
        details = clampTaskText(legacyMainTitle ?? '', MAX_TASK_TITLE_LENGTH);
    }

    if (!loc || (!details && actionTitles.length === 0)) return null;

    const day = startOfLocalDay(scheduledFor);
    const parentTitle = details || actionTitles[0]!;
    const extraTitles = details ? actionTitles : actionTitles.slice(1);
    const subTasks: LegalSubTask[] = extraTitles.map((title) => ({
        id: newTaskId(),
        title,
        location: null,
        isCompleted: false,
        kind: 'field',
    }));

    return {
        id: newTaskId(),
        rawText: clampTaskText(
            [loc, parentTitle, ...extraTitles].filter(Boolean).join(' — '),
            MAX_TASK_RAW_LENGTH,
        ),
        title: parentTitle,
        location: loc,
        parsedDate: new Date(day.getTime()),
        reminderAt: null,
        isFatalDeadline: false,
        linkedCaseId: null,
        ...pendingTaskShell({ subTasks }),
    };
}

/** مهمة مؤجلة للتذكير — بلا تاريخ تنفيذ في الأجندة */
export function buildSnoozedBacklogTask(
    title: string,
    reminderAt: Date,
    location: string | null = null,
): LegalTask | null {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > MAX_TASK_RAW_LENGTH) return null;
    const parsed = parseTaskInput(trimmed);
    const enriched = applySilentPracticalEnrichment(trimmed, parsed);
    const remind = startOfLocalDay(reminderAt);
    const locRaw = location?.trim() ? location.trim() : enriched.location;
    const loc = locRaw ? clampTaskText(locRaw, MAX_TASK_LOCATION_LENGTH) || null : null;
    return {
        id: newTaskId(),
        rawText: trimmed,
        title: enriched.title || trimmed,
        location: loc,
        parsedDate: null,
        reminderAt: new Date(remind.getTime()),
        isFatalDeadline: enriched.isFatalDeadline,
        linkedCaseId: enriched.linkedCaseId,
        ...pendingTaskShell(),
    };
}
