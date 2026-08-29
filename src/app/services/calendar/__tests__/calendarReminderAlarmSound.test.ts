import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/app/services/notifications/notificationAlertPolicy', () => ({
    shouldPlayCalendarAlarmSound: () => true,
    shouldVibrateChannel: () => true,
}));

import {
    playHamiLegalReminderAlarm,
    resetHamiLegalReminderAlarmForTests,
    stopHamiLegalReminderAlarm,
} from '@/app/services/calendar/calendarReminderAlarmSound';

describe('calendarReminderAlarmSound', () => {
    beforeEach(() => {
        resetHamiLegalReminderAlarmForTests();

        const mockOsc = {
            type: 'sine',
            frequency: { setValueAtTime: vi.fn() },
            detune: { setValueAtTime: vi.fn() },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
        };
        const mockGain = {
            gain: {
                setValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
            disconnect: vi.fn(),
        };
        const mockFilter = {
            type: 'lowpass',
            frequency: { setValueAtTime: vi.fn() },
            Q: { setValueAtTime: vi.fn() },
            connect: vi.fn(),
        };

        const ctx = {
            state: 'running',
            currentTime: 0,
            destination: {},
            createOscillator: vi.fn(() => mockOsc),
            createGain: vi.fn(() => mockGain),
            createBiquadFilter: vi.fn(() => mockFilter),
            resume: vi.fn(async () => undefined),
            close: vi.fn(async () => undefined),
        };

        vi.stubGlobal(
            'AudioContext',
            vi.fn(() => ctx),
        );
        vi.stubGlobal('Audio', class {
            loop = false;
            volume = 1;
            preload = '';
            muted = false;
            currentTime = 0;
            src = '';
            play = vi.fn(async () => {
                throw new Error('wav unavailable in synth path');
            });
            pause = vi.fn();
        });
        vi.stubGlobal('navigator', {
            vibrate: vi.fn(),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        resetHamiLegalReminderAlarmForTests();
    });

    it('يشغّل النغمة القانونية ويعيد دالة إيقاف', async () => {
        const stop = await playHamiLegalReminderAlarm({ repeats: 1 });
        expect(typeof stop).toBe('function');
        stop();
        stopHamiLegalReminderAlarm();
    });

    it('يشغّل ملف WAV الحقيقي عند نجاح Audio.play', async () => {
        class FakeAudio {
            loop = false;
            volume = 1;
            preload = '';
            src = '';
            constructor(src: string) {
                this.src = src;
            }
            play = vi.fn(async () => undefined);
            pause = vi.fn();
        }
        vi.stubGlobal('Audio', FakeAudio);
        const stop = await playHamiLegalReminderAlarm({ loop: true });
        expect(typeof stop).toBe('function');
        stop();
        stopHamiLegalReminderAlarm();
    });
});
