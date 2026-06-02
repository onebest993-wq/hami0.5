export type NoteType = 'text' | 'voice' | 'image' | 'schedule';

export interface CommandCenterNote {
    id: number;
    content: string;
    type: NoteType;
    date: Date;
}
