import type { DossierKind } from '@/app/services/repository/repositoryDossierRegistry';

export const DOSSIER_NOTES_CHANGED = 'hami:dossier-notes-changed';

export type DossierNotesChangedDetail = {
    dossierId: string;
    dossierKind: DossierKind;
    noteId?: string;
};

export function emitDossierNotesChanged(detail: DossierNotesChangedDetail): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(DOSSIER_NOTES_CHANGED, { detail }));
}
