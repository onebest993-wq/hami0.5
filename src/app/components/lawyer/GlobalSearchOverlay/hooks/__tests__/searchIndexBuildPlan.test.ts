import { describe, expect, it } from 'vitest';
import { planSearchIndexBuild, resolveSearchIndexUiFlags } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildPlan';
import { emptyGlobalSearchExtras } from '@/app/services/globalSearchExtrasCache';
import { computeGlobalSearchIndexKey } from '@/app/services/globalSearchIndexPrepare';
import type { BuildGlobalSearchIndexInput } from '@/app/services/globalSearchIndex';

function indexKey(overrides: Partial<BuildGlobalSearchIndexInput> = {}): string {
    return computeGlobalSearchIndexKey({
        files: [],
        globalNotes: [],
        cases: [],
        userId: 'u1',
        extras: emptyGlobalSearchExtras(),
        ...overrides,
    });
}

const base = {
    overlayOpen: true,
    cacheKey: 'index-key',
    activeKey: null,
    hasCachedIndex: false,
};

describe('planSearchIndexBuild', () => {
    it('يطبّق الكاش عند الإغلاق', () => {
        const plan = planSearchIndexBuild({
            ...base,
            overlayOpen: false,
            hasCachedIndex: true,
        });
        expect(plan).toEqual({
            steps: [{ type: 'apply-cached', cacheKey: 'index-key' }],
            showsBuildingIndicator: false,
        });
    });

    it('لا يفعل شيئاً عند الإغلاق بلا كاش', () => {
        const plan = planSearchIndexBuild({ ...base, overlayOpen: false });
        expect(plan.steps).toEqual([]);
    });

    it('يبني عند الفتح بلا كاش', () => {
        const plan = planSearchIndexBuild({ ...base, overlayOpen: true });
        expect(plan).toEqual({
            steps: [{ type: 'build' }],
            showsBuildingIndicator: true,
        });
    });

    it('لا يعيد البناء إذا activeKey يطابق cacheKey والكاش موجود', () => {
        const plan = planSearchIndexBuild({
            ...base,
            hasCachedIndex: true,
            activeKey: 'index-key',
        });
        expect(plan.steps).toEqual([]);
        expect(plan.showsBuildingIndicator).toBe(false);
    });

    it('يُطبّق كاش جديد عند تغيّر المفتاح (وصول extras)', () => {
        const plan = planSearchIndexBuild({
            ...base,
            hasCachedIndex: true,
            activeKey: 'old-key',
            cacheKey: 'index-key-with-extras',
        });
        expect(plan).toEqual({
            steps: [{ type: 'apply-cached', cacheKey: 'index-key-with-extras' }],
            showsBuildingIndicator: false,
        });
    });

    it('يبني من جديد عند تغيّر المفتاح بلا كاش (extras وصلت لأول مرة)', () => {
        const plan = planSearchIndexBuild({
            ...base,
            cacheKey: 'index-key-with-extras',
            activeKey: 'index-key-without-extras',
        });
        expect(plan).toEqual({
            steps: [{ type: 'build' }],
            showsBuildingIndicator: true,
        });
    });
});

describe('resolveSearchIndexUiFlags', () => {
    it('يعامل الفهرس البائد كتحميل أثناء إعادة البناء', () => {
        expect(
            resolveSearchIndexUiFlags({
                hasFuse: true,
                isBuildingIndex: true,
                appliedKey: 'old-key',
                cacheKey: 'new-key',
            }),
        ).toEqual({ isLoadingIndex: true, isEnrichingIndex: false });
    });

    it('لا يُظهر تحميلاً إذا المفتاح الحالي مطبّق', () => {
        expect(
            resolveSearchIndexUiFlags({
                hasFuse: true,
                isBuildingIndex: false,
                appliedKey: 'k',
                cacheKey: 'k',
            }),
        ).toEqual({ isLoadingIndex: false, isEnrichingIndex: false });
    });

    it('التحميل الأول بلا fuse', () => {
        expect(
            resolveSearchIndexUiFlags({
                hasFuse: false,
                isBuildingIndex: true,
                appliedKey: null,
                cacheKey: 'k',
            }),
        ).toEqual({ isLoadingIndex: true, isEnrichingIndex: false });
    });

    it('وصول extras لا يخفي نتائج الملفات إن وُجد fuse', () => {
        const applied = indexKey();
        const next = indexKey({
            extras: { ...emptyGlobalSearchExtras(), communityPosts: [{ id: 'p1' } as never] },
        });
        expect(applied).not.toBe(next);
        expect(
            resolveSearchIndexUiFlags({
                hasFuse: true,
                isBuildingIndex: true,
                appliedKey: applied,
                cacheKey: next,
            }),
        ).toEqual({ isLoadingIndex: false, isEnrichingIndex: true });
    });

    it('وصول extras بلا fuse يبقى تحميلاً', () => {
        const applied = indexKey();
        const next = indexKey({
            extras: { ...emptyGlobalSearchExtras(), vaultDocs: [{ id: 'd1' } as never] },
        });
        expect(
            resolveSearchIndexUiFlags({
                hasFuse: false,
                isBuildingIndex: true,
                appliedKey: applied,
                cacheKey: next,
            }),
        ).toEqual({ isLoadingIndex: true, isEnrichingIndex: false });
    });

    it('تغيّر الملفات يبقى تحميلاً حتى مع fuse', () => {
        const applied = indexKey();
        const next = indexKey({
            files: [{ id: 9, type: 'lawsuit', status: 'active' } as BuildGlobalSearchIndexInput['files'][number]],
        });
        expect(
            resolveSearchIndexUiFlags({
                hasFuse: true,
                isBuildingIndex: true,
                appliedKey: applied,
                cacheKey: next,
            }),
        ).toEqual({ isLoadingIndex: true, isEnrichingIndex: false });
    });

    it('تغيّر عنوان extras بنفس العدد إثراء لا تحميل', () => {
        const event = {
            id: 'c1',
            userId: 'u1',
            title: 'جلسة أ',
            date: '2026-08-30',
            type: 'hearing' as const,
            createdAt: 't',
            updatedAt: 't',
        };
        const applied = indexKey({
            extras: { ...emptyGlobalSearchExtras(), calendarEvents: [event] },
        });
        const next = indexKey({
            extras: {
                ...emptyGlobalSearchExtras(),
                calendarEvents: [{ ...event, title: 'جلسة ب' }],
            },
        });
        expect(applied).not.toBe(next);
        expect(
            resolveSearchIndexUiFlags({
                hasFuse: true,
                isBuildingIndex: true,
                appliedKey: applied,
                cacheKey: next,
            }),
        ).toEqual({ isLoadingIndex: false, isEnrichingIndex: true });
    });
});
