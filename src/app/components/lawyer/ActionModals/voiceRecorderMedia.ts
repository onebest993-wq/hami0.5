export function pickRecorderMimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
        return undefined;
    }
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const candidate of candidates) {
        if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    }
    return undefined;
}

export function createMediaRecorder(stream: MediaStream): MediaRecorder {
    const mimeType = pickRecorderMimeType();
    if (mimeType) {
        try {
            return new MediaRecorder(stream, { mimeType });
        } catch {
            /* fallback below */
        }
    }
    return new MediaRecorder(stream);
}
