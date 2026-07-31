/** حالة تسليم محضون — نزع حضانة */
export type CustodyWardDeliveryStatus =
    | 'pending'
    | 'scheduled'
    | 'received_early'
    | 'received'
    | 'not_received';

export interface CustodyWardDeliveryRecord {
    wardKey: string;
    name: string;
    appointmentYmd?: string;
    status: CustodyWardDeliveryStatus;
    statusAt?: string;
}

export interface CustodyWardDeliveryBundle {
    wards: CustodyWardDeliveryRecord[];
}
