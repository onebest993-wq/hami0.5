/** نتيجة تسليم قطعة أثاث زوجية */
export type MaritalFurnitureDeliveryOutcome =
    | 'pending'
    | 'delivered'
    | 'failed'
    | 'external_delivered';

/** قطعة أثاث زوجية محكوم بها */
export interface MaritalFurnitureItem {
    id: string;
    name: string;
    quantity: number;
    unitPriceIqd: number;
    /** بعد الجرد — true = تم التسليم، false = لم يُسلّم (مالي) */
    delivered?: boolean;
    /** حالة التسليم التفصيلية — تُقفل القطعة بعد التسجيل */
    deliveryOutcome?: MaritalFurnitureDeliveryOutcome;
    deliveryRecordedAt?: string;
}
