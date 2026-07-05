import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import { mergeHydratedQuantumTasks } from '@/app/components/lawyer/dashboard/tasksManager/quantumTasksHydration';

function task(id: string, title: string): LegalTask {
    return {
        id,
        rawText: title,
        title,
        location: null,
        parsedDate: null,
        reminderAt: null,
        isFatalDeadline: false,
        linkedCaseId: null,
        status: 'pending',
        completedAt: null,
        pinnedToFieldCurtain: false,
        fieldCurtainPinnedAt: null,
        subTasks: [],
        documentRequirements: [],
        expenses: [],
        voiceRef: null,
        voiceTranscript: null,
        voiceDurationSec: null,
    };
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
