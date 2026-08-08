import {
    resolveSpecificDeliveryItemNature,
    type SpecificDeliveryItemNature,
} from '@/app/utils/executionModuleStrategies';

export type SpecificDeliveryItemStatus = 'pending' | 'financialized';

export interface SpecificDeliveryItem {
    id: string;
    name: string;
    nature: SpecificDeliveryItemNature;
    status: SpecificDeliveryItemStatus;
    financializedAmount?: number;
    financializedAt?: string;
    /** هالك / تعذّر التسليم — محدّد عند الإنشاء أو عبر طلب التحويل */
    declaredDestroyed?: boolean;
    /** القيمة المحكوم بها للشيء الهالك (د.ع) */
    judgmentValueIqd?: number;
}

export function createSpecificDeliveryItemId(): string {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    const uuid = c?.randomUUID?.();
    if (uuid) return `sd-item-${uuid}`;
    return `sd-item-${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function createEmptySpecificDeliveryItem(
    nature: SpecificDeliveryItemNature = 'movable'
): SpecificDeliveryItem {
    return {
        id: createSpecificDeliveryItemId(),
        name: '',
        nature,
        status: 'pending',
    };
}

function normalizeItem(raw: unknown): SpecificDeliveryItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const nature = resolveSpecificDeliveryItemNature(String(row.nature || ''));
    if (!nature) return null;
    const status: SpecificDeliveryItemStatus =
        String(row.status || '') === 'financialized' ? 'financialized' : 'pending';
    const id = String(row.id || '').trim() || createSpecificDeliveryItemId();
    const name = String(row.name || '').trim();
    const financializedAmount = Math.max(0, Math.trunc(Number(row.financializedAmount) || 0));
    const financializedAt = String(row.financializedAt || '').trim() || undefined;
    const declaredDestroyed = Boolean(row.declaredDestroyed);
    const judgmentValueIqd = Math.max(0, Math.trunc(Number(row.judgmentValueIqd) || 0));
    return {
        id,
        name,
        nature,
        status,
        ...(declaredDestroyed ? { declaredDestroyed: true } : {}),
        ...(judgmentValueIqd > 0 ? { judgmentValueIqd } : {}),
        ...(status === 'financialized' && financializedAmount > 0
            ? { financializedAmount, financializedAt }
            : {}),
    };
}

export function readSpecificDeliveryItems(
    file:
        | {
              specificDeliveryItems?: SpecificDeliveryItem[] | null;
              specificDeliveryItemName?: string | null;
              specificDeliveryItemNature?: string | null;
              specificDeliveryFinancialized?: boolean;
              specificDeliveryConvertedAmount?: number | null;
              specificDeliveryFinancializedAt?: string | null;
          }
        | null
        | undefined
): SpecificDeliveryItem[] {
    const raw = file?.specificDeliveryItems;
    if (Array.isArray(raw) && raw.length > 0) {
        return raw.map(normalizeItem).filter(Boolean) as SpecificDeliveryItem[];
    }

    const name = String(file?.specificDeliveryItemName || '').trim();
    const nature = resolveSpecificDeliveryItemNature(file?.specificDeliveryItemNature);
    const financialized = Boolean(file?.specificDeliveryFinancialized);
    const converted = Math.max(0, Math.trunc(Number(file?.specificDeliveryConvertedAmount) || 0));

    if (name || nature) {
        return [
            {
                id: 'sd-item-legacy',
                name: name || '—',
                nature: nature ?? 'movable',
                status: financialized ? 'financialized' : 'pending',
                ...(financialized && converted > 0
                    ? {
                          financializedAmount: converted,
                          financializedAt: String(file?.specificDeliveryFinancializedAt || '').trim() || undefined,
                      }
                    : {}),
            },
        ];
    }

    if (nature) {
        return [
            {
                id: 'sd-item-legacy-nature',
                name: '',
                nature,
                status: financialized ? 'financialized' : 'pending',
            },
        ];
    }

    return [];
}

export function hasPendingSpecificDeliveryItems(items: SpecificDeliveryItem[]): boolean {
    return items.some((item) => item.status === 'pending');
}

export function getPendingSpecificDeliveryItems(items: SpecificDeliveryItem[]): SpecificDeliveryItem[] {
    return items.filter((item) => item.status === 'pending');
}

/** أشياء لم يُعلَن هلاكها بعد — مؤهلة لطلب التحويل */
export function getConversionEligibleSpecificDeliveryItems(
    items: SpecificDeliveryItem[],
): SpecificDeliveryItem[] {
    return items.filter((item) => item.status === 'pending' && !item.declaredDestroyed);
}

/** تحويل الأشياء المعلَّمة «هالك» عند الإنشاء إلى مطالبة مالية في المركز المالي */
export function applyIntakeDestroyedFinancialization(
    items: SpecificDeliveryItem[],
): SpecificDeliveryItem[] {
    const tNow = new Date().toISOString();
    return items.map((item) => {
        if (!item.declaredDestroyed || item.status === 'financialized') return item;
        const amt = Math.max(0, Math.trunc(Number(item.judgmentValueIqd) || 0));
        if (amt <= 0) return item;
        return {
            ...item,
            status: 'financialized' as const,
            financializedAmount: amt,
            financializedAt: tNow,
        };
    });
}

export function allSpecificDeliveryItemsFinancialized(items: SpecificDeliveryItem[]): boolean {
    return items.length > 0 && items.every((item) => item.status === 'financialized');
}

export function aggregateSpecificDeliveryFinancializedAmount(items: SpecificDeliveryItem[]): number {
    return items.reduce(
        (sum, item) => sum + Math.max(0, Math.trunc(Number(item.financializedAmount) || 0)),
        0
    );
}

/** مجموع الدين: مُحوَّل مالياً + القيمة المحكوم بها للأشياء الهالكة عند الإنشاء */
export function aggregateSpecificDeliveryDebtExposure(items: SpecificDeliveryItem[]): number {
    return items.reduce((sum, item) => {
        const fin = Math.max(0, Math.trunc(Number(item.financializedAmount) || 0));
        if (item.status === 'financialized' && fin > 0) return sum + fin;
        if (item.declaredDestroyed) {
            const judgment = Math.max(0, Math.trunc(Number(item.judgmentValueIqd) || 0));
            if (judgment > 0) return sum + judgment;
        }
        return sum;
    }, 0);
}

/** مجموع الدين من الأشياء المُحوَّلة مالياً (إنشاء أو متابعة) */
export function resolveSpecificDeliveryDebtTotal(input: {
    specificDeliveryItems?: SpecificDeliveryItem[] | null;
    specificDeliveryConvertedAmount?: number | null;
    debtAmount?: number | null;
    totalAmount?: number | null;
} | null | undefined): number {
    const items = readSpecificDeliveryItems(input ?? {});
    const fromItems = aggregateSpecificDeliveryDebtExposure(items);
    if (fromItems > 0) return fromItems;
    const converted = Math.max(0, Math.trunc(Number(input?.specificDeliveryConvertedAmount) || 0));
    if (converted > 0) return converted;
    const debt = Math.max(0, Math.trunc(Number(input?.debtAmount) || 0));
    const total = Math.max(0, Math.trunc(Number(input?.totalAmount) || 0));
    return Math.max(debt, total);
}

export function resolvePrimarySpecificDeliveryNature(
    items: SpecificDeliveryItem[],
    fallbackNature?: string | null
): SpecificDeliveryItemNature | null {
    const pending = items.filter((item) => item.status === 'pending');
    const pool = pending.length > 0 ? pending : items;
    if (pool.length === 0) return resolveSpecificDeliveryItemNature(fallbackNature);
    const natures = new Set(pool.map((item) => item.nature));
    if (natures.size === 1) return pool[0].nature;
    return pool[0]?.nature ?? resolveSpecificDeliveryItemNature(fallbackNature);
}

/** ملخّص عربي — يدعم الجمع بين منقول وغير منقول */
export function formatSpecificDeliveryNatureSummary(
    items: SpecificDeliveryItem[],
    fallbackNature?: string | null,
): string {
    const pending = items.filter((item) => item.status === 'pending');
    const pool = pending.length > 0 ? pending : items;
    const hasMovable = pool.some((item) => item.nature === 'movable');
    const hasImmovable = pool.some((item) => item.nature === 'immovable');
    if (hasMovable && hasImmovable) return 'منقول + غير منقول';
    if (hasMovable) return 'منقول';
    if (hasImmovable) return 'غير منقول';
    const primary = resolvePrimarySpecificDeliveryNature(items, fallbackNature);
    if (primary === 'movable') return 'منقول';
    if (primary === 'immovable') return 'غير منقول';
    return '';
}

export function markSpecificDeliveryItemDeclaredDestroyed(
    items: SpecificDeliveryItem[],
    itemId: string | null | undefined,
): SpecificDeliveryItem[] {
    const targetId = String(itemId || '').trim();
    if (!targetId) return items;
    return items.map((item) =>
        item.id === targetId && item.status === 'pending'
            ? { ...item, declaredDestroyed: true }
            : item
    );
}

export function markSpecificDeliveryItemFinancialized(
    items: SpecificDeliveryItem[],
    itemId: string | null | undefined,
    amount: number
): SpecificDeliveryItem[] {
    const amt = Math.max(0, Math.trunc(amount));
    const tNow = new Date().toISOString();
    const targetId = String(itemId || '').trim();

    if (!targetId) {
        let marked = false;
        return items.map((item) => {
            if (!marked && item.status === 'pending') {
                marked = true;
                return {
                    ...item,
                    status: 'financialized' as const,
                    financializedAmount: amt,
                    financializedAt: tNow,
                };
            }
            return item;
        });
    }

    return items.map((item) =>
        item.id === targetId && item.status === 'pending'
            ? {
                  ...item,
                  status: 'financialized' as const,
                  financializedAmount: amt,
                  financializedAt: tNow,
              }
            : item
    );
}

export function syncSpecificDeliveryLegacyFields(items: SpecificDeliveryItem[]): {
    specificDeliveryItemName: string;
    specificDeliveryItemNature?: SpecificDeliveryItemNature;
    specificDeliveryFinancialized: boolean;
    specificDeliveryConvertedAmount: number;
    specificDeliveryFinancializedAt?: string;
} {
    const names = items
        .map((item) => item.name.trim())
        .filter(Boolean)
        .join('؛ ');
    const allDone = allSpecificDeliveryItemsFinancialized(items);
    const total = aggregateSpecificDeliveryFinancializedAmount(items);
    const lastAt = items
        .map((item) => String(item.financializedAt || '').trim())
        .filter(Boolean)
        .sort()
        .pop();

    return {
        specificDeliveryItemName: names,
        specificDeliveryItemNature:
            (items.length === 1 ? items[0].nature : resolvePrimarySpecificDeliveryNature(items)) ??
            undefined,
        specificDeliveryFinancialized: allDone && items.length > 0,
        specificDeliveryConvertedAmount: total,
        ...(allDone && lastAt ? { specificDeliveryFinancializedAt: lastAt } : {}),
    };
}

export function normalizeSpecificDeliveryItemsForSave(
    items: SpecificDeliveryItem[]
): SpecificDeliveryItem[] {
    return items
        .map((item) => ({
            ...item,
            name: item.name.trim(),
        }))
        .filter((item) => item.name.length > 0);
}
