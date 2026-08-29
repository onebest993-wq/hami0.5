import { afterEach, describe, expect, it, vi } from 'vitest';
import { isViteE2eHooksEnabled } from '@/app/utils/viteE2eHooks';
import {
    blobFromJpegDataUrl,
    cameraErrorName,
    isE2eScannerCameraBypassEnabled,
    paintScannerCaptureCanvas,
    requestScannerCameraStream,
    resolveCameraAccessMessage,
    resolveScannerCaptureSize,
    subscribeScannerCameraBackgroundRelease,
} from '@/app/components/lawyer/SmartVaultModal/scannerCamera';

vi.mock('@/app/utils/viteE2eHooks', () => ({
    isViteE2eHooksEnabled: vi.fn(() => true),
}));

describe('scannerCamera', () => {
    afterEach(() => {
        delete (window as Window & { __hamiE2eCameraStream?: () => Promise<MediaStream> }).__hamiE2eCameraStream;
        delete (window as Window & { __hamiE2eCamera?: boolean }).__hamiE2eCamera;
        document.documentElement.removeAttribute('data-hami-e2e-camera');
        try {
            sessionStorage.removeItem('hami:e2e-camera');
        } catch {
            /* ignore */
        }
        vi.mocked(isViteE2eHooksEnabled).mockReturnValue(true);
        vi.unstubAllGlobals();
    });

    it('يقرأ اسم خطأ الكاميرا من الكائن', () => {
        expect(cameraErrorName({ name: 'NotAllowedError' })).toBe('NotAllowedError');
        expect(cameraErrorName('x')).toBe('');
    });

    it('يرجع رسالة رفض الإذن بالعربية', () => {
        expect(resolveCameraAccessMessage({ name: 'NotAllowedError' })).toContain('تم رفض إذن الكاميرا');
        expect(resolveCameraAccessMessage({ name: 'NotFoundError' })).toContain('لا توجد كاميرا');
        expect(resolveCameraAccessMessage({ name: 'TimeoutError' })).toContain('تأخر تشغيل الكاميرا');
    });

    it('يفضّل videoWidth ثم تخطيط العنصر ثم 640×480، ويحدّ الضلع الأطول بـ 1600', () => {
        expect(
            resolveScannerCaptureSize({ videoWidth: 1920, videoHeight: 1080, clientWidth: 300, clientHeight: 200 }),
        ).toEqual({ width: 1600, height: 900 });
        expect(
            resolveScannerCaptureSize({ videoWidth: 1280, videoHeight: 720, clientWidth: 300, clientHeight: 200 }),
        ).toEqual({ width: 1280, height: 720 });
        expect(
            resolveScannerCaptureSize({ videoWidth: 0, videoHeight: 0, clientWidth: 320, clientHeight: 240 }),
        ).toEqual({ width: 320, height: 240 });
        expect(
            resolveScannerCaptureSize({ videoWidth: 0, videoHeight: 0, clientWidth: 0, clientHeight: 0 }),
        ).toEqual({ width: 640, height: 480 });
    });

    it('يفك data URL إلى Blob دون fetch', () => {
        const blob = blobFromJpegDataUrl('data:image/jpeg;base64,QQ==');
        expect(blob.type).toBe('image/jpeg');
        expect(blob.size).toBeGreaterThan(0);
    });

    it('يستدعي خطاف E2E قبل getUserMedia إن وُجد', async () => {
        const stream = {
            id: 'hook',
            getTracks: () => [],
            getVideoTracks: () => [],
            getAudioTracks: () => [],
        } as unknown as MediaStream;
        (window as Window & { __hamiE2eCameraStream?: () => Promise<MediaStream> }).__hamiE2eCameraStream =
            async () => stream;
        await expect(requestScannerCameraStream()).resolves.toBe(stream);
    });

    it('ينشئ بثاً محلياً عند علم data-hami-e2e-camera', async () => {
        class FakeStream {}
        vi.stubGlobal('MediaStream', FakeStream);
        document.documentElement.setAttribute('data-hami-e2e-camera', '1');
        const stream = await requestScannerCameraStream();
        expect(stream).toBeInstanceOf(FakeStream);
    });

    it('يتجاهل علم الكاميرا خارج DEV/VITE_E2E', () => {
        vi.mocked(isViteE2eHooksEnabled).mockReturnValue(false);
        document.documentElement.setAttribute('data-hami-e2e-camera', '1');
        sessionStorage.setItem('hami:e2e-camera', '1');
        (window as Window & { __hamiE2eCamera?: boolean }).__hamiE2eCamera = true;
        expect(isE2eScannerCameraBypassEnabled()).toBe(false);
    });

    it('يملأ الكانفاس بلون الاحتياط إن الإطار غير جاهز', () => {
        const video = document.createElement('video');
        Object.defineProperty(video, 'readyState', { value: 0 });
        Object.defineProperty(video, 'videoWidth', { value: 0 });
        Object.defineProperty(video, 'videoHeight', { value: 0 });
        Object.defineProperty(video, 'clientWidth', { value: 320 });
        Object.defineProperty(video, 'clientHeight', { value: 240 });
        const canvas = document.createElement('canvas');
        const fillRect = vi.fn();
        const drawImage = vi.fn();
        vi.spyOn(canvas, 'getContext').mockReturnValue({
            fillRect,
            drawImage,
            fillStyle: '',
        } as unknown as CanvasRenderingContext2D);
        const size = paintScannerCaptureCanvas(video, canvas);
        expect(size).toEqual({ width: 320, height: 240 });
        expect(fillRect).toHaveBeenCalledWith(0, 0, 320, 240);
        expect(drawImage).not.toHaveBeenCalled();
    });

    it('يحرّر الكاميرا عند إخفاء الصفحة', () => {
        const onRelease = vi.fn();
        const unsub = subscribeScannerCameraBackgroundRelease(onRelease);
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(onRelease).toHaveBeenCalledTimes(1);
        unsub();
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
    });

    it('يحرّر الكاميرا عند pagehide', () => {
        const onRelease = vi.fn();
        const unsub = subscribeScannerCameraBackgroundRelease(onRelease);
        window.dispatchEvent(new Event('pagehide'));
        expect(onRelease).toHaveBeenCalledTimes(1);
        unsub();
    });
});
