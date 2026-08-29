import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';

export function resolveScannedDocCategory(doc: SmartVaultDoc): string {
    return doc.customCategory?.trim() || REPOSITORY_ACTION_CATEGORY.scan;
}

/** يدمج الغرفة/التصنيف دون نسخ الوثيقة إن لم يتغيّر شيء */
export function mergeScannedDocForFeed(
    doc: SmartVaultDoc,
    roomId: string | null,
    category: string,
): SmartVaultDoc {
    if (roomId && !doc.roomId) {
        return {
            ...doc,
            roomId,
            customCategory: category,
            updatedAt: new Date().toISOString(),
        };
    }
    if (doc.customCategory?.trim()) return doc;
    return { ...doc, customCategory: category };
}

/**
 * لا نبدّل فلتر المخزن إن كان «الكل» — المستند الجديد يظهر في أعلى الخلاصة
 * دون إعادة تصفية كاملة. التبديل فقط إذا كان الفلتر الحالي سيُخفيه.
 */
export function shouldSwitchVaultFilterForNewScan(
    activeFilter: string | undefined,
    category: string,
): boolean {
    const filter = (activeFilter ?? '').trim() || 'الكل';
    if (filter === 'الكل') return false;
    return filter !== category;
}
