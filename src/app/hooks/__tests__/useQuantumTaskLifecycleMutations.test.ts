import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useQuantumTaskLifecycleMutations } from '../useQuantumTaskLifecycleMutations';
import { legalTaskStub as task } from '@/app/services/tasks/__tests__/legalTaskStub';
import { removeTaskVoiceAttachment } from '@/app/services/tasks/taskVoiceAttachment';
import type { LegalTask } from '@/app/types/TaskEngine';

vi.mock('@/app/services/tasks/taskVoiceAttachment', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/tasks/taskVoiceAttachment')>();
    return {
        ...actual,
        removeTaskVoiceAttachment: vi.fn(),
    };
});

function useHarness(initial: LegalTask[]) {
    const [tasks, setTasks] = useState(initial);
    const mutations = useQuantumTaskLifecycleMutations(setTasks);
    return { tasks, ...mutations };
}

describe('useQuantumTaskLifecycleMutations', () => {
    beforeEach(() => {
        vi.mocked(removeTaskVoiceAttachment).mockResolvedValue(undefined);
    });

    it('toggleTaskPinnedToFieldCurtain keeps a single pin', () => {
        const { result } = renderHook(() =>
            useHarness([
                task({ id: 'a', title: 'أ' }),
                task({ id: 'b', title: 'ب' }),
            ]),
        );

        act(() => {
            result.current.toggleTaskPinnedToFieldCurtain('a');
        });
        expect(result.current.tasks.find((t) => t.id === 'a')?.pinnedToFieldCurtain).toBe(true);
        expect(result.current.tasks.find((t) => t.id === 'b')?.pinnedToFieldCurtain).toBe(false);

        act(() => {
            result.current.toggleTaskPinnedToFieldCurtain('b');
        });
        expect(result.current.tasks.find((t) => t.id === 'a')?.pinnedToFieldCurtain).toBe(false);
        expect(result.current.tasks.find((t) => t.id === 'b')?.pinnedToFieldCurtain).toBe(true);
    });

    it('toggleTaskPinnedToFieldCurtain ignores fatal deadlines', () => {
        const { result } = renderHook(() =>
            useHarness([task({ id: 'fatal-1', title: 'موعد حتمي', isFatalDeadline: true })]),
        );

        act(() => {
            result.current.toggleTaskPinnedToFieldCurtain('fatal-1');
        });

        expect(result.current.tasks[0]!.pinnedToFieldCurtain).toBe(false);
    });

    it('completeTask stamps completedAt and clears the field-curtain pin', () => {
        const { result } = renderHook(() =>
            useHarness([
                task({
                    id: 'p1',
                    title: 'ميدان',
                    pinnedToFieldCurtain: true,
                    fieldCurtainPinnedAt: new Date(),
                }),
            ]),
        );

        act(() => {
            result.current.completeTask('p1');
        });

        expect(result.current.tasks[0]!.completedAt).not.toBeNull();
        expect(result.current.tasks[0]!.pinnedToFieldCurtain).toBe(false);
        expect(result.current.tasks[0]!.fieldCurtainPinnedAt).toBeNull();
    });

    it('deleteTask removes a voice attachment when present', () => {
        const { result } = renderHook(() =>
            useHarness([
                task({
                    id: 'v1',
                    title: 'صوت',
                    voiceRef: 'hami-voice-ref:task-voice-1',
                }),
            ]),
        );

        act(() => {
            result.current.deleteTask('v1');
        });

        expect(result.current.tasks).toHaveLength(0);
        expect(removeTaskVoiceAttachment).toHaveBeenCalledWith('hami-voice-ref:task-voice-1');
    });
});
