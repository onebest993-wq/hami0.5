import type { VoiceNoteSavePayload } from '@/app/components/lawyer/commandCenterTypes';
import { voiceNoteTitleFromMeta } from '@/app/services/voice/voiceNoteCodec';
import {
    isVoiceBlobWithinLimit,
    isVoiceDurationValid,
    persistVoiceRecording,
} from '@/app/services/voice/voiceRecordingLimits';
import { deleteVoiceBlob } from '@/app/services/voice/voiceNoteStorage';

export type TaskVoiceFields = {
    voiceRef: string | null;
    voiceTranscript: string | null;
    voiceDurationSec: number | null;
};

export function taskVoiceStorageKey(taskId: string): string {
    return `task-voice-${taskId}`;
}

export function parseTaskVoiceStorageKey(voiceRef: string | null | undefined): string | null {
    if (!voiceRef) return null;
    const prefix = 'hami-voice-ref:';
    if (!voiceRef.startsWith(prefix)) return null;
    const key = voiceRef.slice(prefix.length).trim();
    return key.startsWith('task-voice-') ? key : null;
}

export function titleFromVoicePayload(payload: VoiceNoteSavePayload, fallbackText?: string): string {
    const transcript = payload.transcript?.trim();
    if (transcript) return transcript.length > 200 ? `${transcript.slice(0, 197)}…` : transcript;
    const fb = fallbackText?.trim();
    if (fb) return fb;
    return voiceNoteTitleFromMeta({
        durationSec: payload.durationSeconds,
        fallback: 'مهمة صوتية',
    });
}

export async function persistTaskVoiceAttachment(
    taskId: string,
    payload: VoiceNoteSavePayload,
): Promise<TaskVoiceFields | null> {
    if (!isVoiceDurationValid(payload.durationSeconds)) return null;
    if (!isVoiceBlobWithinLimit(payload.blob.size)) return null;

    const storageKey = taskVoiceStorageKey(taskId);
    try {
        const { body: voiceRef } = await persistVoiceRecording(storageKey, payload.blob);
        return {
            voiceRef,
            voiceTranscript: payload.transcript?.trim() || null,
            voiceDurationSec: payload.durationSeconds,
        };
    } catch {
        return null;
    }
}

export async function removeTaskVoiceAttachment(voiceRef: string | null | undefined): Promise<void> {
    const key = parseTaskVoiceStorageKey(voiceRef);
    if (!key) return;
    await deleteVoiceBlob(key);
}
