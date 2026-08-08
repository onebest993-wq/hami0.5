import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

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
    | 'unknown';

export function resolveMicrophoneAccessMessage(
    err: unknown,
    code?: MicrophoneAccessErrorCode,
): string {
    const name = err instanceof DOMException ? err.name : '';
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
    return 'تعذّر بدء التسجيل — تحقق من المايكروفون';
}

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
        return await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
        });
    } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        let code: MicrophoneAccessErrorCode = 'unknown';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') code = 'denied';
        else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') code = 'not-found';
        else if (name === 'NotSupportedError') code = 'unsupported';
        throw Object.assign(err instanceof Error ? err : new Error(String(err)), { hamiCode: code });
    }
}
