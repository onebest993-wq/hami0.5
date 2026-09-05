import { isSearchIndexKeyExtrasOnlyChange } from '@/app/services/globalSearchExtrasSignature';

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
 * وصول extras يغيّر مقطع gsx فقط: إعادة بناء واحدة دون إخفاء نتائج الملفات.
 */

export type SearchIndexBuildStep =
    | { type: 'apply-cached'; cacheKey: string }
    | { type: 'build' };

type SearchIndexBuildPlan = {
    steps: SearchIndexBuildStep[];
    showsBuildingIndicator: boolean;
};

type SearchIndexPlanInput = {
    overlayOpen: boolean;
    cacheKey: string;
    activeKey: string | null;
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

export { isSearchIndexKeyExtrasOnlyChange };

/** لا تبحث بفهرس مفتاحه غير الحالي — حذف ملف/تبديل حساب يغيّر البادئة. extras وحدها إثراء إن وُجد fuse. */
export function resolveSearchIndexUiFlags(input: {
    hasFuse: boolean;
    isBuildingIndex: boolean;
    appliedKey: string | null;
    cacheKey: string;
}): { isLoadingIndex: boolean; isEnrichingIndex: boolean } {
    const keyCurrent =
        input.hasFuse && Boolean(input.cacheKey) && input.appliedKey === input.cacheKey;
    const keepVisibleIndex =
        input.hasFuse && isSearchIndexKeyExtrasOnlyChange(input.appliedKey, input.cacheKey);
    return {
        isLoadingIndex: input.isBuildingIndex && !keyCurrent && !keepVisibleIndex,
        isEnrichingIndex: input.isBuildingIndex && (keyCurrent || keepVisibleIndex),
    };
}
