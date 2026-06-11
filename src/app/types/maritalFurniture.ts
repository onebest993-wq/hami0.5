/** قطعة أثاث زوجية محكوم بها */
export interface MaritalFurnitureItem {
    id: string;
    name: string;
    quantity: number;
    unitPriceIqd: number;
    /** بعد الجرد — true = تم التسليم، false/undefined = لم يُسلّم */
    delivered?: boolean;
}
