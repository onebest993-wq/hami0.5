/** ملاحظة صوتية — body يحمل data URL أو blob:audio أو hami-voice-ref: */
export function isVoiceNoteBody(body?: string | null): boolean {
    const value = body?.trim();
    if (!value) return false;
    if (value.startsWith('hami-voice-ref:')) return true;
    return value.startsWith('data:audio') || value.startsWith('blob:audio');
}

export function isVoiceNote(note: {
    body?: string | null;
    text?: string | null;
    type?: string | null;
}): boolean {
    if (note.type === 'voice') return true;
    return isVoiceNoteBody(note.body ?? note.text);
}
