import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    agendaTasksLifecycleRevision,
    mergeHydratedQuantumTasks,
} from '@/app/components/lawyer/dashboard/tasksManager/quantumTasksHydration';
import { promoteDueSnoozedTasks } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import { legalTaskStub } from '@/app/services/tasks/__tests__/legalTaskStub';
import { startOfLocalDay } from '@/app/utils/nlpParser';

function task(id: string, title: string): LegalTask {
    return legalTaskStub({ id, title });
}

function localDate(y: number, m: number, d: number): Date {
    return new Date(y, m - 1, d, 12, 0, 0, 0);
}

describe('mergeHydratedQuantumTasks', () => {
    it('يستبدل بالكامل عندما لا توجد مهام حية', () => {
        const loaded = [task('a', 'من التخزين')];
        expect(mergeHydratedQuantumTasks([], loaded)).toEqual(loaded);
    });

    it('يحافظ على التعديلات الحية ويضيف المفقود من التخزين', () => {
        const live = [task('live', 'مهمة جديدة')];
        const loaded = [task('stored', 'قديمة'), task('live', 'نسخة قديمة')];
        const merged = mergeHydratedQuantumTasks(live, loaded);
        expect(merged.find((t) => t.id === 'live')?.title).toBe('مهمة جديدة');
        expect(merged.some((t) => t.id === 'stored')).toBe(true);
    });

    it('لا يستبدل المهام الحية عندما التخزين فارغ', () => {
        const live = [task('live', 'حية')];
        expect(mergeHydratedQuantumTasks(live, [])).toEqual(live);
    });
});

describe('agendaTasksLifecycleRevision', () => {
    it('يختلف بعد ترقية مؤجّلة حتى لو بقي status والتثبيت والإنجاز', () => {
        const now = localDate(2026, 7, 4);
        const snoozed = legalTaskStub({
            id: 's1',
            title: 'مؤجلة',
            parsedDate: null,
            reminderAt: localDate(2026, 7, 10),
        });
        const promoted = promoteDueSnoozedTasks([snoozed], now);
        expect(promoted[0]!.status).toBe(snoozed.status);
        expect(promoted[0]!.pinnedToFieldCurtain).toBe(snoozed.pinnedToFieldCurtain);
        expect(promoted[0]!.completedAt).toBe(snoozed.completedAt);
        expect(agendaTasksLifecycleRevision([snoozed])).not.toBe(agendaTasksLifecycleRevision(promoted));
        expect(promoted[0]!.parsedDate?.getTime()).toBe(startOfLocalDay(localDate(2026, 7, 10)).getTime());
        expect(promoted[0]!.reminderAt).toBeNull();
    });
});
