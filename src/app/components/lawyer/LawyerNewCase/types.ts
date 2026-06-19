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
    /** الصفة القانونية — مثل المدعي للأطراف الأصليين */
    status: string;
    address: string;
    /** اختصامي | انضمامي | بقرار المحكمة | بطلب الخصم */
    entryMode: 'interpleader' | 'affiliative' | 'court' | 'opponent_request';
    /** جانب الانضمام — للشخص الثالث الانضمامي فقط */
    affiliatedSide?: 1 | 2;
    roleLabel: string;
    /** @deprecated legacy */
    entryType?: string;
    /** @deprecated legacy */
    role?: string;
    /** @deprecated legacy */
    alignment?: string;
    type: string;
    isClient: boolean;
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
    /** نموذج الإنشاء: اختصامي وانضمامي فقط — بقرار المحكمة/بطلب الخصم في الإضبارة */
    context?: 'newCase' | 'file';
}

export interface PartyCardProps {
    party: Party;
    index: number;
    side: 1 | 2;
    onUpdate: (field: keyof Party, value: string | boolean) => void;
    onRemove: () => void;
    canRemove: boolean;
    labels: { p1Main: string; p2Main: string; courtPlaceholder: string; typePlaceholder: string };
    errorMap: Record<string, string>;
}
