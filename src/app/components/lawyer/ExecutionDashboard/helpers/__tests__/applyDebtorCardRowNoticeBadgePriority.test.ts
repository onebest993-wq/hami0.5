import { describe, expect, it } from 'vitest';
import { applyDebtorCardRowNoticeBadgePriority } from '../applyDebtorCardRowNoticeBadgePriority';

describe('applyDebtorCardRowNoticeBadgePriority', () => {
    const base = {
        rowIsDeceased: false,
        isRepresentingDebtor: false,
        isPrimary: true,
        hasSummonsMarker: true,
        primaryMemoNoticeBadge: { id: 'memo' },
        rowPublicationNoticeBadge: { id: 'pub' },
        regularTablighBadge: { id: 'tabligh' },
        rowTaklifAssignmentBadge: null as { id: string } | null,
        showUnservedMemoBadge: true,
    };

    it('يفضّل تكليف الموظف على باقي الشارات ويخفي غير مبلّغ', () => {
        const result = applyDebtorCardRowNoticeBadgePriority({
            ...base,
            rowTaklifAssignmentBadge: { id: 'taklif' },
        });
        expect(result.rowTaklifAssignmentBadge).toEqual({ id: 'taklif' });
        expect(result.rowMemoNoticeBadge).toBeNull();
        expect(result.rowPublicationNoticeBadgeResolved).toBeNull();
        expect(result.rowRegularTablighBadge).toBeNull();
        expect(result.rowShowSummonsBadge).toBe(false);
        expect(result.rowShowUnservedMemoBadge).toBe(false);
    });

    it('يفضّل النشر على المذكرة والتبليغ ويخفي غير مبلّغ', () => {
        const result = applyDebtorCardRowNoticeBadgePriority({
            ...base,
            rowTaklifAssignmentBadge: null,
        });
        expect(result.rowPublicationNoticeBadgeResolved).toEqual({ id: 'pub' });
        expect(result.rowMemoNoticeBadge).toBeNull();
        expect(result.rowRegularTablighBadge).toBeNull();
        expect(result.rowShowSummonsBadge).toBe(false);
        expect(result.rowShowUnservedMemoBadge).toBe(false);
    });

    it('يخفي الشارات عند تمثيل المدين بما فيها غير مبلّغ', () => {
        const result = applyDebtorCardRowNoticeBadgePriority({
            ...base,
            rowPublicationNoticeBadge: null,
            isRepresentingDebtor: true,
        });
        expect(result.rowMemoNoticeBadge).toBeNull();
        expect(result.rowRegularTablighBadge).toBeNull();
        expect(result.rowShowSummonsBadge).toBe(false);
        expect(result.rowPublicationNoticeBadgeResolved).toBeNull();
        expect(result.rowShowUnservedMemoBadge).toBe(false);
    });

    it('يعيد التبليغ الاعتيادي كشارة استدعاء عند عدم وجود أعلى أولوية', () => {
        const result = applyDebtorCardRowNoticeBadgePriority({
            ...base,
            rowPublicationNoticeBadge: null,
            primaryMemoNoticeBadge: null,
            hasSummonsMarker: false,
        });
        expect(result.rowRegularTablighBadge).toEqual({ id: 'tabligh' });
        expect(result.rowShowSummonsBadge).toBe(true);
        expect(result.rowShowUnservedMemoBadge).toBe(false);
    });

    it('يظهر غير مبلّغ فقط عند غياب أي مسار تبليغ فعّال', () => {
        const result = applyDebtorCardRowNoticeBadgePriority({
            ...base,
            rowPublicationNoticeBadge: null,
            primaryMemoNoticeBadge: null,
            regularTablighBadge: null,
            hasSummonsMarker: false,
            showUnservedMemoBadge: true,
        });
        expect(result.rowShowUnservedMemoBadge).toBe(true);
        expect(result.rowMemoNoticeBadge).toBeNull();
        expect(result.rowRegularTablighBadge).toBeNull();
        expect(result.rowPublicationNoticeBadgeResolved).toBeNull();
    });

    it('لا يظهر غير مبلّغ إذا الاشتقاق الخام false', () => {
        const result = applyDebtorCardRowNoticeBadgePriority({
            ...base,
            rowPublicationNoticeBadge: null,
            primaryMemoNoticeBadge: null,
            regularTablighBadge: null,
            hasSummonsMarker: false,
            showUnservedMemoBadge: false,
        });
        expect(result.rowShowUnservedMemoBadge).toBe(false);
    });
});
