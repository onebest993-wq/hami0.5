/**
 * Party & role types for lawsuits and executions.
 */

export interface Party {
    id: string | number;
    name: string;
    role?: PartyRole;
    type?: PartyType;
    isClient?: boolean;
    phone?: string;
    address?: string;
    nationalId?: string;
    birthDate?: string;
    occupation?: string;
    kinship?: string; // V48: Kinship type (زوجة، ابن، etc.)
    linkedDebtorId?: string | number; // V48: Smart kinship linking to debtor
    age?: number; // V48: Age for imprisonment eligibility
}

export type PartyRole =
    | 'plaintiff'
    | 'defendant'
    | 'creditor'
    | 'debtor'
    | 'witness'
    | 'expert'
    | 'guardian'
    | 'lawyer';

export type PartyType = 'individual' | 'company' | 'government';
