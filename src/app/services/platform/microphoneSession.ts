/** يحتفظ بتدفق المايكروفون المُسبَق بين نقرة المستخدم وفتح المسجّل */
let pendingMicrophoneStream: MediaStream | null = null;

export function setPendingMicrophoneStream(stream: MediaStream | null): void {
    if (pendingMicrophoneStream && pendingMicrophoneStream !== stream) {
        pendingMicrophoneStream.getTracks().forEach((track) => track.stop());
    }
    pendingMicrophoneStream = stream;
}

export function consumePendingMicrophoneStream(): MediaStream | null {
    const stream = pendingMicrophoneStream;
    pendingMicrophoneStream = null;
    return stream;
}

export function clearPendingMicrophoneStream(): void {
    setPendingMicrophoneStream(null);
}

export function hasLiveMicrophoneStream(stream: MediaStream | null | undefined): boolean {
    return Boolean(stream?.getAudioTracks().some((track) => track.readyState === 'live'));
}
