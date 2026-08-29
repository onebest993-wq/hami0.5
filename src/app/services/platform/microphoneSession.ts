/** يحتفظ بتدفق المايكروفون المُسبَق بين نقرة المستخدم وفتح المسجّل */
import { subscribeCaptureBackgroundRelease } from '@/app/services/platform/mediaCaptureBackgroundRelease';

let pendingMicrophoneStream: MediaStream | null = null;
let pendingBackgroundUnsub: (() => void) | undefined;

function disarmPendingBackgroundRelease(): void {
    pendingBackgroundUnsub?.();
    pendingBackgroundUnsub = undefined;
}

export function setPendingMicrophoneStream(stream: MediaStream | null): void {
    if (pendingMicrophoneStream && pendingMicrophoneStream !== stream) {
        pendingMicrophoneStream.getTracks().forEach((track) => track.stop());
    }
    pendingMicrophoneStream = stream;
    disarmPendingBackgroundRelease();
    if (!stream || typeof document === 'undefined') return;
    pendingBackgroundUnsub = subscribeCaptureBackgroundRelease(() => {
        clearPendingMicrophoneStream();
    });
}

export function consumePendingMicrophoneStream(): MediaStream | null {
    disarmPendingBackgroundRelease();
    const stream = pendingMicrophoneStream;
    pendingMicrophoneStream = null;
    return stream;
}

export function clearPendingMicrophoneStream(): void {
    setPendingMicrophoneStream(null);
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
