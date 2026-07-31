import type { ExecutionArchiveFile, Party } from '@/app/types/common';

export type PartyEntityKind = 'natural_person' | 'legal_entity';

export type CreditorDraft = {
    id: number;
    name: string;
    phone: string;
    address: string;
    occupation: 'موظف' | 'كاسب';
    isClient: boolean;
    entityKind?: PartyEntityKind;
    entityType?: PartyEntityKind;
    type?: string;
};

export type DebtorDraft = {
    id: number;
    name: string;
    phone: string;
    address: string;
    occupation: 'موظف' | 'كاسب';
    isClient: boolean;
    isSolidaryLiability?: boolean;
    entityKind?: PartyEntityKind;
    entityType?: PartyEntityKind;
    type?: string;
};

export type AdditionalCreditorDraft = {
    id: string;
    name: string;
    phone: string;
    address: string;
    occupation: 'موظف' | 'كاسب';
    isClient: boolean;
};

export type AdditionalDebtorDraft = {
    id: string;
    name: string;
    phone: string;
    address: string;
    occupation: 'موظف' | 'كاسب' | 'معنوي';
    isClient: boolean;
    isSolidaryLiability?: boolean;
    entityKind?: PartyEntityKind;
    entityType?: PartyEntityKind;
    type?: string;
};

export type ExecutionTargetOption =
    | 'المدين الأصلي'
    | 'المُظَهِّر'
    | 'كفيل متضامن'
    | 'كفيل غير متضامن'
    | '';

export type ExecutionDraftParty = Party & {
    nationality?: string;
    employmentType?: string;
    isEmployee?: boolean;
    employmentInitialWasEmployee?: boolean;
    status?: 'Active';
    isSolidaryLiability?: boolean;
    lawyerFeesClaimAmount?: number;
    allocated_debt?: number;
    paid_amount?: number;
};

export type ExecutionPartyMultiplicity = {
    additionalCreditors: ExecutionDraftParty[];
    additionalDebtors: ExecutionDraftParty[];
    isSolidaryLiability: boolean;
    solidaryRemainderDebt?: number;
};

export type ExecutionDraftRecord = ExecutionArchiveFile &
    Record<string, unknown> & {
        creditors: ExecutionDraftParty[];
        debtors: ExecutionDraftParty[];
        creditor?: ExecutionDraftParty;
        debtor?: ExecutionDraftParty;
        isAlimony?: boolean;
        party_multiplicity?: ExecutionPartyMultiplicity;
        visitationChildrenNames?: string[];
        custodyWardNames?: string[];
        property_number?: string;
        district?: string;
        property_type?: string;
        full_address?: string;
        eviction_premises_use?: 'commercial' | 'residential';
        eviction_lawyer_fee_waived_at_intake?: boolean;
        total_remaining_balance?: number;
        paidDebt?: number;
    };

export type AbsenteeChecks = {
    isOutsideIraq: boolean;
    isAddressUnknown: boolean;
    isDiedDuringNotice: boolean;
};
