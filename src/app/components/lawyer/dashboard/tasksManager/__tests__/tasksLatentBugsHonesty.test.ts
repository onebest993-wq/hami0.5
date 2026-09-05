import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(resolve(root, rel), 'utf8');
}

describe('علل مهام خفية — لا تعود بعد الإصلاح', () => {
    it('توقيع ترحيل الأجندة يشمل parsedDate و reminderAt', () => {
        const hydration = read(
            'src/app/components/lawyer/dashboard/tasksManager/quantumTasksHydration.ts',
        );
        expect(hydration).toContain('t.parsedDate?.getTime()');
        expect(hydration).toContain('t.reminderAt?.getTime()');
    });

    it('ترحيل منتصف الليل يُعاد عند العودة للتبويب وCapacitor', () => {
        const provider = read('src/app/context/QuantumTasksProvider.tsx');
        expect(provider).toContain('useVisibilityAwareInterval');
        expect(provider).toContain('applyAgendaRollover');
        const interval = read('src/app/hooks/useVisibilityAwareInterval.ts');
        expect(interval).toContain('HAMI_APP_STATE_EVENT');
        expect(interval).toContain('tickRef.current()');
        expect(interval).toContain('intervalId === null');
        const clock = read('src/app/components/lawyer/dashboard/fieldTasks/useLiveNow.ts');
        expect(clock).toContain('useVisibilityAwareInterval');
        expect(provider).toContain('useQuantumTasksBackgroundFlush');
        const persistFlush = read('src/app/hooks/useQuantumTasksBackgroundFlush.ts');
        expect(persistFlush).toContain('HAMI_APP_STATE_EVENT');
        expect(persistFlush).toContain('isActive === false');
    });

    it('بطاقة الأجندة والستارة تشتركان في توقيع يشمل الملف والتاريخ', () => {
        const cardUtils = read(
            'src/app/components/lawyer/dashboard/tasksManager/taskCardUtils.ts',
        );
        const curtain = read(
            'src/app/components/lawyer/dashboard/fieldTasks/FieldCurtainTaskCard.tsx',
        );
        expect(cardUtils).toContain('legalTaskUiSignature');
        expect(curtain).toContain('legalTaskUiSignature');
        const sig = read('src/app/services/tasks/legalTaskUiSignature.ts');
        expect(sig).toContain('task.linkedCaseId');
        expect(sig).toContain('task.parsedDate');
        expect(sig).toContain('d.text');
    });

    it('تحويل المهمة إلى حتمية يفك تثبيت الستارة', () => {
        const lifecycle = read('src/app/hooks/useQuantumTaskLifecycleMutations.ts');
        expect(lifecycle).toContain('nextFatal && t.pinnedToFieldCurtain');
        expect(lifecycle).toContain('fieldCurtainPinnedAt: null');
    });

    it('موجز التنبيه لا يُعاد فتحه مع كل تحديث للمهام', () => {
        const controller = read(
            'src/app/components/lawyer/dashboard/tasksManager/useTasksManagerController.tsx',
        );
        expect(controller).toContain('consumeFocusTaskBrief');
        expect(controller).not.toMatch(
            /if \(task\) setDetailPanel\(\{ taskId: focusTaskId, kind: 'brief' \}\);/,
        );
    });
});
