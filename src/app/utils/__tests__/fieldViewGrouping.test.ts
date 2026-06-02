import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import { buildFieldGrouping } from '../fieldViewGrouping';

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
        subTasks: partial.subTasks ?? [],
        documentRequirements: [],
        expenses: [],
    };
}

describe('buildFieldGrouping', () => {
    it('excludes fatal deadlines from location buckets and needsLocation', () => {
        const fatal = task({ id: 'f1', title: 'تمييز', isFatalDeadline: true, location: 'بغداد' });
        const result = buildFieldGrouping([fatal]);
        expect(Object.keys(result.byLocation)).toHaveLength(0);
        expect(result.needsLocationTasks).toHaveLength(0);
    });

    it('groups parent by main location and sub by sub location', () => {
        const t = task({
            id: 'p1',
            title: 'أم',
            location: 'كرخ',
            subTasks: [
                { id: 's1', title: 'فرع', location: 'رصافة', isCompleted: false },
            ],
        });
        const { byLocation } = buildFieldGrouping([t]);
        expect(byLocation['كرخ']).toHaveLength(1);
        expect(byLocation['كرخ']![0]!.kind).toBe('parent');
        expect(byLocation['رصافة']).toHaveLength(1);
        expect(byLocation['رصافة']![0]!.kind).toBe('sub');
    });

    it('skips completed subtasks for location rows', () => {
        const t = task({
            id: 'p2',
            title: 'أم',
            subTasks: [
                { id: 's1', title: 'منجز', location: 'بابل', isCompleted: true },
            ],
        });
        const { byLocation, needsLocationTasks } = buildFieldGrouping([t]);
        expect(byLocation['بابل']).toBeUndefined();
        expect(needsLocationTasks.map((x) => x.id)).toEqual(['p2']);
    });

    it('sorts location keys in Arabic locale', () => {
        const tasks = [
            task({ id: '1', title: 'ب', location: 'ياء' }),
            task({ id: '2', title: 'أ', location: 'ألف' }),
        ];
        const keys = Object.keys(buildFieldGrouping(tasks).byLocation);
        expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b, 'ar')));
    });
});
