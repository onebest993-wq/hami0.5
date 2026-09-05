import { useCallback } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { VoiceNoteSavePayload } from '@/app/components/lawyer/commandCenterTypes';
import { MAX_TASK_RAW_LENGTH } from '@/app/services/tasks/taskInputGuard';
import {
    loadQuantumTaskCreateBundle,
    peekQuantumTaskCreateBundle,
} from '@/app/services/tasks/quantumTaskCreateLoad';
import type { QuantumTasksCreateFns } from '@/app/hooks/useQuantumTasksCore';

type SetTasks = import('react').Dispatch<import('react').SetStateAction<LegalTask[]>>;

/** إنشاء كسول — لا يسحب NLP حتى تُفتح الأجندة أو يُطلب الإنشاء */
export function useQuantumTasksCreateLazy(setTasks: SetTasks): QuantumTasksCreateFns {
    const addTask = useCallback(
        (rawText: string, options?: unknown): LegalTask | null => {
            const cached = peekQuantumTaskCreateBundle();
            if (!cached) {
                void loadQuantumTaskCreateBundle().catch(() => undefined);
                return null;
            }
            const next = cached.builders.buildPendingTaskFromRaw(rawText, options as never);
            if (!next) return null;
            setTasks((prev) => [...prev, next]);
            return next;
        },
        [setTasks],
    );

    const addTaskFromVoice = useCallback(
        async (payload: VoiceNoteSavePayload, fallbackText?: string): Promise<LegalTask | null> => {
            const bundle = peekQuantumTaskCreateBundle() ?? (await loadQuantumTaskCreateBundle());
            const titleSeed = bundle.voice.titleFromVoicePayload(payload, fallbackText);
            if (!titleSeed || titleSeed.length > MAX_TASK_RAW_LENGTH) return null;

            const parsed = bundle.nlp.parseTaskInput(titleSeed);
            const enriched = bundle.enrich.applySilentPracticalEnrichment(titleSeed, parsed);
            const nextId = bundle.factory.newTaskId();
            const voiceFields = await bundle.voice.persistTaskVoiceAttachment(nextId, payload);
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
                ...bundle.factory.pendingTaskShell(),
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
            const cached = peekQuantumTaskCreateBundle();
            if (!cached) {
                void loadQuantumTaskCreateBundle().catch(() => undefined);
                return;
            }
            const next = cached.builders.buildWeeklyLocationBundleTask(
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
            const cached = peekQuantumTaskCreateBundle();
            if (!cached) {
                void loadQuantumTaskCreateBundle().catch(() => undefined);
                return;
            }
            const next = cached.builders.buildSnoozedBacklogTask(title, reminderAt, location);
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
