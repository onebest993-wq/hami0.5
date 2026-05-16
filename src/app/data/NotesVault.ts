import SecureStoreService from '@/app/services/SecureStoreService';

export interface Note {
    id: string;
    content: string;
    type: 'text' | 'voice';
    createdAt: number;
    tags?: string[];
    linkedCaseId?: string; // Optional linkage to a case
}

class NotesVaultService {
    private storageKey = 'hami_notes_vault';
    private notes: Note[] = [];

    constructor() {
        this.load();
    }

    private load() {
        try {
            const stored = SecureStoreService.getItemSync(this.storageKey);
            if (stored) {
                const parsed: unknown = JSON.parse(stored);
                if (!Array.isArray(parsed)) {
                    this.notes = [];
                    return;
                }
                // Sanitize: ensure content is always a string to recover from bad data
                this.notes = parsed.map((n: any) => ({
                    ...n,
                    content: typeof n.content === 'object' && n.content !== null && 'content' in n.content 
                        ? n.content.content // Recover nested content if possible
                        : typeof n.content === 'string' 
                            ? n.content 
                            : String(n.content || '')
                }));
            }
        } catch (e) {
            console.error("Failed to load notes vault", e);
        }
    }

    private save() {
        try {
            SecureStoreService.setItemSync(this.storageKey, JSON.stringify(this.notes));
        } catch (e) {
            console.error("Failed to save notes vault", e);
        }
    }

    addNote(content: string, type: 'text' | 'voice' = 'text', linkedCaseId?: string): Note {
        const newNote: Note = {
            id: Date.now().toString(),
            content,
            type,
            createdAt: Date.now(),
            linkedCaseId
        };
        this.notes.unshift(newNote); // Add to top
        this.save();
        return newNote;
    }

    getNotes(): Note[] {
        return this.notes;
    }

    searchNotes(query: string): Note[] {
        const q = query.toLowerCase();
        return this.notes.filter(n => String(n.content || '').toLowerCase().includes(q));
    }

    deleteNote(id: string) {
        this.notes = this.notes.filter(n => n.id !== id);
        this.save();
    }

    updateNote(id: string, updates: Partial<Pick<Note, 'content' | 'tags' | 'linkedCaseId'>>): void {
        const idx = this.notes.findIndex(n => n.id === id);
        if (idx === -1) return;
        this.notes[idx] = { ...this.notes[idx], ...updates };
        this.save();
    }
}

export const notesVault = new NotesVaultService();
