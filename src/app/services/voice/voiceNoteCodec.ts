/** مرجع خفيف في lawyer_notes — الصوت في IndexedDB */
export const VOICE_NOTE_REF_PREFIX = 'hami-voice-ref:';

export type VoiceNoteMeta = {
    ref: string;
    transcript?: string;
    durationSec?: number;
};

export function encodeVoiceNoteRef(noteId: string | number): string {
    return `${VOICE_NOTE_REF_PREFIX}${noteId}`;
}

export function parseVoiceNoteRef(body?: string | null): string | null {
    const value = body?.trim();
    if (!value?.startsWith(VOICE_NOTE_REF_PREFIX)) return null;
    const id = value.slice(VOICE_NOTE_REF_PREFIX.length).trim();
    return id || null;
}

export function isVoiceNoteRef(body?: string | null): boolean {
    return parseVoiceNoteRef(body) != null;
}

export function voiceNoteTitleFromMeta(meta: {
    transcript?: string;
    durationSec?: number;
    fallback?: string;
}): string {
    const t = meta.transcript?.trim();
    if (t) return t.length > 80 ? `${t.slice(0, 77)}…` : t;
    if (meta.durationSec != null && meta.durationSec > 0) {
        const m = Math.floor(meta.durationSec / 60);
        const s = meta.durationSec % 60;
        return m > 0 ? `تسجيل صوتي (${m}:${s.toString().padStart(2, '0')})` : `تسجيل صوتي (${s}ث)`;
    }
    return meta.fallback ?? 'تسجيل صوتي';
}
