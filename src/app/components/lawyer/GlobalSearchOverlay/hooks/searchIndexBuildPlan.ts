/**
 * مخطّط بناء فهرس البحث — مفتاح واحد لكل لقطة حالة (بلا core/full مزدوج).
 *
 * ┌─────────────┬──────────────┬─────────────┬─────────────────────────────┐
 * │ overlayOpen │ hasCachedIndex│ activeKey   │ الخطة (steps)               │
 * │             │ لـ cacheKey  │ === cacheKey│                             │
 * ├─────────────┼──────────────┼─────────────┼─────────────────────────────┤
 * │ false       │ نعم          │ *           │ apply-cached                │
 * │ false       │ لا           │ *           │ (فارغ — لا بناء عند الإغلاق)│
 * │ true        │ نعم          │ نعم         │ (فارغ — الفهرس جاهز)        │
 * │ true        │ نعم          │ لا          │ apply-cached                │
 * │ true        │ لا           │ *           │ build                       │
 * └─────────────┴──────────────┴─────────────┴─────────────────────────────┘
 *
 * عند وصول extras: يتغيّر cacheKey → إعادة بناء واحدة (تأخير ~100–300ms مقبول
 * مقابل إزالة مسار core→full المزدوج).
 *
 * extrasReady = Boolean(extras) — الفهرس يُبنى بـ extras فقط عند الجاهزية.
 */

export type SearchIndexBuildStep =
    | { type: 'apply-cached'; cacheKey: string }
    | { type: 'build' };

export type SearchIndexBuildPlan = {
    steps: SearchIndexBuildStep[];
    showsBuildingIndicator: boolean;
};

export type SearchIndexPlanInput = {
    overlayOpen: boolean;
    cacheKey: string;
    extrasReady: boolean;
    isLoadingExtras: boolean;
    activeKey: string | null;
    hasFuseInState: boolean;
    hasCachedIndex: boolean;
};

export function planSearchIndexBuild(input: SearchIndexPlanInput): SearchIndexBuildPlan {
    const { overlayOpen, cacheKey, activeKey, hasCachedIndex } = input;

    if (hasCachedIndex) {
        if (!overlayOpen) {
            return {
                steps: [{ type: 'apply-cached', cacheKey }],
                showsBuildingIndicator: false,
            };
        }
        if (activeKey === cacheKey) {
            return { steps: [], showsBuildingIndicator: false };
        }
        return {
            steps: [{ type: 'apply-cached', cacheKey }],
            showsBuildingIndicator: false,
        };
    }

    if (!overlayOpen) {
        return { steps: [], showsBuildingIndicator: false };
    }

    return {
        steps: [{ type: 'build' }],
        showsBuildingIndicator: true,
    };
}
