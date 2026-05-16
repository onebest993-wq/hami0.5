export interface PartyData {
    entity: 'فرد' | 'شركة';
    name: string;
    id: string;
    address: string;
    representedBy?: string;
    role: string;
}

export interface ShieldsData {
    evidentiary: boolean;
    guillotine: boolean;
    shockAbsorption: boolean;
    shockPercentage: number;
    willDefects: boolean;
}

export interface LeaseDetails {
    propertyType: 'سكني (يخضع للامتداد القانوني)' | 'تجاري';
    monthlyRent: string;
    duration: string;
}

export interface ConstructionDetails {
    pricingStrategy: 'مقاولة بسعر ثابت إجمالي (Lump Sum)' | 'مقاولة بوحدة القياس (Unit Price)';
    durationDays: string;
    dailyPenalty: string;
    penaltyCap: string;
}

export interface SaleDetails {
    itemType: 'منقول (بضاعة/سيارة)' | 'عقار (أرض/دار)';
    description: string;
    totalPrice: string;
    paymentMethod: 'دفعة واحدة نقداً' | 'أقساط مجدولة';
}

export interface ContractDetails {
    lease?: LeaseDetails;
    construction?: ConstructionDetails;
    sale?: SaleDetails;
}

export interface ContractData {
    type: string;
    date: string;
    location: string;
    partyOne: PartyData;
    partyTwo: PartyData;
    shields: ShieldsData;
}
