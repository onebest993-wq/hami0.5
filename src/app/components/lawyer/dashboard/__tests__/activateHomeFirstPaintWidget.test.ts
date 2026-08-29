import { describe, expect, it, vi, beforeEach } from 'vitest';
import { activateHomeFirstPaintWidget } from '@/app/components/lawyer/dashboard/activateHomeFirstPaintWidget';
import {
    consumePendingHomeHubEntryOpen,
    resetHomeHubEntryOpenForTests,
} from '@/app/services/alerts/homeHubEntryOpen';

function handlers() {
    return {
        onOpenCalendar: vi.fn(),
        onOpenFieldTasksSheet: vi.fn(),
        onOpenFullNotepad: vi.fn(),
        onOpenRepository: vi.fn(),
        onOpenVault: vi.fn(),
        onOpenCommunity: vi.fn(),
        onOpenArchive: vi.fn(),
    };
}

describe('activateHomeFirstPaintWidget', () => {
    beforeEach(() => {
        resetHomeHubEntryOpenForTests();
    });
    it('يفتح التقويم والمهام والمنتدى من أول إطار', () => {
        const h = handlers();
        activateHomeFirstPaintWidget('dockCalendar', h);
        activateHomeFirstPaintWidget('dockTasks', h);
        activateHomeFirstPaintWidget('forum', h);
        expect(h.onOpenCalendar).toHaveBeenCalledTimes(1);
        expect(h.onOpenFieldTasksSheet).toHaveBeenCalledTimes(1);
        expect(h.onOpenCommunity).toHaveBeenCalledTimes(1);
    });

    it('المستودع عبر onOpenRepository حتى بلاطة المخزن', () => {
        const h = handlers();
        activateHomeFirstPaintWidget('dockRepository', h);
        activateHomeFirstPaintWidget('dockVault', h);
        expect(h.onOpenRepository).toHaveBeenCalledTimes(2);
        expect(h.onOpenVault).not.toHaveBeenCalled();
    });

    it('بلاطات الأرشيف تمرر المعرّف الحي', () => {
        const h = handlers();
        activateHomeFirstPaintWidget('hubExecution', h);
        activateHomeFirstPaintWidget('hubLawsuit', h);
        activateHomeFirstPaintWidget('hubTransaction', h);
        expect(h.onOpenArchive).toHaveBeenCalledWith('execution');
        expect(h.onOpenArchive).toHaveBeenCalledWith('lawsuit');
        expect(h.onOpenArchive).toHaveBeenCalledWith('transaction');
    });

    it('alerts يفتح بطاقة التنبيهات من الهيدر/أول إطار', () => {
        const h = handlers();
        activateHomeFirstPaintWidget('alerts', h);
        expect(h.onOpenCalendar).not.toHaveBeenCalled();
        expect(h.onOpenArchive).not.toHaveBeenCalled();
        expect(consumePendingHomeHubEntryOpen()).toBe(true);
        expect(consumePendingHomeHubEntryOpen()).toBe(false);
    });
});
