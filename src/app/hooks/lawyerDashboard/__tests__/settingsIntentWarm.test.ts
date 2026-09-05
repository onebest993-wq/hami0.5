import { describe, expect, it, vi, beforeEach } from 'vitest';
import { warmSettingsOnHover, warmSettingsOnOpen, primeSettingsShellForOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';

const prefetchHamiSettingsModule = vi.fn();
const prefetchSettingsOverlayEntry = vi.fn();

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    prefetchHamiSettingsModule: (...args: unknown[]) => prefetchHamiSettingsModule(...args),
}));

vi.mock('@/app/runtime/settingsOverlayEntryLoader', () => ({
    prefetchSettingsOverlayEntry: (...args: unknown[]) => prefetchSettingsOverlayEntry(...args),
}));

describe('settingsIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('warmSettingsOnHover يسخّن الشِل والبوابة دون تبويبات ثانوية', () => {
        warmSettingsOnHover();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(prefetchSettingsOverlayEntry).toHaveBeenCalledTimes(1);
    });

    it('warmSettingsOnOpen و prime يحمّلان الشِل فوراً بلا أقسام ثانوية', () => {
        warmSettingsOnOpen();
        primeSettingsShellForOpen();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(2);
        expect(prefetchSettingsOverlayEntry).toHaveBeenCalledTimes(2);
    });
});
