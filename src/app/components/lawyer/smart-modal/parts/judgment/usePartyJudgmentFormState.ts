import { useEffect, useMemo, useState } from 'react';
import {
    alignPartyJudgmentDispositions,
    isJudgmentPresenceForm,
    isPartyJudgmentOperative,
    JUDGMENT_FORM_DEEMED_HADARI,
    listJudgmentDispositionDefendants,
    seedPartyJudgmentDispositions,
    summarizePartyJudgmentForm,
    type DisputeIntegrity,
    type JudgmentPresenceForm,
    type PartyJudgmentDisposition,
    type PartyJudgmentOperative,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';

type JudgmentPartyLike = {
    id?: unknown;
    name?: unknown;
    role?: unknown;
    status?: unknown;
    isClient?: boolean;
};

function issuedPresenceForm(form: JudgmentPresenceForm): JudgmentPresenceForm {
    return form === JUDGMENT_FORM_DEEMED_HADARI ? 'حضوري' : form;
}

function coerceDispositions(rows: PartyJudgmentDisposition[]): PartyJudgmentDisposition[] {
    return rows.map((row) => ({ ...row, form: issuedPresenceForm(row.form) }));
}

export function usePartyJudgmentFormState(params: {
    isOpen: boolean;
    parties: JudgmentPartyLike[];
    docType?: string | null;
    existingDispositions?: unknown;
    existingIntegrity?: DisputeIntegrity | string | null;
    forceHadari?: boolean;
}) {
    const defendants = useMemo(
        () => listJudgmentDispositionDefendants(params.parties),
        [params.parties],
    );
    const multiDefendant = defendants.length >= 2;

    const [judgmentForm, setJudgmentForm] = useState('حضوري');
    const [dispositions, setDispositions] = useState<PartyJudgmentDisposition[]>([]);
    const disputeIntegrity: DisputeIntegrity = 'indivisible';

    useEffect(() => {
        if (!params.isOpen) return;
        if (params.forceHadari) {
            setJudgmentForm('حضوري');
            setDispositions([]);
            return;
        }
        const seeded = coerceDispositions(
            alignPartyJudgmentDispositions(
                defendants,
                Array.isArray(params.existingDispositions)
                    ? (params.existingDispositions as PartyJudgmentDisposition[])
                    : [],
                'حضوري',
            ),
        );
        const next =
            seeded.length > 0 ? seeded : seedPartyJudgmentDispositions(defendants, 'حضوري');
        setDispositions(next);
        setJudgmentForm(summarizePartyJudgmentForm(next, 'حضوري'));
    }, [params.isOpen, params.forceHadari]);

    const setUniformForm = (form: JudgmentPresenceForm) => {
        const issued = issuedPresenceForm(isJudgmentPresenceForm(form) ? form : 'حضوري');
        setJudgmentForm(issued);
        setDispositions(seedPartyJudgmentDispositions(defendants, issued));
    };

    const setPartyForm = (partyId: string, form: JudgmentPresenceForm) => {
        const issued = issuedPresenceForm(isJudgmentPresenceForm(form) ? form : 'حضوري');
        setDispositions((prev) => {
            const base = prev.length > 0
                ? prev
                : seedPartyJudgmentDispositions(defendants, 'حضوري');
            const next = base.map((row) => (row.partyId === partyId ? { ...row, form: issued } : row));
            const aligned = next.some((row) => row.partyId === partyId)
                ? next
                : [...next, { partyId, form: issued, operative: 'bound' as const }];
            setJudgmentForm(summarizePartyJudgmentForm(aligned, issued));
            return aligned;
        });
    };

    const setPartyOperative = (partyId: string, operative: PartyJudgmentOperative) => {
        const op = isPartyJudgmentOperative(operative) ? operative : 'bound';
        setDispositions((prev) => {
            const base = prev.length > 0
                ? prev
                : seedPartyJudgmentDispositions(defendants, 'حضوري');
            const next = base.map((row) =>
                row.partyId === partyId ? { ...row, operative: op } : row,
            );
            return next.some((row) => row.partyId === partyId)
                ? next
                : [...next, { partyId, form: 'حضوري' as const, operative: op }];
        });
    };

    const setUniformOperative = (operative: PartyJudgmentOperative) => {
        const op = isPartyJudgmentOperative(operative) ? operative : 'bound';
        setDispositions((prev) => {
            const base = prev.length > 0
                ? prev
                : seedPartyJudgmentDispositions(defendants, 'حضوري');
            return base.map((row) => ({ ...row, operative: op }));
        });
    };

    return {
        defendants,
        multiDefendant,
        judgmentForm,
        setUniformForm,
        dispositions,
        setPartyForm,
        setPartyOperative,
        setUniformOperative,
        disputeIntegrity,
    };
}
