import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    primeProfileAvatarDecode,
    resetPrimeProfileAvatarDecodeForTests,
} from '@/app/services/profile/primeProfileAvatarDecode';
import * as avatarDisplay from '@/app/services/profile/resolveProfileAvatarDisplaySrc';
import { resetProfileAvatarDisplayCacheForTests } from '@/app/services/profile/resolveProfileAvatarDisplaySrc';

describe('primeProfileAvatarDecode', () => {
    afterEach(() => {
        resetPrimeProfileAvatarDecodeForTests();
        resetProfileAvatarDisplayCacheForTests();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('يفك الترميز مرة واحدة لنفس المصدر', () => {
        vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
            cb();
            return 1;
        });
        const decode = vi.fn(() => Promise.resolve());
        vi.stubGlobal(
            'Image',
            class {
                decoding = '';
                src = '';
                decode = decode;
            },
        );
        primeProfileAvatarDecode('https://cdn.example/a.jpg');
        primeProfileAvatarDecode('https://cdn.example/a.jpg');
        expect(decode).toHaveBeenCalledTimes(1);
    });

    it('يسخّن مصغّر العرض لـ data الثقيل بدل Image() الكامل', () => {
        const warm = vi
            .spyOn(avatarDisplay, 'warmProfileAvatarDisplaySrc')
            .mockImplementation(() => undefined);
        const decode = vi.fn(() => Promise.resolve());
        vi.stubGlobal(
            'Image',
            class {
                decoding = '';
                src = '';
                decode = decode;
            },
        );

        const heavy = `data:image/jpeg;base64,${'A'.repeat(20_000)}`;
        primeProfileAvatarDecode(heavy);

        expect(decode).not.toHaveBeenCalled();
        expect(warm).toHaveBeenCalledWith(heavy, avatarDisplay.PROFILE_AVATAR_DISPLAY_MAX_EDGE_TILE);
    });
});
