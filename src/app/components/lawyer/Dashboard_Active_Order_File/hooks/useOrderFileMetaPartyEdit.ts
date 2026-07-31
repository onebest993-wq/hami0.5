import { useState } from 'react';
import type { DossierEditForm, PartyEditRow } from '../modals/DossierEditModal';

type UseOrderFileMetaPartyEditArgs = {
    caseData: any;
    party1Entries: any[];
    party2Entries: any[];
    persistAndMerge: (patch: Record<string, unknown>) => void;
    appendCaseEvent: (message: string, kind?: 'system' | 'action' | 'edit') => void;
};

function mapPartyToForm(party: Record<string, unknown>): PartyEditRow {
    return {
        name: String(party?.name ?? ''),
        address: String(party?.address ?? ''),
    };
}

function mergePartyRow(original: Record<string, unknown>, form: PartyEditRow) {
    return {
        ...original,
        name: String(form.name ?? '').trim(),
        address: String(form.address ?? '').trim(),
    };
}

const emptyDossierForm = (): DossierEditForm => ({
    meta: {
        requestNumber: '',
        requestDate: '',
        courtName: '',
        judgeName: '',
        specificActionType: '',
    },
    party1: [],
    party2: [],
});

export function useOrderFileMetaPartyEdit({
    caseData,
    party1Entries,
    party2Entries,
    persistAndMerge,
    appendCaseEvent,
}: UseOrderFileMetaPartyEditArgs) {
    const [isDossierEditOpen, setIsDossierEditOpen] = useState(false);
    const [dossierEditForm, setDossierEditForm] = useState<DossierEditForm>(emptyDossierForm);

    const openDossierEdit = () => {
        setDossierEditForm({
            meta: {
                requestNumber: String(caseData?.requestNumber ?? ''),
                requestDate: String(caseData?.requestDate ?? ''),
                courtName: String(caseData?.courtName ?? ''),
                judgeName: String(caseData?.judgeName ?? ''),
                specificActionType: String(caseData?.specificActionType ?? ''),
            },
            party1: party1Entries.map((p) => mapPartyToForm(p as Record<string, unknown>)),
            party2: party2Entries.map((p) => mapPartyToForm(p as Record<string, unknown>)),
        });
        setIsDossierEditOpen(true);
    };

    const closeDossierEdit = () => {
        setIsDossierEditOpen(false);
    };

    const saveDossierEdit = (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const nextParty1 = party1Entries.map((p, i) =>
            mergePartyRow(p as Record<string, unknown>, dossierEditForm.party1[i] ?? mapPartyToForm(p)),
        );
        const nextParty2 = party2Entries.map((p, i) =>
            mergePartyRow(p as Record<string, unknown>, dossierEditForm.party2[i] ?? mapPartyToForm(p)),
        );

        const meta = dossierEditForm.meta;
        const patch: Record<string, unknown> = {
            requestNumber: String(meta.requestNumber ?? '').trim(),
            requestDate: String(meta.requestDate ?? '').trim(),
            courtName: String(meta.courtName ?? '').trim(),
            judgeName: String(meta.judgeName ?? '').trim(),
            allParty1: nextParty1,
            allParty2: nextParty2,
        };

        if (nextParty1[0]) {
            patch.party1Name = String((nextParty1[0] as any)?.name ?? '');
            patch.party1Address = String((nextParty1[0] as any)?.address ?? '');
        }
        if (nextParty2[0]) {
            patch.party2Name = String((nextParty2[0] as any)?.name ?? '');
            patch.party2Address = String((nextParty2[0] as any)?.address ?? '');
        }

        persistAndMerge(patch);
        appendCaseEvent('تم تعديل بيانات الإضبارة والأطراف', 'edit');
        closeDossierEdit();
    };

    return {
        isDossierEditOpen,
        dossierEditForm,
        setDossierEditForm,
        openDossierEdit,
        closeDossierEdit,
        saveDossierEdit,
    };
}
