import type { GuarantorBailKind, GuarantorPerson } from '../criminalStore';

export type PartyDetentionDraft = {
    startDate: string;
    endDate: string;
};

export type PartyBailDraft = {
    kind: GuarantorBailKind | '';
    bailAmount: string;
    guarantors: GuarantorPerson[];
};

export function emptyPartyBailDraft(): PartyBailDraft {
    return { kind: 'financial', bailAmount: '', guarantors: [] };
}

export function isPartyBailDraftValid(draft: PartyBailDraft | undefined): boolean {
    if (!draft || (draft.kind !== 'financial' && draft.kind !== 'personal')) return false;
    if (draft.kind === 'financial') return draft.bailAmount.trim().length > 0;
    return draft.guarantors.some((g) => String(g.fullName ?? '').trim().length > 0);
}
