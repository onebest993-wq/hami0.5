// @ts-nocheck
import type { CriminalCaseDraft, CriminalComplainant, CriminalDefendant, OurRepresentation } from './criminalStore';
import { legacyRoleFromRepresentation } from './criminalStageUtils';
import { isDefendantIdentityUnknown, pruneEmptyDefendantShells } from './criminalUnknownDefendant';
import { makeEmptyDefendant } from './criminalDefendantFactory';

export function hasComplainantOfficeClient(complainants: CriminalComplainant[] | undefined): boolean {
    return (Array.isArray(complainants) ? complainants : []).some((c) => c.isOfficeClient === true);
}

export function hasDefendantOfficeClient(defendants: CriminalDefendant[] | undefined): boolean {
    return (Array.isArray(defendants) ? defendants : []).some(
        (d) => d.isOfficeClient === true && !isDefendantIdentityUnknown(d),
    );
}

export function deriveOurRepresentationFromOfficeClients(
    complainants: CriminalComplainant[] | undefined,
    defendants: CriminalDefendant[] | undefined,
): OurRepresentation | '' {
    const complainantSide = hasComplainantOfficeClient(complainants);
    const defendantSide = hasDefendantOfficeClient(defendants);
    if (complainantSide && !defendantSide) return 'complainant_side';
    if (defendantSide && !complainantSide) return 'defendant_side';
    return '';
}

/** يُزامِن ourRepresentation مع أعلام «موكل» على الأطراف. */
export function syncDraftOfficeRepresentation(draft: CriminalCaseDraft): CriminalCaseDraft {
    const complainants = (Array.isArray(draft.complainants) ? draft.complainants : []).map((c) => ({ ...c }));
    let defendants = (Array.isArray(draft.defendants) ? draft.defendants : []).map((d) => ({
        ...d,
        isOfficeClient: isDefendantIdentityUnknown(d) ? false : d.isOfficeClient,
    }));

    const rep = deriveOurRepresentationFromOfficeClients(complainants, defendants);
    let unknownDefendant = draft.unknownDefendant;

    if (rep === 'defendant_side' && defendants.some((d) => isDefendantIdentityUnknown(d))) {
        defendants = pruneEmptyDefendantShells(defendants.filter((d) => !isDefendantIdentityUnknown(d)));
        if (!defendants.length) defendants = [makeEmptyDefendant()];
        unknownDefendant = false;
    }

    return {
        ...draft,
        complainants,
        defendants,
        unknownDefendant,
        basics: {
            ...draft.basics,
            ourRepresentation: rep,
            role: legacyRoleFromRepresentation(rep),
        },
    };
}

export function applyComplainantOfficeClientToggle(
    draft: CriminalCaseDraft,
    complainantId: string,
    next: boolean,
): CriminalCaseDraft {
    const id = String(complainantId ?? '').trim();
    let complainants = (Array.isArray(draft.complainants) ? draft.complainants : []).map((c) => {
        if (c.id !== id) return c;
        return { ...c, isOfficeClient: next };
    });
    let defendants = Array.isArray(draft.defendants) ? draft.defendants : [];

    if (next) {
        defendants = defendants.map((d) => ({ ...d, isOfficeClient: false }));
    }

    return syncDraftOfficeRepresentation({ ...draft, complainants, defendants });
}

export function applyDefendantOfficeClientToggle(
    draft: CriminalCaseDraft,
    defendantId: string,
    next: boolean,
): CriminalCaseDraft {
    const id = String(defendantId ?? '').trim();
    const target = (Array.isArray(draft.defendants) ? draft.defendants : []).find((d) => d.id === id);
    if (!target || isDefendantIdentityUnknown(target)) return draft;

    let defendants = (Array.isArray(draft.defendants) ? draft.defendants : []).map((d) => {
        if (d.id !== id) return d;
        return { ...d, isOfficeClient: next };
    });
    let complainants = Array.isArray(draft.complainants) ? draft.complainants : [];

    if (next) {
        complainants = complainants.map((c) => ({ ...c, isOfficeClient: false }));
    }

    return syncDraftOfficeRepresentation({ ...draft, complainants, defendants });
}

export function resolveComplainantOfficeClientMark(
    complainant: CriminalComplainant,
    ourRepresentation?: OurRepresentation | '',
): boolean {
    if (complainant.isOfficeClient === true) return true;
    if (complainant.isOfficeClient === false) return false;
    return ourRepresentation === 'complainant_side';
}

export function resolveDefendantOfficeClientMark(
    defendant: CriminalDefendant,
    ourRepresentation?: OurRepresentation | '',
): boolean {
    if (isDefendantIdentityUnknown(defendant)) return false;
    if (defendant.isOfficeClient === true) return true;
    if (defendant.isOfficeClient === false) return false;
    return ourRepresentation === 'defendant_side';
}
