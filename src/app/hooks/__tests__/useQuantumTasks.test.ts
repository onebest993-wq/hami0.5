import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuantumTasks } from '../useQuantumTasks';
import type { LegalTask } from '@/app/types/TaskEngine';
import { releaseExpiredFieldCurtainPins } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import { startOfLocalDay } from '@/app/utils/nlpParser';
import { legalTaskStub as task } from '@/app/services/tasks/__tests__/legalTaskStub';
import {
    persistTaskVoiceAttachment,
    removeTaskVoiceAttachment,
} from '@/app/services/tasks/taskVoiceAttachment';

vi.mock('@/app/services/tasks/taskVoiceAttachment', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/tasks/taskVoiceAttachment')>();
    return {
        ...actual,
        persistTaskVoiceAttachment: vi.fn(),
        removeTaskVoiceAttachment: vi.fn(),
    };
});

describe('useQuantumTasks', () => {
    beforeEach(() => {
        vi.stubGlobal('crypto', {
            randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
        });
        vi.mocked(persistTaskVoiceAttachment).mockResolvedValue({
            voiceRef: 'hami-voice-ref:task-voice-mock',
            voiceTranscript: 'جلسة صوتية',
            voiceDurationSec: 8,
        });
        vi.mocked(removeTaskVoiceAttachment).mockResolvedValue(undefined);
    });

    it('addTask returns null for empty or oversized input', () => {
        const { result } = renderHook(() => useQuantumTasks([]));

        expect(result.current.addTask('')).toBeNull();
        expect(result.current.addTask('  ')).toBeNull();
        expect(result.current.addTask('x'.repeat(2001))).toBeNull();
        expect(result.current.tasks).toHaveLength(0);
    });

    it('addTask appends pending task and keeps in agenda after complete until week ends', () => {
        const { result } = renderHook(() => useQuantumTasks([]));

        act(() => {
            result.current.addTask('جلسة محكمة كرخ غداً');
        });

        expect(result.current.tasks).toHaveLength(1);
        expect(result.current.pendingTasks).toHaveLength(1);
        const id = result.current.tasks[0]!.id;

        act(() => {
            result.current.completeTask(id);
        });

        expect(result.current.pendingTasks).toHaveLength(1);
        expect(result.current.tasks[0]!.status).toBe('pending');
        expect(result.current.tasks[0]!.completedAt).not.toBeNull();
    });

    it('addWeeklyLocationBundle creates parent with sub tasks', () => {
        const { result } = renderHook(() => useQuantumTasks([]));
        const day = startOfLocalDay(new Date(2026, 4, 18));

        act(() => {
            result.current.addWeeklyLocationBundle(day, 'محكمة الرصافة', ['دفع رسم', 'تصوير قرار']);
        });

        expect(result.current.pendingTasks).toHaveLength(1);
        const t = result.current.pendingTasks[0]!;
        expect(t.location).toBe('محكمة الرصافة');
        expect(t.subTasks).toHaveLength(1);
        expect(t.subTasks[0]!.title).toBe('تصوير قرار');
        expect(t.subTasks[0]!.kind).toBe('field');
    });

    it('addWeeklyLocationBundle with details string creates task without sub tasks', () => {
        const { result } = renderHook(() => useQuantumTasks([]));
        const day = startOfLocalDay(new Date(2026, 4, 18));

        act(() => {
            result.current.addWeeklyLocationBundle(day, 'محكمة الرصافة', 'متابعة قرار');
        });

        expect(result.current.pendingTasks).toHaveLength(1);
        const t = result.current.pendingTasks[0]!;
        expect(t.title).toBe('متابعة قرار');
        expect(t.location).toBe('محكمة الرصافة');
        expect(t.subTasks).toHaveLength(0);
    });

    it('notifies onTasksCommitted with the post-update task list', () => {
        const onTasksCommitted = vi.fn();
        const { result } = renderHook(() => useQuantumTasks([], { onTasksCommitted }));

        act(() => {
            result.current.addWeeklyLocationBundle(
                startOfLocalDay(new Date(2026, 5, 21)),
                'بغداد',
                'جلسة مرافعة',
            );
        });

        expect(onTasksCommitted).toHaveBeenCalled();
        const committed = onTasksCommitted.mock.calls.at(-1)?.[0] as LegalTask[];
        expect(committed).toHaveLength(1);
        expect(committed[0]?.location).toBe('بغداد');
        expect(committed[0]?.title).toBe('جلسة مرافعة');
    });

    it('toggleTaskPinnedToFieldCurtain pins only the target task', () => {
        const { result } = renderHook(() => useQuantumTasks([]));

        act(() => {
            result.current.addTask('مهمة أ');
            result.current.addTask('مهمة ب');
        });

        const idA = result.current.tasks[0]!.id;
        const idB = result.current.tasks[1]!.id;

        act(() => {
            result.current.toggleTaskPinnedToFieldCurtain(idA);
        });

        expect(result.current.tasks.find((t) => t.id === idA)?.pinnedToFieldCurtain).toBe(true);
        expect(result.current.tasks.find((t) => t.id === idB)?.pinnedToFieldCurtain).toBe(false);

        act(() => {
            result.current.toggleTaskPinnedToFieldCurtain(idB);
        });

        expect(result.current.tasks.find((t) => t.id === idA)?.pinnedToFieldCurtain).toBe(false);
        expect(result.current.tasks.find((t) => t.id === idB)?.pinnedToFieldCurtain).toBe(true);
    });

    it('toggleTaskPinnedToFieldCurtain ignores fatal deadlines', () => {
        const { result } = renderHook(() =>
            useQuantumTasks([
                task({ id: 'fatal-1', title: 'موعد حتمي', isFatalDeadline: true }),
            ]),
        );

        act(() => {
            result.current.toggleTaskPinnedToFieldCurtain('fatal-1');
        });

        expect(result.current.tasks[0]!.pinnedToFieldCurtain).toBe(false);
    });

    it('addTaskFromVoice persists voice blob and creates task with voice fields', async () => {
        const { result } = renderHook(() => useQuantumTasks([]));
        const payload = {
            blob: new Blob(['audio'], { type: 'audio/webm' }),
            durationSeconds: 8,
            transcript: 'جلسة محكمة كرخ غداً',
        };

        let created: LegalTask | null = null;
        await act(async () => {
            created = await result.current.addTaskFromVoice(payload);
        });

        expect(persistTaskVoiceAttachment).toHaveBeenCalled();
        expect(created).not.toBeNull();
        expect(result.current.tasks).toHaveLength(1);
        expect(result.current.tasks[0]!.voiceRef).toBe('hami-voice-ref:task-voice-mock');
        expect(result.current.tasks[0]!.voiceTranscript).toBe('جلسة صوتية');
        expect(result.current.tasks[0]!.voiceDurationSec).toBe(8);
    });

    it('deleteTask removes voice attachment when voiceRef is set', async () => {
        const { result } = renderHook(() => useQuantumTasks([]));
        const payload = {
            blob: new Blob(['audio'], { type: 'audio/webm' }),
            durationSeconds: 5,
            transcript: 'مهمة صوتية',
        };

        await act(async () => {
            await result.current.addTaskFromVoice(payload);
        });
        const id = result.current.tasks[0]!.id;

        act(() => {
            result.current.deleteTask(id);
        });

        await waitFor(() => {
            expect(removeTaskVoiceAttachment).toHaveBeenCalledWith('hami-voice-ref:task-voice-mock');
        });
        expect(result.current.tasks).toHaveLength(0);
    });

    it('releaseExpiredFieldCurtainPins keeps today pin when parsedDate is in the past', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const pinnedToday = startOfLocalDay(new Date());
        const [kept] = releaseExpiredFieldCurtainPins(
            [
                task({
                    id: 'overdue-1',
                    title: 'مهمة متأخرة',
                    parsedDate: yesterday,
                    pinnedToFieldCurtain: true,
                    fieldCurtainPinnedAt: pinnedToday,
                }),
            ],
            new Date(),
        );
        expect(kept!.pinnedToFieldCurtain).toBe(true);
    });

    it('reopenTask يعيد مهمة الأرشيف إلى اليوم الحالي', () => {
        const lastWeek = startOfLocalDay(new Date());
        lastWeek.setDate(lastWeek.getDate() - 8);
        const { result } = renderHook(() =>
            useQuantumTasks([
                task({
                    id: 'arch-1',
                    title: 'مهمة أرشيف',
                    parsedDate: lastWeek,
                }),
            ]),
        );

        expect(result.current.tasks[0]!.status).toBe('completed');
        expect(result.current.tasks[0]!.completedAt).not.toBeNull();

        act(() => {
            result.current.reopenTask('arch-1');
        });

        const reopened = result.current.tasks.find((t) => t.id === 'arch-1');
        expect(reopened?.completedAt).toBeNull();
        expect(reopened?.status).toBe('pending');
        expect(reopened?.parsedDate?.toDateString()).toBe(new Date().toDateString());
    });

    it('updateTask cannot rewrite id and clamps title', () => {
        const { result } = renderHook(() => useQuantumTasks([]));
        act(() => {
            result.current.addTask('مهمة أصلية');
        });
        const originalId = result.current.tasks[0]!.id;

        act(() => {
            result.current.updateTask(originalId, {
                id: 'forged-id',
                title: 'x'.repeat(800),
            } as Partial<LegalTask>);
        });

        expect(result.current.tasks[0]!.id).toBe(originalId);
        expect(result.current.tasks[0]!.title.length).toBeLessThanOrEqual(500);
    });

    it('addWeeklyLocationBundle clamps oversized location', () => {
        const { result } = renderHook(() => useQuantumTasks([]));
        act(() => {
            result.current.addWeeklyLocationBundle(
                startOfLocalDay(new Date(2026, 4, 18)),
                `محكمة ${'ر'.repeat(400)}`,
                'متابعة',
            );
        });
        expect(result.current.tasks[0]!.location!.length).toBeLessThanOrEqual(200);
    });
});
