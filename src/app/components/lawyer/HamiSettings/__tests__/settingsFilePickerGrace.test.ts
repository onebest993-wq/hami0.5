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

    it('يفعّل فترة سماح بعد فتح منتقي الملفات', () => {
        expect(isSettingsFilePickerGraceActive()).toBe(false);
        markSettingsFilePickerOpening();
        expect(isSettingsFilePickerGraceActive()).toBe(true);
        vi.advanceTimersByTime(2_600);
        expect(isSettingsFilePickerGraceActive()).toBe(false);
    });
});
