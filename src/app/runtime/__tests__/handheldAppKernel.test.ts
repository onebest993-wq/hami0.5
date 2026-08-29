import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    applyHandheldAppKernel,
    getHamiDeviceFormFactor,
    isHandheldApp,
    isPhoneFormFactor,
    isTabletFormFactor,
    resetHandheldAppKernelBindForTests,
    resolveHamiDeviceFormFactor,
} from '@/app/runtime/handheldAppKernel';

describe('handheldAppKernel', () => {
    beforeEach(() => {
        resetHandheldAppKernelBindForTests();
        document.documentElement.removeAttribute('data-hami-app');
        document.documentElement.removeAttribute('data-hami-device');
        delete document.documentElement.dataset.hamiReduceMotion;
    });

    afterEach(() => {
        resetHandheldAppKernelBindForTests();
    });

    it('resolveHamiDeviceFormFactor: أقصر ضلع < 600 هاتف', () => {
        expect(resolveHamiDeviceFormFactor(390, 844)).toBe('phone');
        expect(resolveHamiDeviceFormFactor(844, 390)).toBe('phone');
    });

    it('resolveHamiDeviceFormFactor: أقصر ضلع ≥ 600 لوحي', () => {
        expect(resolveHamiDeviceFormFactor(768, 1024)).toBe('tablet');
        expect(resolveHamiDeviceFormFactor(1024, 768)).toBe('tablet');
    });

    it('applyHandheldAppKernel يختم html بهوية اليد', () => {
        applyHandheldAppKernel();
        expect(isHandheldApp()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-app')).toBe('handheld');
        expect(document.documentElement.classList.contains('hami-handheld-app')).toBe(false);
        expect(getHamiDeviceFormFactor() === 'phone' || getHamiDeviceFormFactor() === 'tablet').toBe(
            true,
        );
        expect(isPhoneFormFactor() || isTabletFormFactor()).toBe(true);
    });
});
