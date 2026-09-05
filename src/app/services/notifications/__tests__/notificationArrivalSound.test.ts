import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { notificationChannelFromModel } from '@/app/services/notifications/notificationChannelFromModel';
import { HAMI_ARRIVAL_TONES } from '@/app/services/notifications/native/hamiArrivalChime';
import { HAMI_NOTIFICATION_VIBRATE_PATTERN } from '@/app/services/platform/deviceHaptic';
import {
    playNotificationArrivalCue,
    previewNotificationArrivalCue,
    previewNotificationArrivalHaptic,
    resetNotificationArrivalSoundForTests,
} from '@/app/services/notifications/notificationArrivalSound';
import { shouldPlayChannelSound, shouldVibrateChannel } from '@/app/services/notifications/notificationAlertPolicy';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('@/app/services/notifications/notificationAlertPolicy', () => ({
    shouldPlayChannelSound: vi.fn(() => true),
    shouldVibrateChannel: vi.fn(() => false),
}));

describe('notificationChannelFromModel', () => {
    it('يربط forum → community', () => {
        expect(
            notificationChannelFromModel({
                type: 'forum_reply',
                category: 'forum',
            }),
        ).toBe('community');
    });

    it('يربط execution → execution', () => {
        expect(
            notificationChannelFromModel({
                type: 'system_alert',
                category: 'execution',
            }),
        ).toBe('execution');
    });
});

describe('hami arrival official seal', () => {
    it('ختم رسمي: قرار → خامسة تامة → جواب بأوكتاف ونداء ذهبي', () => {
        expect(HAMI_ARRIVAL_TONES).toHaveLength(3);
        const [d3, a3, d4] = HAMI_ARRIVAL_TONES.map((t) => t.freq);
        expect(a3 / d3).toBeCloseTo(1.5, 2);
        expect(d4 / d3).toBeCloseTo(2, 2);
        expect(HAMI_ARRIVAL_TONES[2]?.goldFreq).toBe(440);
        expect(HAMI_ARRIVAL_TONES.every((t) => !('vibrato' in t) && !('glideFrom' in t))).toBe(true);
    });

    it('مولّد WAV يقرأ نفس ملف العبارة ويولّد ختماً لا مزماراً', () => {
        const gen = readFileSync(resolve(process.cwd(), 'scripts/generate-hami-notification-sound.mjs'), 'utf8');
        expect(gen).toContain('hamiArrivalChime.json');
        expect(gen).toContain('synthSealTone');
        expect(gen).not.toContain('synthReedTone');
    });
});

describe('notificationArrivalSound', () => {
    beforeEach(() => {
        resetNotificationArrivalSoundForTests();
        vi.mocked(shouldPlayChannelSound).mockReturnValue(true);
        vi.mocked(shouldVibrateChannel).mockReturnValue(false);
        vi.stubGlobal('navigator', { vibrate: vi.fn() });
        vi.stubGlobal(
            'Audio',
            class {
                volume = 1;
                preload = '';
                src = '';
                play = vi.fn(async () => {
                    throw new Error('wav skipped in unit test');
                });
            },
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        resetNotificationArrivalSoundForTests();
    });

    it('لا يرمي عند غياب AudioContext', async () => {
        await expect(playNotificationArrivalCue('community')).resolves.toBeUndefined();
    });

    it('معاينة النغمة لا ترمي وتهتز', async () => {
        await expect(previewNotificationArrivalCue()).resolves.toBeUndefined();
        expect(navigator.vibrate).toHaveBeenCalledWith([...HAMI_NOTIFICATION_VIBRATE_PATTERN]);
    });

    it('معاينة الاهتزاز وحدها تستدعي النمط', () => {
        previewNotificationArrivalHaptic();
        expect(navigator.vibrate).toHaveBeenCalledWith([...HAMI_NOTIFICATION_VIBRATE_PATTERN]);
    });

    it('وصول الإشعار يهتز عندما تسمح السياسة', async () => {
        vi.mocked(shouldVibrateChannel).mockReturnValue(true);
        await playNotificationArrivalCue('community');
        expect(navigator.vibrate).toHaveBeenCalledWith([...HAMI_NOTIFICATION_VIBRATE_PATTERN]);
    });

    it('لا يهتز عندما تمنع السياسة الاهتزاز', async () => {
        await playNotificationArrivalCue('community');
        expect(navigator.vibrate).not.toHaveBeenCalled();
    });
});
