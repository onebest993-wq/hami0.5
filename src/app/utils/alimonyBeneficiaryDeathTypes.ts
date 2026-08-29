export interface AlimonyBeneficiaryDeathState {
    wife_deceased?: boolean;
    children_deceased_count?: number;
    last_report_at?: string;
}

export type AlimonyBeneficiaryKind = 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد' | '';

export interface AlimonyBeneficiaryProfile {
    beneficiaryKind: AlimonyBeneficiaryKind;
    hasWifeBenefit: boolean;
    hasChildrenBenefit: boolean;
    childrenCount: number;
    wifeMonthly: number;
    childMonthly: number;
    deathState: AlimonyBeneficiaryDeathState;
    wifeAlive: boolean;
    childrenAlive: number;
    anyBeneficiaryAlive: boolean;
}

export interface OngoingAlimonyMonthlyDisplay {
    total: number;
    beneficiaryKind: AlimonyBeneficiaryKind;
    detailLines: string[];
}

export interface AlimonyBeneficiaryDeathInput {
    wifeDeceased?: boolean;
    childrenDiedCount?: number;
}
