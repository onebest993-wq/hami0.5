import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    resolveProfileShellReady,
    shouldPersistProfileLocally,
} from '@/app/services/profile/profileShellPolicy';

describe('profileShellPolicy — جاهزية القشرة', () => {
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

describe('أغلفة profileShell* الميتة', () => {
    const dir = resolve(process.cwd(), 'src/app/services/profile');

    it('لا تبقى ملفات re-export بعد توحيد السياسة', () => {
        for (const name of [
            'profileShellLogic.ts',
            'profileShellNavigation.ts',
            'profileShellOrchestration.ts',
            'profileStudioAccessLogic.ts',
        ]) {
            expect(existsSync(resolve(dir, name)), name).toBe(false);
        }
    });
});
