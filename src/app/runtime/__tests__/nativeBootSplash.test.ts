import { afterEach, describe, expect, it, vi } from 'vitest';

const whenNativeBridgeReady = vi.fn(async () => undefined);

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => true,
}));

vi.mock('@/app/runtime/nativeBridgeReady', () => ({
    whenNativeBridgeReady: (...args: unknown[]) => whenNativeBridgeReady(...args),
}));

describe('nativeBootSplash', () => {
    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('ينجح بعد انتظار الجسر ويستدعي notifyReady مرة واحدة', async () => {
        const notifyReady = vi.fn(async () => undefined);
        vi.doMock('@capacitor/core', () => ({
            Capacitor: {
                isNativePlatform: () => true,
                isPluginAvailable: (name: string) => name === 'HamiBoot',
            },
            registerPlugin: () => ({ notifyReady }),
        }));

        const { notifyNativeBootReady, resetNativeBootReadyForTests } = await import(
            '@/app/runtime/nativeBootSplash'
        );
        resetNativeBootReadyForTests();
        await expect(notifyNativeBootReady()).resolves.toBe(true);
        await expect(notifyNativeBootReady()).resolves.toBe(true);
        expect(whenNativeBridgeReady).toHaveBeenCalled();
        expect(notifyReady).toHaveBeenCalledTimes(1);
    });

    it('لا يستدعي HamiBoot.then عبر إرجاع proxy من async (ثمالة Capacitor)', async () => {
        const notifyReady = vi.fn(async () => undefined);
        let thenAccessed = 0;
        const proxy = new Proxy(
            { notifyReady },
            {
                get(target, prop, receiver) {
                    if (prop === 'then') {
                        thenAccessed += 1;
                        return () => {
                            throw new Error('"HamiBoot.then()" is not implemented on android');
                        };
                    }
                    return Reflect.get(target, prop, receiver);
                },
            },
        );
        vi.doMock('@capacitor/core', () => ({
            Capacitor: {
                isNativePlatform: () => true,
                isPluginAvailable: () => true,
            },
            registerPlugin: () => proxy,
        }));

        const { notifyNativeBootReady, resetNativeBootReadyForTests, isHamiBootTimingError } =
            await import('@/app/runtime/nativeBootSplash');
        resetNativeBootReadyForTests();
        expect(isHamiBootTimingError(new Error('"HamiBoot.then()" is not implemented on android'))).toBe(
            true,
        );
        await expect(notifyNativeBootReady()).resolves.toBe(true);
        expect(notifyReady).toHaveBeenCalled();
        expect(thenAccessed).toBe(0);
    });

    it('يعيد المحاولة عند فشل الاستدعاء ثم ينجح', async () => {
        const notifyReady = vi
            .fn()
            .mockRejectedValueOnce(new Error('bridge-not-ready'))
            .mockResolvedValueOnce(undefined);
        vi.doMock('@capacitor/core', () => ({
            Capacitor: {
                isNativePlatform: () => true,
                isPluginAvailable: () => true,
            },
            registerPlugin: () => ({ notifyReady }),
        }));

        const { notifyNativeBootReady, resetNativeBootReadyForTests } = await import(
            '@/app/runtime/nativeBootSplash'
        );
        resetNativeBootReadyForTests();
        await expect(notifyNativeBootReady()).resolves.toBe(true);
        expect(notifyReady).toHaveBeenCalledTimes(2);
    });

    it('يعلن حدث فشل بعد استنفاد المحاولات — لا صمت', async () => {
        const notifyReady = vi.fn(async () => {
            throw new Error('permanent');
        });
        vi.doMock('@capacitor/core', () => ({
            Capacitor: {
                isNativePlatform: () => true,
                isPluginAvailable: () => true,
            },
            registerPlugin: () => ({ notifyReady }),
        }));

        const failed: string[] = [];
        const onFail = (e: Event) => {
            const detail = (e as CustomEvent<{ reason?: string }>).detail;
            failed.push(detail?.reason ?? '');
        };
        window.addEventListener('hami:native-boot-ready-failed', onFail);

        const { notifyNativeBootReady, resetNativeBootReadyForTests } = await import(
            '@/app/runtime/nativeBootSplash'
        );
        resetNativeBootReadyForTests();
        await expect(notifyNativeBootReady()).resolves.toBe(false);
        window.removeEventListener('hami:native-boot-ready-failed', onFail);
        expect(failed.length).toBeGreaterThan(0);
        expect(notifyReady.mock.calls.length).toBeGreaterThan(1);
    });
});
