export type MainCategory = 'lawsuit' | 'transaction' | 'execution';

export type CaseType = 'civil' | 'criminal' | 'personal' | 'administrative' | 'cassation' | 'special' | null;

export type CivilSubView = 'main-form' | 'urgent-dashboard' | 'urgent-form';

export interface Party {
    id: string;
    name: string;
    status: string;
    isClient: boolean;
    phone: string;
    address: string;
    hasLawyer?: boolean;
    lawyerName?: string;
    lawyerPhone?: string;
    isMyOffice?: boolean;
}

export interface ThirdParty {
    id: number;
    name: string;
    type: string;
    roleLabel: string;
    entryType: string;
    role: string;
    alignment: string;
    hasLawyer: boolean;
    lawyerName: string;
    lawyerPhone: string;
    isMyOffice: boolean;
}

export interface ThirdPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (party: ThirdParty) => void;
    currentStage: string;
}

export interface PartyCardProps {
    party: Party;
    index: number;
    side: 1 | 2;
    onUpdate: (field: keyof Party, value: string | boolean) => void;
    onRemove: () => void;
    canRemove: boolean;
    onToggleAgent: (side: 1 | 2, id: string) => void;
    labels: { p1Main: string; p2Main: string; courtPlaceholder: string; typePlaceholder: string };
    currentStage: string;
    partyCount: number;
    errorMap: Record<string, string>;
}
