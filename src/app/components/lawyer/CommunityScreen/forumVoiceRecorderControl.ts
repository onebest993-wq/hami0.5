export function stopMediaRecorderQuietly(recorder: MediaRecorder | null | undefined): void {
    if (!recorder || recorder.state === 'inactive') return;
    try {
        recorder.stop();
    } catch {
        /* ignore */
    }
}

export function stopMediaStreamTracks(stream: MediaStream | null | undefined): void {
    stream?.getTracks().forEach((track) => track.stop());
}

export function clearIntervalRef(ref: { current: ReturnType<typeof setInterval> | null }): void {
    if (!ref.current) return;
    clearInterval(ref.current);
    ref.current = null;
}

export function forumVoiceAttachmentMeta(mimeType: string | undefined): { mime: string; ext: string } {
    const mime = (mimeType || 'audio/webm').split(';')[0] || 'audio/webm';
    if (mime.includes('mp4') || mime.includes('m4a')) return { mime, ext: 'm4a' };
    if (mime.includes('ogg')) return { mime, ext: 'ogg' };
    return { mime, ext: 'webm' };
}
