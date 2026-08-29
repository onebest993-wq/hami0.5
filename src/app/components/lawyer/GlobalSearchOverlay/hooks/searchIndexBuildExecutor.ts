import type Fuse from 'fuse.js';
import type { BuildGlobalSearchIndexInput, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { getCachedGlobalSearchIndex, resolveGlobalSearchIndex } from '@/app/services/globalSearchIndexRuntime';
import {
    getCachedGlobalSearchFuse,
    getOrCreateGlobalSearchFuse,
} from '@/app/services/globalSearchFuse';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import {
    planSearchIndexBuild,
    type SearchIndexBuildStep,
} from '@/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildPlan';

export function resolveSearchIndexPriority(overlayOpen: boolean): 'interactive' | 'idle' {
    if (!overlayOpen) return 'idle';
    try {
        const s = getLawyerSettingsSnapshot();
        if (isLitePerformanceActive(s.performance.litePerformance)) return 'idle';
    } catch {
        /* ignore */
    }
    return 'interactive';
}

export async function resolveFuseForKey(
    cacheKey: string,
    input: BuildGlobalSearchIndexInput,
    priority: 'interactive' | 'idle',
): Promise<Fuse<GlobalSearchEntry>> {
    const cachedFuse = getCachedGlobalSearchFuse(cacheKey);
    if (cachedFuse) return cachedFuse;

    const cachedIndex = getCachedGlobalSearchIndex(cacheKey);
    const index = cachedIndex ?? (await resolveGlobalSearchIndex(input, priority));
    return getOrCreateGlobalSearchFuse(cacheKey, index);
}

export type SearchIndexBuildSnapshot = {
    overlayOpen: boolean;
    cacheKey: string;
    /** extras محمّلة ومُضمّنة في preparedInput */
    extrasReady: boolean;
    isLoadingExtras: boolean;
    activeKey: string | null;
    hasFuseInState: boolean;
};

export type SearchIndexBuildCallbacks = {
    applyFuse: (fuse: Fuse<GlobalSearchEntry>, key: string) => void;
    clearFuse: () => void;
    setBuilding: (building: boolean) => void;
    isCancelled: () => boolean;
    resolveFuse: (
        key: string,
        input: BuildGlobalSearchIndexInput,
        priority: 'interactive' | 'idle',
    ) => Promise<Fuse<GlobalSearchEntry>>;
};

async function executeSearchIndexStep(
    step: SearchIndexBuildStep,
    cacheKey: string,
    preparedInput: BuildGlobalSearchIndexInput,
    priority: 'interactive' | 'idle',
    callbacks: SearchIndexBuildCallbacks,
): Promise<boolean> {
    const { applyFuse, resolveFuse, isCancelled } = callbacks;

    if (step.type === 'apply-cached') {
        const hit = getCachedGlobalSearchFuse(step.cacheKey);
        if (hit && !isCancelled()) {
            applyFuse(hit, step.cacheKey);
        }
        return true;
    }

    try {
        const instance = await resolveFuse(cacheKey, preparedInput, priority);
        if (!isCancelled()) applyFuse(instance, cacheKey);
        return true;
    } catch {
        return false;
    }
}

/** ينفّذ خطة بناء الفهرس — راجع searchIndexBuildPlan.ts للمخطّط البصري. */
export async function runSearchIndexBuild(
    snapshot: SearchIndexBuildSnapshot,
    preparedInput: BuildGlobalSearchIndexInput,
    priority: 'interactive' | 'idle',
    callbacks: SearchIndexBuildCallbacks,
): Promise<void> {
    const { clearFuse, setBuilding, isCancelled } = callbacks;
    const plan = planSearchIndexBuild({
        ...snapshot,
        hasCachedIndex: Boolean(getCachedGlobalSearchFuse(snapshot.cacheKey)),
    });

    if (!plan.steps.length) {
        setBuilding(false);
        return;
    }

    setBuilding(plan.showsBuildingIndicator);

    for (const step of plan.steps) {
        if (isCancelled()) return;

        const ok = await executeSearchIndexStep(
            step,
            snapshot.cacheKey,
            preparedInput,
            priority,
            callbacks,
        );

        if (step.type === 'build' && !ok && !snapshot.hasFuseInState) {
            if (!isCancelled()) clearFuse();
        }
    }

    if (!isCancelled()) setBuilding(false);
}
