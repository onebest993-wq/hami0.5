import { describe, expect, it } from 'vitest';
import {
    appendNoteToExecutionFile,
    appendNoteToLawsuitFile,
    deleteExecutionDossierNote,
    deleteLawsuitDossierNote,
    globalNoteToDossierPayload,
} from '../repositoryDossierNoteSync';

describe('repositoryDossierNoteSync append/revert', () => {
    it('يرجع معرّف الملاحظة المضافة ويُلغى الإلحاق عند التراجع', () => {
        const file = { id: 7, notes: [{ id: 'old', text: 'سابق' }] } as never;
        const appended = appendNoteToLawsuitFile(file, { title: 'عنوان', body: '<p>نص</p>' });
        expect(String(appended.file.notes?.[0]?.id)).toBe(appended.noteId);
        expect(appended.file.notes).toHaveLength(2);
        const reverted = deleteLawsuitDossierNote(appended.file, appended.noteId);
        expect(reverted.notes).toHaveLength(1);
        expect(reverted.notes?.[0]?.id).toBe('old');
    });

    it('يرجع ملاحظة التنفيذ ويُلغيها بـ trashedAt', () => {
        const file = { id: 8, caseNotesLog: [] } as never;
        const appended = appendNoteToExecutionFile(file, { title: 'ت', body: 'ب' });
        expect(appended.noteId.startsWith('repo_')).toBe(true);
        const reverted = deleteExecutionDossierNote(appended.file, appended.noteId);
        const row = (reverted.caseNotesLog as Array<{ id?: string; trashedAt?: string }>)[0];
        expect(row?.id).toBe(appended.noteId);
        expect(row?.trashedAt).toBeTruthy();
    });

    it('يُسطّح HTML في الحمولة عبر stripRepositoryHtml', () => {
        const payload = globalNoteToDossierPayload({
            id: 'n1',
            title: '  ',
            body: '',
            isPinned: true,
        });
        expect(payload.title).toBe('ملاحظة من المستودع');
        expect(payload.isPinned).toBe(true);
        const fromHtml = globalNoteToDossierPayload({
            id: 'n2',
            title: '',
            body: '',
            isPinned: false,
        });
        expect(fromHtml.body).toBe('');
    });
});
