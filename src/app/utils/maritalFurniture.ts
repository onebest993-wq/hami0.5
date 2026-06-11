import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';

export function createMaritalFurnitureItemId(): string {
    return `mf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyMaritalFurnitureItem(): MaritalFurnitureItem {
    return {
        id: createMaritalFurnitureItemId(),
        name: '',
        quantity: 1,
        unitPriceIqd: 0,
    };
}

export function lineTotalIqd(item: MaritalFurnitureItem): number {
    const qty = Math.max(0, Math.round(Number(item.quantity) || 0));
    const price = Math.max(0, Math.round(Number(item.unitPriceIqd) || 0));
    return qty * price;
}

export function sumMaritalFurnitureTotal(items: MaritalFurnitureItem[]): number {
    return items.reduce((sum, row) => sum + lineTotalIqd(row), 0);
}

export function sumUndeliveredMaritalFurnitureTotal(items: MaritalFurnitureItem[]): number {
    return items.reduce(
        (sum, row) => sum + (row.delivered === false ? lineTotalIqd(row) : 0),
        0
    );
}

export function sumDeliveredMaritalFurnitureTotal(items: MaritalFurnitureItem[]): number {
    return items.reduce((sum, row) => sum + (row.delivered ? lineTotalIqd(row) : 0), 0);
}

/** هل سُجّلت حالة التسليم (من جرد «تسليم أثاث») */
export function isMaritalFurnitureDeliveryStatusRecorded(
    data:
        | MaritalFurnitureItem[]
        | {
              maritalFurnitureItems?: MaritalFurnitureItem[];
              maritalFurnitureDeliveryRecordedAt?: string;
          }
        | null
        | undefined
): boolean {
    if (Array.isArray(data)) return false;
    if (!String(data?.maritalFurnitureDeliveryRecordedAt || '').trim()) return false;
    return readMaritalFurnitureItems(data).length > 0;
}

/** المبلغ المالي في المركز — صفر حتى جرد التسليم، ثم غير المُسلَّم فقط */
export function resolveMaritalFurnitureFinancialPrincipal(
    data:
        | {
              maritalFurnitureItems?: MaritalFurnitureItem[];
              maritalFurnitureDeliveryRecordedAt?: string;
          }
        | null
        | undefined
): number {
    if (!isMaritalFurnitureDeliveryStatusRecorded(data)) return 0;
    return sumUndeliveredMaritalFurnitureTotal(readMaritalFurnitureItems(data));
}

export function countMaritalFurnitureDeliveryStatus(items: MaritalFurnitureItem[]): {
    delivered: number;
    undelivered: number;
    pending: number;
} {
    let delivered = 0;
    let undelivered = 0;
    let pending = 0;
    for (const row of items) {
        if (row.delivered === true) delivered += 1;
        else if (row.delivered === false) undelivered += 1;
        else pending += 1;
    }
    return { delivered, undelivered, pending };
}

export function buildMaritalFurnitureDeliveryNoteBody(items: MaritalFurnitureItem[]): string {
    const lines = items.map((row, i) => {
        const status = row.delivered ? '✅ تم التسليم' : '❌ لم يُسلّم (مالي)';
        return `${i + 1}. ${row.name} × ${row.quantity} — ${formatMaritalFurnitureIqd(lineTotalIqd(row))} د.ع — ${status}`;
    });
    const undelivered = sumUndeliveredMaritalFurnitureTotal(items);
    return [
        'جرد تسليم الأثاث الزوجية (كسر الأقفال والجرد):',
        ...lines,
        '',
        `مجموع غير المُسلَّم (المركز المالي): ${formatMaritalFurnitureIqd(undelivered)} د.ع`,
    ].join('\n');
}

export function furnitureDetailsFromItems(items: MaritalFurnitureItem[]): string {
    return items.map((row) => `${row.name} × ${row.quantity}`).join('؛ ');
}

export function normalizeMaritalFurnitureItems(
    items: MaritalFurnitureItem[] | null | undefined
): MaritalFurnitureItem[] {
    if (!Array.isArray(items)) return [];
    return items
        .map((row) => {
            const normalized: MaritalFurnitureItem = {
                id: String(row.id || createMaritalFurnitureItemId()),
                name: String(row.name || '').trim(),
                quantity: Math.max(1, Math.round(Number(row.quantity) || 1)),
                unitPriceIqd: Math.max(0, Math.round(Number(row.unitPriceIqd) || 0)),
            };
            if (typeof row.delivered === 'boolean') {
                normalized.delivered = row.delivered;
            }
            return normalized;
        })
        .filter((row) => row.name.length > 0);
}

export function formatMaritalFurnitureIqd(value: number): string {
    return Math.max(0, Math.round(Number(value) || 0)).toLocaleString('ar-IQ');
}

export function readMaritalFurnitureItems(data: {
    maritalFurnitureItems?: MaritalFurnitureItem[];
    furnitureValue?: number;
    furnitureDetails?: string;
} | null | undefined): MaritalFurnitureItem[] {
    const fromList = normalizeMaritalFurnitureItems(data?.maritalFurnitureItems);
    if (fromList.length > 0) return fromList;
    const details = String(data?.furnitureDetails || '').trim();
    if (!details) return [];
    return details
        .split(/\n|؛|;/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((name) => ({
            id: createMaritalFurnitureItemId(),
            name,
            quantity: 1,
            unitPriceIqd: Math.max(0, Math.round(Number(data?.furnitureValue) || 0)),
        }));
}
