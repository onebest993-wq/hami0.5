/**
 * كاش بناء كيس المحضر — يُملأ مع تسخين نية المحضر حتى تقدر نواة الإضبارة
 * أن تبني الكيس في نفس دورة النقرة دون استيراد enrich ثابتاً.
 */
import type { FollowupModalSnapshot } from '../followupModalContext';

type FollowupModalSnapshotBuilder = (sources: FollowupModalSnapshot) => FollowupModalSnapshot;

type FollowupModalSnapshotBuilderModule = typeof import('./buildFollowupModalSnapshotInput');

let cachedBuilder: FollowupModalSnapshotBuilder | null = null;
let loadPromise: Promise<FollowupModalSnapshotBuilder> | null = null;

export function peekFollowupModalSnapshotBuilder(): FollowupModalSnapshotBuilder | null {
    return cachedBuilder;
}

export function primeFollowupModalSnapshotBuilder(builder: FollowupModalSnapshotBuilder): void {
    cachedBuilder = builder;
}

export function loadAndCacheFollowupModalSnapshotBuilder(): Promise<FollowupModalSnapshotBuilder> {
    if (cachedBuilder) {
        return Promise.resolve(cachedBuilder);
    }
    if (!loadPromise) {
        loadPromise = import('./buildFollowupModalSnapshotInput')
            .then((m: FollowupModalSnapshotBuilderModule) => {
                cachedBuilder = m.buildFollowupModalSnapshotInput;
                return cachedBuilder;
            })
            .catch((error: unknown) => {
                loadPromise = null;
                throw error;
            });
    }
    return loadPromise;
}

export function resetFollowupModalSnapshotBuilderCacheForTests(): void {
    cachedBuilder = null;
    loadPromise = null;
}
