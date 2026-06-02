import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuantumTasks } from '../useQuantumTasks';
import { startOfLocalDay } from '@/app/utils/nlpParser';

describe('useQuantumTasks', () => {
    beforeEach(() => {
        vi.stubGlobal('crypto', {
            randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
        });
    });

    it('addTask appends pending task and excludes from pending after complete', () => {
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

        expect(result.current.pendingTasks).toHaveLength(0);
        expect(result.current.tasks[0]!.status).toBe('completed');
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

    it('toggleTaskPinnedToFieldCurtain toggles pin flag', () => {
        const { result } = renderHook(() => useQuantumTasks([]));

        act(() => {
            result.current.addTask('مهمة');
        });
        const id = result.current.tasks[0]!.id;

        act(() => {
            result.current.toggleTaskPinnedToFieldCurtain(id);
        });
        expect(result.current.tasks[0]!.pinnedToFieldCurtain).toBe(true);

        act(() => {
            result.current.toggleTaskPinnedToFieldCurtain(id);
        });
        expect(result.current.tasks[0]!.pinnedToFieldCurtain).toBe(false);
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
