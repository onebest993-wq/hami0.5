import { describe, expect, it } from 'vitest';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';
import {
    mergeScannedDocForFeed,
    resolveScannedDocCategory,
    shouldSwitchVaultFilterForNewScan,
} from '../commitScannedVaultDoc';

const doc = (overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc =>
    ({
        id: 'scan-1',
        title: 'مسح',
        type: 'image',
        tags: ['مسح ضوئي'],
        authorId: 'u1',
        createdAt: '2026-08-23T00:00:00.000Z',
        updatedAt: '2026-08-23T00:00:00.000Z',
        fileSize: 12,
        fileName: 'scan.jpg',
        mimeType: 'image/jpeg',
        storagePath: 'local:vault:scan',
        ...overrides,
    }) as SmartVaultDoc;

describe('commitScannedVaultDoc', () => {
    it('يستخدم تصنيف مسح عند غياب customCategory', () => {
        expect(resolveScannedDocCategory(doc())).toBe(REPOSITORY_ACTION_CATEGORY.scan);
        expect(resolveScannedDocCategory(doc({ customCategory: 'هوية' }))).toBe('هوية');
    });

    it('لا ينسخ الوثيقة إن التصنيف موجود والغرفة غير مطلوبة', () => {
        const source = doc({ customCategory: 'مسح' });
        expect(mergeScannedDocForFeed(source, null, 'مسح')).toBe(source);
    });

    it('يملأ التصنيف عند غيابه', () => {
        const source = doc();
        const merged = mergeScannedDocForFeed(source, null, 'مسح');
        expect(merged).not.toBe(source);
        expect(merged.customCategory).toBe('مسح');
    });

    it('لا يبدّل الفلتر عندما يكون الكل — الخلاصة تُظهر المستند دون إعادة تصفية', () => {
        expect(shouldSwitchVaultFilterForNewScan('الكل', 'مسح')).toBe(false);
        expect(shouldSwitchVaultFilterForNewScan('', 'مسح')).toBe(false);
        expect(shouldSwitchVaultFilterForNewScan(undefined, 'مسح')).toBe(false);
    });

    it('يبدّل الفلتر فقط إن كان الحالي سيُخفي المسح', () => {
        expect(shouldSwitchVaultFilterForNewScan('مسودة', 'مسح')).toBe(true);
        expect(shouldSwitchVaultFilterForNewScan('مسح', 'مسح')).toBe(false);
    });
});
