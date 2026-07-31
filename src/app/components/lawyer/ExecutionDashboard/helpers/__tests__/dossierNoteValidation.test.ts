import { describe, expect, it } from 'vitest';
import { validateDossierNoteDraft } from '../dossierNoteValidation';

describe('validateDossierNoteDraft', () => {
    it('requires title and body', () => {
        expect(validateDossierNoteDraft({ title: '', bodyHtml: 'x' }).ok).toBe(false);
        expect(validateDossierNoteDraft({ title: 'ت', bodyHtml: '  ' }).ok).toBe(false);
    });

    it('accepts a valid note', () => {
        const r = validateDossierNoteDraft({ title: 'ملاحظة', bodyHtml: 'تفاصيل' });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.title).toBe('ملاحظة');
            expect(r.body).toBe('تفاصيل');
        }
    });

    it('rejects oversized title / body', () => {
        expect(validateDossierNoteDraft({ title: 'ن'.repeat(161), bodyHtml: 'ت' }).ok).toBe(false);
        expect(validateDossierNoteDraft({ title: 'ن', bodyHtml: 'ت'.repeat(8001) }).ok).toBe(false);
    });
});
