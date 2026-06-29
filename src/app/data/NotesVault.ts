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
    private scopedUserId: string | null = null;

    constructor() {
        this.load();
    }

    /** عزل الملاحظات حسب المستخدم المسجّل */
    setUserScope(userId: string | null): void {
        const nextKey = userId ? `hami_notes_vault_${userId}` : 'hami_notes_vault';
        if (nextKey === this.storageKey && userId === this.scopedUserId) return;
        this.scopedUserId = userId;
        this.storageKey = nextKey;
        this.load();
        if (userId) this.migrateLegacyIfEmpty();
    }

    /** نقل ملاحظات المفتاح القديم غير المقيّد إلى حساب المستخدم الحالي */
    migrateLegacyIfEmpty(): void {
        if (this.notes.length > 0) return;
        try {
            const legacy = SecureStoreService.getItemSync('hami_notes_vault');
            if (!legacy) return;
            const parsed: unknown = JSON.parse(legacy);
            if (!Array.isArray(parsed) || parsed.length === 0) return;
            this.notes = parsed.map((n: Record<string, unknown>) => ({
                id: String(n.id ?? Date.now()),
                content: typeof n.content === 'string' ? n.content : String(n.content ?? ''),
                type: n.type === 'voice' ? 'voice' as const : 'text' as const,
                createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
                tags: Array.isArray(n.tags) ? (n.tags as string[]) : undefined,
                linkedCaseId: typeof n.linkedCaseId === 'string' ? n.linkedCaseId : undefined,
            }));
            this.save();
        } catch {
            // ignore corrupt legacy bucket
        }
    }

    replaceAll(notes: Note[]): void {
        this.notes = notes;
        this.save();
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

    syncFromGlobal(_userId: string, note: { id: string | number; body: string; type?: string }, isNew: boolean, vaultId?: string): string {
        const body = (note.body || '').trim();
        if (!body) return vaultId || '';

        if (vaultId) {
            this.updateNote(vaultId, {
                content: body,
            });
            return vaultId;
        }

        if (!isNew) {
            const existing = this.notes.find((n) => n.id === `g_${String(note.id)}`);
            if (existing) {
                this.updateNote(existing.id, { content: body });
                return existing.id;
            }
        }

        const created = this.addNote(body, note.type === 'voice' ? 'voice' : 'text');
        return created.id;
    }
}

export const notesVault = new NotesVaultService();
