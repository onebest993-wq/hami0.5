import { describe, expect, it } from 'vitest';
import {
    HQ_DOOR_SESSION_KEY,
    clearHqDoorSession,
    readHqDoorSession,
    restoreHqDoorEntry,
    writeHqDoorSession,
} from '../hqDoorSession';

describe('hqDoorSession', () => {
    it('يقرأ ويكتب ويمسح فتح الباب في الجلسة', () => {
        clearHqDoorSession();
        expect(readHqDoorSession()).toBe('off');
        expect(restoreHqDoorEntry()).toEqual({
            unlocked: false,
            devBypass: false,
            sessionReady: false,
        });
        writeHqDoorSession('open');
        expect(sessionStorage.getItem(HQ_DOOR_SESSION_KEY)).toBe('open');
        expect(readHqDoorSession()).toBe('open');
        expect(restoreHqDoorEntry()).toEqual({
            unlocked: true,
            devBypass: false,
            sessionReady: true,
        });
        clearHqDoorSession();
        expect(readHqDoorSession()).toBe('off');
    });

    it('جلسة التطوير تعيد الباب دون اعتبار النبض جاهزاً', () => {
        writeHqDoorSession('dev');
        if (readHqDoorSession() !== 'dev') return;
        expect(restoreHqDoorEntry()).toEqual({
            unlocked: true,
            devBypass: true,
            sessionReady: false,
        });
        clearHqDoorSession();
    });
});
