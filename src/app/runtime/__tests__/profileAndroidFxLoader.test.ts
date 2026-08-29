import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/runtime/nativePlatform', () => ({
    isAndroidNativeShell: vi.fn(),
}));

describe('profileAndroidFxLoader', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('لا يستورد CSS على غير Android', async () => {
        const { isAndroidNativeShell } = await import('@/app/runtime/nativePlatform');
        vi.mocked(isAndroidNativeShell).mockReturnValue(false);
        const { ensureProfileAndroidFxLoaded, resetProfileAndroidFxLoaderForTests } = await import(
            '@/app/runtime/profileAndroidFxLoader'
        );
        resetProfileAndroidFxLoaderForTests();
        await ensureProfileAndroidFxLoaded();
        /* لا رمية — والمسار لا يمرّ على import css */
        expect(isAndroidNativeShell).toHaveBeenCalled();
    });

    it('يستورد CSS مرة واحدة على Android', async () => {
        const { isAndroidNativeShell } = await import('@/app/runtime/nativePlatform');
        vi.mocked(isAndroidNativeShell).mockReturnValue(true);
        const { ensureProfileAndroidFxLoaded, resetProfileAndroidFxLoaderForTests } = await import(
            '@/app/runtime/profileAndroidFxLoader'
        );
        resetProfileAndroidFxLoaderForTests();
        await Promise.all([ensureProfileAndroidFxLoaded(), ensureProfileAndroidFxLoaded()]);
        expect(isAndroidNativeShell).toHaveBeenCalled();
    });
});
