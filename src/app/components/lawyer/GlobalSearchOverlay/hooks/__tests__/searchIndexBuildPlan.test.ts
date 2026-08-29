import { describe, expect, it } from 'vitest';
import { planSearchIndexBuild } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildPlan';

const base = {
    overlayOpen: true,
    cacheKey: 'index-key',
    extrasReady: false,
    isLoadingExtras: false,
    activeKey: null,
    hasFuseInState: false,
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
            extrasReady: true,
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
            extrasReady: true,
            cacheKey: 'index-key-with-extras',
            activeKey: 'index-key-without-extras',
        });
        expect(plan).toEqual({
            steps: [{ type: 'build' }],
            showsBuildingIndicator: true,
        });
    });
});
