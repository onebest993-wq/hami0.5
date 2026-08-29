import type {
    MaritalFurnitureDeliveryOutcome,
    MaritalFurnitureItem,
} from '@/app/types/maritalFurniture';

export function createMaritalFurnitureItemId(): string {
    return `mf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** معرّف ثابت لقطع مُشتقة من furnitureDetails — يمنع اختلاف الـ id بين القراءات */
export function stableMaritalFurnitureDetailItemId(name: string, index: number): string {
    const slug = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
        .slice(0, 48);
    return `mf-detail-${index}-${slug || 'item'}`;
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
    return items.reduce((sum, row) => {
        const outcome = resolveMaritalFurnitureDeliveryOutcome(row);
        if (outcome === 'failed') return sum + lineTotalIqd(row);
        if (outcome === 'pending' && row.delivered === false) return sum + lineTotalIqd(row);
        return sum;
    }, 0);
}

export function sumDeliveredMaritalFurnitureTotal(items: MaritalFurnitureItem[]): number {
    return items.reduce((sum, row) => {
        const outcome = resolveMaritalFurnitureDeliveryOutcome(row);
        if (outcome === 'delivered' || outcome === 'external_delivered') {
            return sum + lineTotalIqd(row);
        }
        if (outcome === 'pending' && row.delivered === true) return sum + lineTotalIqd(row);
        return sum;
    }, 0);
}

export function sumRemainingMaritalFurnitureListTotal(items: MaritalFurnitureItem[]): number {
    return Math.max(0, sumMaritalFurnitureTotal(items) - sumDeliveredMaritalFurnitureTotal(items));
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
    if (Array.isArray(data)) {
        return hasAnyMaritalFurnitureDeliveryRecorded(data);
    }
    const items = readMaritalFurnitureItems(data);
    if (hasAnyMaritalFurnitureDeliveryRecorded(items)) return true;
    if (!String(data?.maritalFurnitureDeliveryRecordedAt || '').trim()) return false;
    return items.length > 0;
}

export function resolveMaritalFurnitureDeliveryOutcome(
    item: MaritalFurnitureItem,
): MaritalFurnitureDeliveryOutcome {
    if (item.deliveryOutcome) return item.deliveryOutcome;
    if (item.deliveryRecordedAt) {
        if (item.delivered === true) return 'delivered';
        if (item.delivered === false) return 'failed';
    }
    return 'pending';
}

export function isMaritalFurnitureItemDeliveryLocked(item: MaritalFurnitureItem): boolean {
    const outcome = resolveMaritalFurnitureDeliveryOutcome(item);
    return outcome !== 'pending';
}

export function hasAnyMaritalFurnitureDeliveryRecorded(items: MaritalFurnitureItem[]): boolean {
    return normalizeMaritalFurnitureItems(items).some(isMaritalFurnitureItemDeliveryLocked);
}

export function areAllMaritalFurnitureItemsDeliveryLocked(items: MaritalFurnitureItem[]): boolean {
    const normalized = normalizeMaritalFurnitureItems(items);
    return normalized.length > 0 && normalized.every(isMaritalFurnitureItemDeliveryLocked);
}

export function applyMaritalFurnitureDeliveryOutcome(
    item: MaritalFurnitureItem,
    outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>,
    recordedAt: string,
): MaritalFurnitureItem {
    const delivered =
        outcome === 'delivered' || outcome === 'external_delivered'
            ? true
            : outcome === 'failed'
              ? false
              : undefined;
    return {
        ...item,
        deliveryOutcome: outcome,
        deliveryRecordedAt: recordedAt,
        ...(typeof delivered === 'boolean' ? { delivered } : {}),
    };
}

export function readMaritalFurnitureDeliverySchedule(
    data:
        | {
              maritalFurnitureDeliveryScheduleYmd?: string;
              maritalFurnitureDeliveryScheduleLabel?: string;
          }
        | null
        | undefined,
): { ymd: string; label: string } {
    const ymd = String(data?.maritalFurnitureDeliveryScheduleYmd || '').trim();
    const label = String(data?.maritalFurnitureDeliveryScheduleLabel || '').trim();
    return { ymd, label };
}

/** بصمة محتوى مالي لأثاث زوجية — لمزامنة executionData / المركز المالي */
export function maritalFurnitureFinancialContentSignature(
    data:
        | {
              maritalFurnitureItems?: MaritalFurnitureItem[];
              debtAmount?: unknown;
              totalAmount?: unknown;
          }
        | null
        | undefined,
): string {
    const items = readMaritalFurnitureItems(data);
    const itemSig = items
        .map(
            (row) =>
                `${row.id}:${row.deliveryOutcome ?? ''}:${row.delivered ?? ''}:${row.deliveryRecordedAt ?? ''}:${row.quantity}:${row.unitPriceIqd}`,
        )
        .join('|');
    const debt = Math.round(Number(data?.debtAmount) || 0);
    const total = Math.round(Number(data?.totalAmount) || 0);
    return `${itemSig}#${debt}#${total}`;
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
    const items = readMaritalFurnitureItems(data);
    const fromItems = sumUndeliveredMaritalFurnitureTotal(items);
    if (fromItems > 0) return fromItems;
    return Math.max(
        Math.round(Number(data?.debtAmount) || 0),
        Math.round(Number(data?.totalAmount) || 0),
    );
}

export function countMaritalFurnitureDeliveryStatus(items: MaritalFurnitureItem[]): {
    delivered: number;
    undelivered: number;
    pending: number;
    external: number;
    failed: number;
} {
    let delivered = 0;
    let undelivered = 0;
    let pending = 0;
    let external = 0;
    let failed = 0;
    for (const row of items) {
        const outcome = resolveMaritalFurnitureDeliveryOutcome(row);
        if (outcome === 'delivered') delivered += 1;
        else if (outcome === 'external_delivered') {
            external += 1;
            delivered += 1;
        } else if (outcome === 'failed') {
            failed += 1;
            undelivered += 1;
        } else if (row.delivered === true) delivered += 1;
        else if (row.delivered === false) undelivered += 1;
        else pending += 1;
    }
    return { delivered, undelivered, pending, external, failed };
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
            if (row.deliveryOutcome) {
                normalized.deliveryOutcome = row.deliveryOutcome;
            }
            if (row.deliveryRecordedAt) {
                normalized.deliveryRecordedAt = row.deliveryRecordedAt;
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
    const names = details
        .split(/\n|؛|;/)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
    if (names.length === 0) return [];
    const total = Math.max(0, Math.round(Number(data?.furnitureValue) || 0));
    const base = Math.floor(total / names.length);
    const remainder = total - base * names.length;
    return names.map((name, index) => ({
        id: stableMaritalFurnitureDetailItemId(name, index),
        name,
        quantity: 1,
        unitPriceIqd: base + (index === 0 ? remainder : 0),
    }));
}
