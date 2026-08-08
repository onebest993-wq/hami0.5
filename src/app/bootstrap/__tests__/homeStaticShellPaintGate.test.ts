import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    HOME_STATIC_SHELL_PAINTED_EVENT,
    isHomeStaticShellPainted,
    markHomeStaticShellPainted,
    resetHomeStaticShellPaintGateForTests,
    wireHomeStaticShellPaintListener,
} from '@/app/bootstrap/homeStaticShellPaintGate';

describe('homeStaticShellPaintGate', () => {
    beforeEach(() => {
        resetHomeStaticShellPaintGateForTests();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('يُعلّم الطبقة الثابتة مرة واحدة', () => {
        const handler = vi.fn();
        window.addEventListener(HOME_STATIC_SHELL_PAINTED_EVENT, handler);
        markHomeStaticShellPainted();
        markHomeStaticShellPainted();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(isHomeStaticShellPainted()).toBe(true);
    });

    it('يكتشف data-hami-phase=shell عند التوصيل', () => {
        const boot = document.createElement('div');
        boot.id = 'hami-static-boot';
        boot.setAttribute('data-hami-phase', 'shell');
        document.body.appendChild(boot);

        wireHomeStaticShellPaintListener();
        expect(isHomeStaticShellPainted()).toBe(true);
    });
});
