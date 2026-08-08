import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    HOME_MAIN_GRID_PAINTED_EVENT,
    isHomeMainGridPainted,
    notifyHomeMainGridPainted,
    resetHomeMainGridPaintGateForTests,
    scheduleHomeMainGridPainted,
} from '@/app/bootstrap/homeMainGridPaintGate';

vi.mock('@/app/bootstrap/bootStaticShell', () => ({
    removeStaticBootShell: vi.fn(),
}));

vi.mock('@/app/bootstrap/bootReveal', () => ({
    isBootRevealDone: vi.fn(() => false),
    markBootRevealDone: vi.fn(),
    getBootRevealMinMs: vi.fn(() => 0),
    BOOT_REVEAL_DONE_EVENT: 'hami:boot-reveal-done',
}));

import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { markBootRevealDone } from '@/app/bootstrap/bootReveal';

describe('homeMainGridPaintGate', () => {
    beforeEach(() => {
        resetHomeMainGridPaintGateForTests();
        vi.mocked(removeStaticBootShell).mockClear();
        vi.mocked(markBootRevealDone).mockClear();
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout'] });
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('يُطلق الحدث مرة واحدة بعد rAF', () => {
        const handler = vi.fn();
        window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, handler);

        const grid = document.createElement('div');
        grid.dataset.testid = 'home-main-grid';
        Object.defineProperty(grid, 'getBoundingClientRect', {
            value: () => ({ width: 320, height: 480, top: 0, left: 0, right: 320, bottom: 480 }),
        });
        document.body.appendChild(grid);

        scheduleHomeMainGridPainted(grid);
        vi.runAllTimers();
        expect(isHomeMainGridPainted()).toBe(true);
        expect(handler).toHaveBeenCalledTimes(1);

        notifyHomeMainGridPainted();
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('يزيل الطبقة الثابتة بعد paint الشبكة', () => {
        notifyHomeMainGridPainted();
        vi.runAllTimers();
        expect(removeStaticBootShell).toHaveBeenCalledWith({ instant: true });
        expect(markBootRevealDone).toHaveBeenCalled();
    });
});
