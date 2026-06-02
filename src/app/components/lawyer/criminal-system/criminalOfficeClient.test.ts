import { describe, expect, it } from 'vitest';
import type { CriminalCaseDraft } from './criminalStore';
import {
    applyComplainantOfficeClientToggle,
    applyDefendantOfficeClientToggle,
    deriveOurRepresentationFromOfficeClients,
    resolveComplainantOfficeClientMark,
    resolveDefendantOfficeClientMark,
} from './criminalOfficeClient';
import { makeUnknownIdentityDefendant } from './criminalUnknownDefendant';

function baseDraft(): CriminalCaseDraft {
    return {
        basics: {
            role: '',
            ourRepresentation: '',
            stage: 'مرحلة التحقيق',
            legalArticle: '',
            crimeType: 'جنحة',
        },
        location: {} as CriminalCaseDraft['location'],
        complainants: [
            { id: 'c1', fullName: 'مشتكي', address: '', phone: '' },
            { id: 'c2', fullName: 'مشتكي 2', address: '', phone: '' },
        ],
        defendants: [
            {
                id: 'd1',
                fullName: 'متهم',
                address: '',
                birthYear: '',
                status: '',
                detentionAuthority: '',
                detentionExpiryDate: '',
                detentionHistoryLog: [],
                totalDetentionDays: 0,
            },
        ],
        unknownDefendant: false,
    } as CriminalCaseDraft;
}

describe('criminalOfficeClient', () => {
    it('derives complainant-side representation from office client flags', () => {
        const draft = applyComplainantOfficeClientToggle(baseDraft(), 'c1', true);
        expect(deriveOurRepresentationFromOfficeClients(draft.complainants, draft.defendants)).toBe(
            'complainant_side',
        );
        expect(draft.basics.ourRepresentation).toBe('complainant_side');
    });

    it('allows multiple office clients on the same side', () => {
        let draft = applyComplainantOfficeClientToggle(baseDraft(), 'c1', true);
        draft = applyComplainantOfficeClientToggle(draft, 'c2', true);
        expect(draft.complainants.filter((c) => c.isOfficeClient)).toHaveLength(2);
        expect(draft.basics.ourRepresentation).toBe('complainant_side');
    });

    it('clears opposite side when marking defendant as office client', () => {
        let draft = applyComplainantOfficeClientToggle(baseDraft(), 'c1', true);
        draft = applyDefendantOfficeClientToggle(draft, 'd1', true);
        expect(draft.complainants.every((c) => !c.isOfficeClient)).toBe(true);
        expect(draft.defendants.find((d) => d.id === 'd1')?.isOfficeClient).toBe(true);
        expect(draft.basics.ourRepresentation).toBe('defendant_side');
    });

    it('blocks office client flag on unknown defendants', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const draft = {
            ...baseDraft(),
            defendants: [unknown],
            unknownDefendant: true,
        } as CriminalCaseDraft;
        const next = applyDefendantOfficeClientToggle(draft, unknown.id, true);
        expect(next.defendants[0]?.isOfficeClient).not.toBe(true);
        expect(next.basics.ourRepresentation).toBe('');
    });

    it('resolves office client mark from explicit flag or legacy representation', () => {
        const complainant = { id: 'c1', fullName: 'مشتكي', address: '', phone: '' };
        const defendant = {
            id: 'd1',
            fullName: 'متهم',
            address: '',
            birthYear: '',
            status: '',
            detentionAuthority: '',
            detentionExpiryDate: '',
            detentionHistoryLog: [],
            totalDetentionDays: 0,
        };
        expect(resolveComplainantOfficeClientMark({ ...complainant, isOfficeClient: true })).toBe(true);
        expect(resolveComplainantOfficeClientMark(complainant, 'complainant_side')).toBe(true);
        expect(resolveComplainantOfficeClientMark(complainant, 'defendant_side')).toBe(false);
        expect(resolveDefendantOfficeClientMark({ ...defendant, isOfficeClient: true })).toBe(true);
        expect(resolveDefendantOfficeClientMark(defendant, 'defendant_side')).toBe(true);
        expect(resolveDefendantOfficeClientMark(defendant, 'complainant_side')).toBe(false);
    });
});
