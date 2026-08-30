/** يحتفظ بتدفق المايكروفون المُسبَق بين نقرة المستخدم وفتح المسجّل */
import { subscribeCaptureBackgroundRelease } from '@/app/services/platform/mediaCaptureBackgroundRelease';

let pendingMicrophoneStream: MediaStream | null = null;
let pendingBackgroundUnsub: (() => void) | undefined;

function disarmPendingBackgroundRelease(): void {
    pendingBackgroundUnsub?.();
    pendingBackgroundUnsub = undefined;
}

function stopStreamTracks(stream: MediaStream | null): void {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
        try {
            track.stop();
        } catch {
            /* ignore */
        }
    });
}

function releasePendingStream(): void {
    const held = pendingMicrophoneStream;
    pendingMicrophoneStream = null;
    disarmPendingBackgroundRelease();
    stopStreamTracks(held);
}

export function setPendingMicrophoneStream(stream: MediaStream | null): void {
    if (pendingMicrophoneStream && pendingMicrophoneStream !== stream) {
        stopStreamTracks(pendingMicrophoneStream);
    }
    disarmPendingBackgroundRelease();
    pendingMicrophoneStream = stream;
    if (!stream || typeof document === 'undefined') return;

    const held = stream;
    const unsub = subscribeCaptureBackgroundRelease(() => {
        if (pendingMicrophoneStream !== held) return;
        releasePendingStream();
    });
    /* إن أطلق التحرير متزامناً (التطبيق مخفى أصلاً) لا نُسند مُلغياً فوق حالة فارغة */
    if (pendingMicrophoneStream === held) {
        pendingBackgroundUnsub = unsub;
    }
}

export function consumePendingMicrophoneStream(): MediaStream | null {
    disarmPendingBackgroundRelease();
    const stream = pendingMicrophoneStream;
    pendingMicrophoneStream = null;
    return stream;
}

export function clearPendingMicrophoneStream(): void {
    releasePendingStream();
}

export function hasLiveMicrophoneStream(stream: MediaStream | null | undefined): boolean {
    if (!stream) return false;
    const getAudioTracks = stream.getAudioTracks;
    if (typeof getAudioTracks !== 'function') return false;
    try {
        return getAudioTracks.call(stream).some((track) => track.readyState === 'live');
    } catch {
        return false;
    }
}
