import { beforeEach, describe, expect, it } from 'vitest';
import {
    addCustomCategory,
    getVisibleVaultCustomCategories,
    mergeCustomCategoriesFromDocs,
} from '@/app/services/vaultCustomCategories';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('vaultCustomCategories', () => {
    beforeEach(() => {
        localStorage.clear();
        SecureStoreService.deleteItemSync('hami:smartvault:custom-categories:v1:user-1');
    });

    it('يحجب تصنيف المنتدى من التصنيفات المرئية', () => {
        expect(
            getVisibleVaultCustomCategories(['المنتدى', 'PDF', 'صورة']),
        ).toEqual(['صورة', 'PDF']);
    });

    it('يرتب التصنيفات الأساسية ويُبقي تسجيل صوتي إن وُجد', () => {
        expect(
            getVisibleVaultCustomCategories(['عقود', 'تسجيل صوتي', 'صورة', 'PDF']),
        ).toEqual(['صورة', 'PDF', 'تسجيل صوتي', 'عقود']);
    });

    it('لا يدمج المنتدى من الملفات إلى التصنيفات المحفوظة', () => {
        expect(
            mergeCustomCategoriesFromDocs('user-1', [
                { customCategory: 'المنتدى' },
                { customCategory: 'تسجيل صوتي' },
                { customCategory: 'PDF' },
            ]),
        ).toEqual(['PDF', 'تسجيل صوتي']);
    });

    it('يقطع اسم التصنيف عند 80 حرفاً ويزيل الوسوم', () => {
        const long = 'أ'.repeat(120);
        const saved = addCustomCategory('user-1', `<b>${long}</b>`);
        expect(saved[0]?.length).toBe(80);
        expect(saved[0]).not.toContain('<');
    });
});
