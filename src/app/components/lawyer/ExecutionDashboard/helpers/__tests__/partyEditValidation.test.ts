import { describe, expect, it } from 'vitest';
import { validatePartyEditDraft } from '../partyEditValidation';

describe('validatePartyEditDraft', () => {
    it('requires a name when editing base party fields', () => {
        expect(validatePartyEditDraft({ name: '  ', phone: '' })).toEqual({
            ok: false,
            message: 'الاسم مطلوب قبل الحفظ',
        });
    });

    it('accepts a valid base draft', () => {
        expect(validatePartyEditDraft({ name: 'دائن', phone: '07701234567' }).ok).toBe(true);
    });

    it('rejects short phone when provided', () => {
        expect(validatePartyEditDraft({ name: 'دائن', phone: '123' }).ok).toBe(false);
    });

    it('rejects oversized name / address', () => {
        expect(validatePartyEditDraft({ name: 'ن'.repeat(121) }).ok).toBe(false);
        expect(
            validatePartyEditDraft({ name: 'دائن', address: 'ع'.repeat(401) }).ok,
        ).toBe(false);
    });

    it('requires at least one named heir in heirs-only mode', () => {
        expect(
            validatePartyEditDraft({
                heirsOnlyEdit: true,
                heirs: [{ name: '  ' }, { name: '' }],
            }).ok,
        ).toBe(false);
        expect(
            validatePartyEditDraft({
                heirsOnlyEdit: true,
                heirs: [{ name: 'وارث' }],
            }).ok,
        ).toBe(true);
    });
});
