import { beforeEach, describe, expect, it } from 'vitest';
import {
    getVisibleVaultCustomCategories,
    mergeCustomCategoriesFromDocs,
} from '@/app/services/vaultCustomCategories';

describe('vaultCustomCategories', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('يحجب تصنيف المنتدى من التصنيفات المرئية', () => {
        expect(
            getVisibleVaultCustomCategories(['المنتدى', 'PDF', 'صورة']),
        ).toEqual(['PDF', 'صورة']);
    });

    it('يرتب التصنيفات الأساسية ويُبقي تسجيل صوتي إن وُجد', () => {
        expect(
            getVisibleVaultCustomCategories(['عقود', 'تسجيل صوتي', 'صورة', 'PDF']),
        ).toEqual(['PDF', 'صورة', 'تسجيل صوتي', 'عقود']);
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
});
