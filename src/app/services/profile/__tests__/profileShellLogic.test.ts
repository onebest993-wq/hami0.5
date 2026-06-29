import { describe, expect, it } from 'vitest';
import {
    resolveProfileShellReady,
    shouldPersistProfileLocally,
} from '@/app/services/profile/profileShellLogic';

describe('resolveProfileShellReady', () => {
    it('false أثناء التحميل بدون كاش', () => {
        expect(
            resolveProfileShellReady({
                loading: true,
                hasHeader: false,
                hadWarmCache: false,
            }),
        ).toBe(false);
    });

    it('true مع كاش دافئ وبيانات header', () => {
        expect(
            resolveProfileShellReady({
                loading: true,
                hasHeader: true,
                hadWarmCache: true,
            }),
        ).toBe(true);
    });

    it('true بعد انتهاء التحميل', () => {
        expect(
            resolveProfileShellReady({
                loading: false,
                hasHeader: true,
                hadWarmCache: false,
            }),
        ).toBe(true);
    });
});

describe('shouldPersistProfileLocally', () => {
    it('true فقط عندما viewer === profileUserId', () => {
        expect(shouldPersistProfileLocally('lawyer-1', 'lawyer-1')).toBe(true);
        expect(shouldPersistProfileLocally('lawyer-1', 'lawyer-2')).toBe(false);
        expect(shouldPersistProfileLocally(null, 'lawyer-1')).toBe(false);
        expect(shouldPersistProfileLocally('  ', 'lawyer-1')).toBe(false);
    });
});
