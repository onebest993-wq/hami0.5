import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    isSettingsFilePickerGraceActive,
    markSettingsFilePickerOpening,
} from '@/app/components/lawyer/HamiSettings/settingsFilePickerGrace';

describe('settingsFilePickerGrace', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يفعّل فترة سماح طويلة بعد فتح منتقي الملفات (معرض الجهاز)', () => {
        expect(isSettingsFilePickerGraceActive()).toBe(false);
        markSettingsFilePickerOpening();
        expect(isSettingsFilePickerGraceActive()).toBe(true);
        vi.advanceTimersByTime(11_000);
        expect(isSettingsFilePickerGraceActive()).toBe(true);
        vi.advanceTimersByTime(1_500);
        expect(isSettingsFilePickerGraceActive()).toBe(false);
    });
});
