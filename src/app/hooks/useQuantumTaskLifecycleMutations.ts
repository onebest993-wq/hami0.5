import { useCallback, type SetStateAction } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    applyReopenTask,
    buildPostponeTaskPatch,
    prepareAgendaTasks,
    releaseExpiredFieldCurtainPins,
} from '@/app/components/lawyer/dashboard/tasksManager/utils';
import { removeTaskVoiceAttachment } from '@/app/services/tasks/taskVoiceAttachment';
import { clampTaskText, MAX_TASK_LOCATION_LENGTH, sanitizeTaskPatch } from '@/app/services/tasks/taskInputGuard';
import { startOfLocalDay } from '@/app/utils/nlpParser';

type SetTasks = (updater: SetStateAction<LegalTask[]>) => void;

/** إكمال / إعادة فتح / ترحيل / تثبيت / موقع — منفصل عن الإنشاء والمساعدة */
export function useQuantumTaskLifecycleMutations(setTasks: SetTasks) {
    const updateTask = useCallback((id: string, patch: Partial<LegalTask>) => {
        setTasks((prev) =>
            prev.map((t) => {
                if (t.id !== id) return t;
                const safePatch = sanitizeTaskPatch(patch);
                const next = { ...t, ...safePatch };
                next.id = t.id;
                if (safePatch.parsedDate !== undefined) {
                    next.parsedDate =
                        safePatch.parsedDate === null ? null : startOfLocalDay(safePatch.parsedDate);
                }
                if (safePatch.reminderAt !== undefined) {
                    next.reminderAt =
                        safePatch.reminderAt === null ? null : startOfLocalDay(safePatch.reminderAt);
                }
                return next;
            }),
        );
    }, [setTasks]);

    const deleteTask = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (target?.voiceRef) {
                void removeTaskVoiceAttachment(target.voiceRef);
            }
            return prev.filter((t) => t.id !== id);
        });
    }, [setTasks]);

    const completeTask = useCallback((id: string) => {
        setTasks((prev) =>
            releaseExpiredFieldCurtainPins(
                prev.map((t) =>
                    t.id === id && !t.completedAt
                        ? {
                              ...t,
                              completedAt: startOfLocalDay(new Date()),
                              pinnedToFieldCurtain: false,
                              fieldCurtainPinnedAt: null,
                          }
                        : t,
                ),
            ),
        );
    }, [setTasks]);

    const reopenTask = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (!target) return prev;
            const next = applyReopenTask(target, new Date());
            if (!next) return prev;
            return prepareAgendaTasks(prev.map((t) => (t.id === id ? next : t)));
        });
    }, [setTasks]);

    const postponeTask = useCallback((id: string, targetDate: Date) => {
        const patch = buildPostponeTaskPatch(targetDate);
        setTasks((prev) =>
            prepareAgendaTasks(
                prev.map((t) =>
                    t.id === id
                        ? {
                              ...t,
                              ...patch,
                              completedAt: null,
                              status: 'pending' as const,
                          }
                        : t,
                ),
            ),
        );
    }, [setTasks]);

    const toggleTaskFatalDeadline = useCallback((id: string) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, isFatalDeadline: !t.isFatalDeadline } : t,
            ),
        );
    }, [setTasks]);

    const toggleTaskPinnedToFieldCurtain = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (!target) return prev;
            /** الحتمية لها قسمها في الأجندة — لا تُثبَّت على ستارة الميدان */
            if (target.isFatalDeadline) return prev;
            const willPin = !target.pinnedToFieldCurtain;
            const pinDay = startOfLocalDay(new Date());
            return prev.map((t) => {
                if (t.id === id) {
                    return {
                        ...t,
                        pinnedToFieldCurtain: willPin,
                        fieldCurtainPinnedAt: willPin ? new Date(pinDay.getTime()) : null,
                    };
                }
                if (willPin && t.pinnedToFieldCurtain) {
                    return { ...t, pinnedToFieldCurtain: false, fieldCurtainPinnedAt: null };
                }
                return t;
            });
        });
    }, [setTasks]);

    const setTaskLocation = useCallback((id: string, location: string | null) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === id
                    ? {
                          ...t,
                          location:
                              location == null
                                  ? null
                                  : clampTaskText(location, MAX_TASK_LOCATION_LENGTH) || null,
                      }
                    : t,
            ),
        );
    }, [setTasks]);

    return {
        updateTask,
        deleteTask,
        completeTask,
        reopenTask,
        postponeTask,
        toggleTaskFatalDeadline,
        toggleTaskPinnedToFieldCurtain,
        setTaskLocation,
    };
}
