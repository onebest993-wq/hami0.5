import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuantumTasks } from '../useQuantumTasks';
import { releaseExpiredFieldCurtainPins } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import type { LegalTask } from '@/app/types/TaskEngine';
import { startOfLocalDay } from '@/app/utils/nlpParser';

function task(partial: Partial<LegalTask> & Pick<LegalTask, 'id' | 'title'>): LegalTask {
    return {
        id: partial.id,
        rawText: partial.title,
        title: partial.title,
        location: partial.location ?? null,
        parsedDate: partial.parsedDate ?? null,
        reminderAt: null,
        isFatalDeadline: partial.isFatalDeadline ?? false,
        linkedCaseId: null,
        status: 'pending',
        pinnedToFieldCurtain: partial.pinnedToFieldCurtain ?? false,
        fieldCurtainPinnedAt: partial.fieldCurtainPinnedAt ?? null,
        completedAt: partial.completedAt ?? null,
        subTasks: partial.subTasks ?? [],
        documentRequirements: [],
        expenses: [],
    };
}

describe('useQuantumTasks', () => {
    beforeEach(() => {
        vi.stubGlobal('crypto', {
            randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
        });
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

    it('groupedByTime excludes fatal deadlines', () => {
        const { result } = renderHook(() => useQuantumTasks([]));

        act(() => {
            result.current.addTask('موعد حتمي تمييز');
        });

        expect(result.current.pendingTasks[0]!.isFatalDeadline).toBe(true);
        expect(result.current.groupedByTime.today).toHaveLength(0);
        expect(result.current.groupedByTime.overdue).toHaveLength(0);
    });

    it('fieldGrouping aligns with buildFieldGrouping for location', () => {
        const { result } = renderHook(() => useQuantumTasks([]));

        act(() => {
            result.current.addTask('زيارة محكمة كرخ غداً');
        });
        const id = result.current.tasks[0]!.id;

        act(() => {
            result.current.setTaskLocation(id, 'كرخ');
        });

        const keys = Object.keys(result.current.fieldGrouping.byLocation);
        expect(keys).toContain('كرخ');
    });
});
