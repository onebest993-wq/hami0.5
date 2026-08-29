import { isViteE2eHooksEnabled } from '@/app/utils/viteE2eHooks';
import { withMediaStreamTimeout } from '@/app/services/platform/mediaStreamTimeout';
import { subscribeCaptureBackgroundRelease } from '@/app/services/platform/mediaCaptureBackgroundRelease';

export function cameraErrorName(error: unknown): string {
    if (error && typeof error === 'object' && 'name' in error && typeof error.name === 'string') {
        return error.name;
    }
    return '';
}

export function resolveCameraAccessMessage(error: unknown): string {
    switch (cameraErrorName(error)) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
        case 'SecurityError':
            return 'تم رفض إذن الكاميرا. اسمح بالوصول ثم أعد المحاولة.';
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            return 'لا توجد كاميرا متاحة على هذا الجهاز حالياً.';
        case 'NotReadableError':
        case 'TrackStartError':
            return 'الكاميرا مشغولة أو غير متاحة الآن. أغلق أي تطبيق يستخدمها ثم أعد المحاولة.';
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
            return 'تعذر تشغيل الكاميرا بالإعدادات الحالية. يمكنك إعادة المحاولة.';
        case 'TimeoutError':
            return 'تأخر تشغيل الكاميرا. تحقق من الإذن ثم أعد المحاولة.';
        default:
            return 'تعذر الوصول إلى الكاميرا الآن. أعد المحاولة بعد التحقق من الأذونات والجهاز.';
    }
}

export type ScannerVideoMetrics = {
    videoWidth: number;
    videoHeight: number;
    clientWidth: number;
    clientHeight: number;
};

/** سقف الضلع الأطول — يقلّل تكلفة ترميز JPEG على عدسة 1080p */
export const SCANNER_CAPTURE_MAX_EDGE = 1_600;
export const SCANNER_JPEG_QUALITY = 0.8;

export function clampScannerCaptureSize(
    size: { width: number; height: number },
    maxEdge = SCANNER_CAPTURE_MAX_EDGE,
): { width: number; height: number } {
    const edge = Math.max(size.width, size.height);
    if (edge <= maxEdge) return size;
    const scale = maxEdge / edge;
    return {
        width: Math.max(1, Math.round(size.width * scale)),
        height: Math.max(1, Math.round(size.height * scale)),
    };
}

/** مقاس إطار الالتقاط — يفضّل videoWidth، ثم تخطيط العنصر، ثم 640×480 للبث المحاكى */
export function resolveScannerCaptureSize(video: ScannerVideoMetrics): { width: number; height: number } | null {
    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;
    if (!width || !height) return null;
    return clampScannerCaptureSize({ width, height });
}

/** يرسم إطار الفيديو على الكانفاس — إطار بيج إن البث لم يجهز */
export function paintScannerCaptureCanvas(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
): { width: number; height: number } | null {
    const size = resolveScannerCaptureSize(video);
    if (!size) return null;
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const canDrawFrame = video.readyState >= 2 && video.videoWidth > 0;
    if (canDrawFrame) {
        try {
            ctx.drawImage(video, 0, 0, size.width, size.height);
        } catch {
            ctx.fillStyle = '#F7F3EB';
            ctx.fillRect(0, 0, size.width, size.height);
        }
    } else {
        ctx.fillStyle = '#F7F3EB';
        ctx.fillRect(0, 0, size.width, size.height);
    }
    return size;
}

export function blobFromJpegDataUrl(dataUrl: string): Blob {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) throw new Error('invalid data url');
    const header = dataUrl.slice(0, comma);
    const payload = dataUrl.slice(comma + 1);
    const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/jpeg';
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

export function canvasToJpegBlob(
    canvas: HTMLCanvasElement,
    quality = SCANNER_JPEG_QUALITY,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const fallback = () => {
            try {
                resolve(blobFromJpegDataUrl(canvas.toDataURL('image/jpeg', quality)));
            } catch (error) {
                reject(error);
            }
        };
        if (typeof canvas.toBlob !== 'function') {
            fallback();
            return;
        }
        canvas.toBlob(
            (blob) => {
                if (blob && blob.size > 0) {
                    resolve(blob);
                    return;
                }
                fallback();
            },
            'image/jpeg',
            quality,
        );
    });
}

function e2eCameraStreamHook(): (() => Promise<MediaStream>) | undefined {
    if (!isViteE2eHooksEnabled() || typeof window === 'undefined') return undefined;
    const hook = (window as Window & { __hamiE2eCameraStream?: () => Promise<MediaStream> }).__hamiE2eCameraStream;
    return typeof hook === 'function' ? hook : undefined;
}

/** تجاوز الكاميرا لاختبارات E2E فقط — يُتجاهل في إنتاج بلا VITE_E2E/DEV */
export function isE2eScannerCameraBypassEnabled(): boolean {
    if (!isViteE2eHooksEnabled()) return false;
    try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hami:e2e-camera') === '1') {
            return true;
        }
    } catch {
        /* محظور */
    }
    if (typeof window !== 'undefined' && (window as Window & { __hamiE2eCamera?: boolean }).__hamiE2eCamera === true) {
        return true;
    }
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-hami-e2e-camera') === '1';
}

function createLocalE2eCameraStream(): MediaStream {
    if (typeof MediaStream !== 'function') {
        throw new Error('UNSUPPORTED_CAMERA_API');
    }
    return new MediaStream();
}

const CAMERA_STREAM_TIMEOUT_MS = 8_000;

export async function requestScannerCameraStream(): Promise<MediaStream> {
    if (isE2eScannerCameraBypassEnabled()) return createLocalE2eCameraStream();
    const e2eHook = e2eCameraStreamHook();
    if (e2eHook) return e2eHook();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('UNSUPPORTED_CAMERA_API');
    }

    try {
        return await withMediaStreamTimeout(
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            }),
            CAMERA_STREAM_TIMEOUT_MS,
            'CAMERA_TIMEOUT',
        );
    } catch (error) {
        const name = cameraErrorName(error);
        if (
            name === 'NotAllowedError' ||
            name === 'PermissionDeniedError' ||
            name === 'SecurityError' ||
            name === 'NotReadableError' ||
            name === 'TrackStartError' ||
            name === 'TimeoutError'
        ) {
            throw error;
        }

        return withMediaStreamTimeout(
            navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            }),
            CAMERA_STREAM_TIMEOUT_MS,
            'CAMERA_TIMEOUT',
        );
    }
}

/** يوقف الكاميرا عند إخفاء التطبيق — LED والخصوصية على الموبايل */
export function subscribeScannerCameraBackgroundRelease(onRelease: () => void): () => void {
    return subscribeCaptureBackgroundRelease(onRelease);
}
