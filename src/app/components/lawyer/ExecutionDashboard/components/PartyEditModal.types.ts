import type { Dispatch, SetStateAction } from 'react';
import type { HeirDetailRow } from '../helpers';

export interface PartyEditDraft {
    name: string;
    phone: string;
    address: string;
    heirs: HeirDetailRow[];
    lockBaseInfo: boolean;
    includeHeirsInForm?: boolean;
    heirsOnlyEdit?: boolean;
}

export interface PartyEditModalProps {
    editPartyTarget: { kind: 'creditor' | 'debtor'; index: number };
    setEditPartyTarget: (target: { kind: 'creditor' | 'debtor'; index: number } | null) => void;
    partyEditDraft: PartyEditDraft;
    setPartyEditDraft: Dispatch<SetStateAction<PartyEditDraft | null>>;
    partyEditHeirDeleteConfirmIdx: number | null;
    setPartyEditHeirDeleteConfirmIdx: (idx: number | null) => void;
    savePartyEditDraft: () => void;
    togglePartyEditHeirClient: (heirIdx: number) => void;
    removeHeirFromPartyEditDraftAtIndex: (idx: number) => void;
    decisionsStorageExecutionId: string;
}
