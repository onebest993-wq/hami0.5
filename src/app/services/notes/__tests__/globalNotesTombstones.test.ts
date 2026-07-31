import { describe, expect, it, beforeEach } from 'vitest';
import {
    areAllStoredNotesTombstoned,
    filterDeletedGlobalNotes,
    markGlobalNoteDeleted,
    resetGlobalNotesTombstonesForTests,
} from '@/app/services/notes/globalNotesTombstones';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';

describe('globalNotesTombstones', () => {
    beforeEach(() => {
        resetGlobalNotesTombstonesForTests();
    });

    it('filters deleted note ids after mark', () => {
        markGlobalNoteDeleted('lawyer-1', 'note_1');
        const next = filterDeletedGlobalNotes(
            [{ id: 'note_1' }, { id: 'note_2' }],
            'lawyer-1',
        );
        expect(next.map((n) => n.id)).toEqual(['note_2']);
    });

    it('allows empty lawyer_notes wipe when all remaining ids are tombstoned', () => {
        markGlobalNoteDeleted('lawyer-1', 'note_1');
        const existing = JSON.stringify([{ id: 'note_1', body: 'x' }]);
        expect(areAllStoredNotesTombstoned(existing, 'lawyer-1')).toBe(true);
        expect(shouldRejectDossierWipe('lawyer_notes', '[]', existing)).toBe(false);
    });

    it('still rejects empty wipe when undeleted notes remain on disk', () => {
        const existing = JSON.stringify([{ id: 'note_alive', body: 'x' }]);
        expect(shouldRejectDossierWipe('lawyer_notes', '[]', existing)).toBe(true);
    });
});
