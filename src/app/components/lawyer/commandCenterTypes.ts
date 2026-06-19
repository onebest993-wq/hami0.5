type NoteType = 'text' | 'voice' | 'schedule';

export interface CommandCenterNote {
    id: number;
    content: string;
    type: NoteType;
    date: Date;
}
