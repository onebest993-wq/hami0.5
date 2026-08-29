import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

import { withMediaStreamTimeout } from './mediaStreamTimeout';
import { isMicrophoneAllowedByDocumentPolicy } from './queryMicrophonePermission';

export type { MicrophonePermissionStatus } from './queryMicrophonePermission';
export {
    queryMicrophonePermission,
    watchMicrophonePermission,
    isMicrophoneAllowedByDocumentPolicy,
} from './queryMicrophonePermission';

export type MicrophoneAccessErrorCode =
    | 'unsupported'
    | 'denied'
    | 'not-found'
    | 'timeout'
    | 'unknown';

function microphoneErrorName(err: unknown): string {
    if (err instanceof Error) return err.name;
    if (err && typeof err === 'object' && 'name' in err && typeof (err as { name: unknown }).name === 'string') {
        return (err as { name: string }).name;
    }
    return '';
}

export function resolveMicrophoneAccessMessage(
    err: unknown,
    code?: MicrophoneAccessErrorCode,
): string {
    const name = microphoneErrorName(err);
    const native = isCapacitorNativePlatform();

    if (code === 'unsupported' || name === 'NotSupportedError') {
        return 'التسجيل الصوتي غير مدعوم على هذا الجهاز';
    }
    if (code === 'denied' || name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return native
            ? 'يُرجى السماح بالوصول للمايكروفون من إعدادات التطبيق (الأذونات)'
            : 'يُرجى السماح بالمايكروفون من إعدادات المتصفح';
    }
    if (code === 'not-found' || name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return 'لم يُعثر على مايكروفون';
    }
    if (code === 'timeout' || name === 'TimeoutError') {
        return native
            ? 'تأخر تشغيل الميكروفون. تحقق من الإذن في إعدادات التطبيق ثم أعد المحاولة.'
            : 'تأخر تشغيل الميكروفون. تحقق من إذن المتصفح ثم أعد المحاولة.';
    }
    return 'تعذّر بدء التسجيل — تحقق من المايكروفون';
}

const MICROPHONE_STREAM_TIMEOUT_MS = 8_000;

/** طلب تدفق المايكروفون — WebView أصلي يحتاج RECORD_AUDIO في AndroidManifest */
export async function requestMicrophoneStream(): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new DOMException('Not supported', 'NotSupportedError'), {
            hamiCode: 'unsupported' as MicrophoneAccessErrorCode,
        });
    }

    if (!isMicrophoneAllowedByDocumentPolicy()) {
        throw Object.assign(new DOMException('Not allowed', 'NotAllowedError'), {
            hamiCode: 'denied' as MicrophoneAccessErrorCode,
        });
    }

    try {
        return await withMediaStreamTimeout(
            navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
            }),
            MICROPHONE_STREAM_TIMEOUT_MS,
            'MICROPHONE_TIMEOUT',
        );
    } catch (err) {
        const name = microphoneErrorName(err);
        let code: MicrophoneAccessErrorCode = 'unknown';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') code = 'denied';
        else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') code = 'not-found';
        else if (name === 'NotSupportedError') code = 'unsupported';
        else if (name === 'TimeoutError') code = 'timeout';
        throw Object.assign(err instanceof Error ? err : new Error(String(err)), { hamiCode: code });
    }
}
