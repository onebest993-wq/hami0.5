import { useState } from 'react';
import { getDynamicPartyLabels, ordinalOf } from '../utils/partyLabels';

type PartyEditTarget = {
    type: 'party1' | 'party2';
    index: number;
    party: any;
} | null;

type UseOrderFileMetaPartyEditArgs = {
    caseData: any;
    party1Entries: any[];
    party2Entries: any[];
    persistAndMerge: (patch: Record<string, unknown>) => void;
    appendCaseEvent: (message: string, kind?: 'system' | 'action' | 'edit') => void;
};

export function useOrderFileMetaPartyEdit({
    caseData,
    party1Entries,
    party2Entries,
    persistAndMerge,
    appendCaseEvent,
}: UseOrderFileMetaPartyEditArgs) {
    const [partyEditTarget, setPartyEditTarget] = useState<PartyEditTarget>(null);
    const [partyEditForm, setPartyEditForm] = useState({
        name: '',
        type: 'person',
        phone: '',
        address: '',
    });
    const [isMetaEditOpen, setIsMetaEditOpen] = useState(false);
    const [metaEditForm, setMetaEditForm] = useState({
        requestNumber: '',
        requestDate: '',
        courtName: '',
        judgeName: '',
        specificActionType: '',
    });

    const openPartyEdit = ({ type, index, party }: { type: 'party1' | 'party2'; index: number; party: any }) => {
        setPartyEditTarget({ type, index, party });
        setPartyEditForm({
            name: String(party?.name ?? ''),
            type: String((party as any)?.type ?? 'person') || 'person',
            phone: String(party?.phone ?? ''),
            address: String(party?.address ?? ''),
        });
    };

    const closePartyEdit = () => {
        setPartyEditTarget(null);
    };

    const savePartyEdit = (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!partyEditTarget) return;
        const { type, index } = partyEditTarget;

        const nextParty = {
            ...partyEditTarget.party,
            name: String(partyEditForm.name ?? '').trim(),
            type: String(partyEditForm.type ?? '').trim(),
            phone: String(partyEditForm.phone ?? '').trim(),
            address: String(partyEditForm.address ?? '').trim(),
        };

        const patch: Record<string, unknown> = {};
        if (type === 'party1') {
            const next = [...party1Entries];
            next[index] = { ...(next[index] || {}), ...nextParty };
            patch.allParty1 = next;
            if (next[0]) {
                patch.party1Name = String((next[0] as any)?.name ?? '');
                patch.party1Phone = String((next[0] as any)?.phone ?? '');
                patch.party1Address = String((next[0] as any)?.address ?? '');
            }
        } else {
            const next = [...party2Entries];
            next[index] = { ...(next[index] || {}), ...nextParty };
            patch.allParty2 = next;
            if (next[0]) {
                patch.party2Name = String((next[0] as any)?.name ?? '');
                patch.party2Phone = String((next[0] as any)?.phone ?? '');
                patch.party2Address = String((next[0] as any)?.address ?? '');
            }
        }

        persistAndMerge(patch);
        const labels = getDynamicPartyLabels(String(caseData?.specificActionType ?? '').trim());
        const titleBase = type === 'party1' ? labels.party1 : labels.party2;
        const totalCount = type === 'party1' ? party1Entries.length : party2Entries.length;
        const showOrdinal = totalCount > 1;
        const title = showOrdinal ? `${titleBase} ${ordinalOf(index)}` : titleBase;
        appendCaseEvent(`تم تعديل بيانات ${title}`, 'edit');
        closePartyEdit();
    };

    const openMetaEdit = () => {
        setMetaEditForm({
            requestNumber: String(caseData?.requestNumber ?? ''),
            requestDate: String(caseData?.requestDate ?? ''),
            courtName: String(caseData?.courtName ?? ''),
            judgeName: String(caseData?.judgeName ?? ''),
            specificActionType: String(caseData?.specificActionType ?? ''),
        });
        setIsMetaEditOpen(true);
    };

    const closeMetaEdit = () => {
        setIsMetaEditOpen(false);
    };

    const saveMetaEdit = (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const patch: Record<string, unknown> = {
            requestNumber: String(metaEditForm.requestNumber ?? '').trim(),
            requestDate: String(metaEditForm.requestDate ?? '').trim(),
            courtName: String(metaEditForm.courtName ?? '').trim(),
            judgeName: String(metaEditForm.judgeName ?? '').trim(),
            specificActionType: String(metaEditForm.specificActionType ?? '').trim(),
        };
        persistAndMerge(patch);
        appendCaseEvent('تم تعديل بيانات الإضبارة', 'edit');
        closeMetaEdit();
    };

    return {
        partyEditTarget,
        partyEditForm,
        setPartyEditForm,
        isMetaEditOpen,
        metaEditForm,
        setMetaEditForm,
        openPartyEdit,
        closePartyEdit,
        savePartyEdit,
        openMetaEdit,
        closeMetaEdit,
        saveMetaEdit,
    };
}
