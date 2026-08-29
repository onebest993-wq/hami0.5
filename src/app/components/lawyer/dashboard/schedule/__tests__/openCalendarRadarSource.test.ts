import { describe, expect, it, vi } from 'vitest';
import { openCalendarRadarSource } from '@/app/components/lawyer/dashboard/schedule/openCalendarRadarSource';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { SmartToast } from '@/app/components/ui/SmartToast';

function handlers(overrides: Partial<Parameters<typeof openCalendarRadarSource>[2]> = {}) {
    return {
        files: [] as FileData[],
        executionFiles: [],
        onOpenLawsuitFile: vi.fn(),
        onOpenExecutionFile: vi.fn(),
        onOpenCriminalCase: vi.fn(),
        onOpenUrgentCase: vi.fn(),
        onOpenTransaction: vi.fn(),
        onOpenNote: vi.fn(),
        onOpenFieldTasks: vi.fn(),
        onBackToHome: vi.fn(),
        ...overrides,
    };
}

describe('openCalendarRadarSource', () => {
    it('يفتح الدعوى ويعود للرئيسية عند وجود الملف', () => {
        const file = { id: 'f1' } as FileData;
        const h = handlers({ files: [file] });
        openCalendarRadarSource('lawsuit', 'f1', h);
        expect(h.onOpenLawsuitFile).toHaveBeenCalledWith(file);
        expect(h.onBackToHome).toHaveBeenCalledTimes(1);
    });

    it('ينبّه إن الإضبارة غير متاحة', () => {
        const h = handlers();
        openCalendarRadarSource('lawsuit', 'missing', h);
        expect(h.onOpenLawsuitFile).not.toHaveBeenCalled();
        expect(SmartToast.info).toHaveBeenCalledWith('الإضبارة غير متاحة');
    });

    it('يفتح المهام الميدانية من مصدر task', () => {
        const h = handlers();
        openCalendarRadarSource('task', 't1', h);
        expect(h.onBackToHome).toHaveBeenCalledTimes(1);
        expect(h.onOpenFieldTasks).toHaveBeenCalledTimes(1);
    });

    it('يغادر التقويم قبل فتح المصدر الجزائي أو المعاملات', () => {
        const h = handlers();
        openCalendarRadarSource('criminal', 'cr-1', h);
        expect(h.onBackToHome).toHaveBeenCalledTimes(1);
        expect(h.onOpenCriminalCase).toHaveBeenCalledWith('cr-1');

        const h2 = handlers();
        openCalendarRadarSource('threading', 'tx-1', h2);
        expect(h2.onBackToHome).toHaveBeenCalledTimes(1);
        expect(h2.onOpenTransaction).toHaveBeenCalledWith('tx-1');
    });

    it('من visit_next يفتح التنفيذ ويطلب مساحة جدول المشاهدة', () => {
        const ex = { id: 'ex-9' };
        const h = handlers({ executionFiles: [ex as never] });
        openCalendarRadarSource('execution', 'ex-9', h, 'visit_next');
        expect(h.onBackToHome).toHaveBeenCalledTimes(1);
        expect(h.onOpenExecutionFile).toHaveBeenCalledWith(ex);
        expect(sessionStorage.getItem('hami:open-execution-visitation-workspace')).toBe('ex-9');
        sessionStorage.removeItem('hami:open-execution-visitation-workspace');
    });

    it('فتح تنفيذ عادي لا يطلب مساحة المشاهدة', () => {
        const ex = { id: 'ex-9' };
        const h = handlers({ executionFiles: [ex as never] });
        openCalendarRadarSource('execution', 'ex-9', h, 'appt-1');
        expect(h.onOpenExecutionFile).toHaveBeenCalledWith(ex);
        expect(sessionStorage.getItem('hami:open-execution-visitation-workspace')).toBeNull();
    });
});
