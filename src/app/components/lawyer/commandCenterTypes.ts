type NoteType = 'text' | 'voice' | 'schedule';

export type VoiceNoteSavePayload = {
    blob: Blob;
    durationSeconds: number;
    transcript?: string;
};

export interface CommandCenterNote {
    id: number;
    content: string;
    type: NoteType;
    date: Date;
    transcript?: string;
    durationSeconds?: number;
}
