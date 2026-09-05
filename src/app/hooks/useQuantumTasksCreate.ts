import { useCallback } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { VoiceNoteSavePayload } from '@/app/components/lawyer/commandCenterTypes';
import {
    persistTaskVoiceAttachment,
    titleFromVoicePayload,
} from '@/app/services/tasks/taskVoiceAttachment';
import { parseTaskInput } from '@/app/utils/nlpParser';
import { applySilentPracticalEnrichment } from '@/app/utils/quantumTaskEnrichment';
import { newTaskId, pendingTaskShell } from '@/app/services/tasks/quantumPendingTaskFactory';
import {
    buildPendingTaskFromRaw,
    buildSnoozedBacklogTask,
    buildWeeklyLocationBundleTask,
} from '@/app/services/tasks/quantumTaskCreateBuilders';
import { MAX_TASK_RAW_LENGTH } from '@/app/services/tasks/taskInputGuard';
import type { QuantumTasksCreateFns } from '@/app/hooks/useQuantumTasksCore';

type SetTasks = import('react').Dispatch<import('react').SetStateAction<LegalTask[]>>;

/** إنشاء من نص/صوت/حزمة أسبوعية — مقطع الأجندة فقط */
export function useQuantumTasksCreate(setTasks: SetTasks): QuantumTasksCreateFns {
    const addTask = useCallback(
        (rawText: string, options?: unknown): LegalTask | null => {
            const next = buildPendingTaskFromRaw(rawText, options as never);
            if (!next) return null;
            setTasks((prev) => [...prev, next]);
            return next;
        },
        [setTasks],
    );

    const addTaskFromVoice = useCallback(
        async (payload: VoiceNoteSavePayload, fallbackText?: string): Promise<LegalTask | null> => {
            const titleSeed = titleFromVoicePayload(payload, fallbackText);
            if (!titleSeed || titleSeed.length > MAX_TASK_RAW_LENGTH) return null;

            const parsed = parseTaskInput(titleSeed);
            const enriched = applySilentPracticalEnrichment(titleSeed, parsed);
            const nextId = newTaskId();
            const voiceFields = await persistTaskVoiceAttachment(nextId, payload);
            if (!voiceFields) return null;

            const next: LegalTask = {
                id: nextId,
                rawText: titleSeed,
                title: enriched.title || titleSeed,
                location: enriched.location,
                parsedDate: enriched.parsedDate,
                reminderAt: null,
                isFatalDeadline: enriched.isFatalDeadline,
                linkedCaseId: enriched.linkedCaseId ?? null,
                ...pendingTaskShell(),
                ...voiceFields,
            };

            setTasks((prev) => [...prev, next]);
            return next;
        },
        [setTasks],
    );

    const addWeeklyLocationBundle = useCallback(
        (
            scheduledFor: Date,
            location: string,
            mainTitleOrActions: string | string[],
            legacyMainTitle?: string,
        ) => {
            const next = buildWeeklyLocationBundleTask(
                scheduledFor,
                location,
                mainTitleOrActions,
                legacyMainTitle,
            );
            if (!next) return;
            setTasks((prev) => [...prev, next]);
        },
        [setTasks],
    );

    const addSnoozedBacklogTask = useCallback(
        (title: string, reminderAt: Date, location: string | null = null) => {
            const next = buildSnoozedBacklogTask(title, reminderAt, location);
            if (!next) return;
            setTasks((prev) => [...prev, next]);
        },
        [setTasks],
    );

    return {
        addTask,
        addTaskFromVoice,
        addWeeklyLocationBundle,
        addSnoozedBacklogTask,
    };
}
