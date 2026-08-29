import { SmartToast } from '@/app/components/ui/SmartToast';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import { voiceNoteTitleFromMeta } from '@/app/services/voice/voiceNoteCodec';
import {
    isVoiceBlobWithinLimit,
    isVoiceDurationValid,
    persistVoiceRecording,
} from '@/app/services/voice/voiceRecordingLimits';
import { createQuickNoteId, quickNoteTitle } from './quickNoteUtils';

export type NotepadVoicePayload = {
    blob: Blob;
    durationSeconds: number;
    transcript?: string;
};

export async function saveVoiceNoteToNotepad(
    payload: NotepadVoicePayload,
    opts: {
        userId?: string;
        saveNote: (note: GlobalNote) => void | Promise<void>;
    },
): Promise<string | number | null> {
    if (!hasLocalAppSession(opts.userId)) {
        SmartToast.error('يرجى تسجيل الدخول أولاً لاستخدام التسجيل الصوتي');
        return null;
    }
    if (!isVoiceDurationValid(payload.durationSeconds)) {
        SmartToast.error('التسجيل قصير جداً أو تجاوز 3 دقائق');
        return null;
    }
    if (!isVoiceBlobWithinLimit(payload.blob.size)) {
        SmartToast.error('حجم التسجيل غير مدعوم');
        return null;
    }

    const noteId = createQuickNoteId();
    try {
        const { body } = await persistVoiceRecording(noteId, payload.blob);
        const transcript = payload.transcript?.trim();
        const title = voiceNoteTitleFromMeta({
            transcript,
            durationSec: payload.durationSeconds,
            fallback: quickNoteTitle('voice'),
        });

        await opts.saveNote({
            id: noteId,
            title,
            body,
            isPinned: false,
            date: new Date().toISOString(),
            type: 'voice',
            transcript: transcript || undefined,
            voiceDurationSec: payload.durationSeconds,
        });

        SmartToast.success(
            transcript ? 'تم حفظ التسجيل والنص في المفكرة 🎙️' : 'تم حفظ التسجيل في المفكرة 🎙️',
        );
        return noteId;
    } catch {
        SmartToast.error('تعذّر حفظ التسجيل — حجم كبير أو مساحة غير كافية');
        return null;
    }
}
