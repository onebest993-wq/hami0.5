import { encodeVoiceNoteRef } from './voiceNoteCodec';
import { putVoiceBlob } from './voiceNoteStorage';

export const MAX_VOICE_DURATION_SEC = 180;
export const MIN_VOICE_DURATION_SEC = 1;
export const MAX_VOICE_BLOB_BYTES = 4 * 1024 * 1024;

export function formatVoiceDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function isVoiceBlobWithinLimit(bytes: number): boolean {
    return bytes > 0 && bytes <= MAX_VOICE_BLOB_BYTES;
}

export function isVoiceDurationValid(seconds: number): boolean {
    return seconds >= MIN_VOICE_DURATION_SEC && seconds <= MAX_VOICE_DURATION_SEC;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') resolve(result);
            else reject(new Error('Invalid read result'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('read failed'));
        reader.readAsDataURL(blob);
    });
}

/** fallback للأجهزة القديمة — data URL مباشر */
export async function persistVoiceRecording(
    noteId: string | number,
    blob: Blob,
): Promise<{ body: string; usedIndexedDb: boolean }> {
    const id = String(noteId);
    if (blob.size <= MAX_VOICE_BLOB_BYTES) {
        try {
            await putVoiceBlob(id, blob);
            return { body: encodeVoiceNoteRef(id), usedIndexedDb: true };
        } catch {
            /* fallback below */
        }
    }
    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.length > MAX_VOICE_BLOB_BYTES * 1.4) {
        throw new Error('VOICE_TOO_LARGE');
    }
    return { body: dataUrl, usedIndexedDb: false };
}
