/**
 * جاهزية هيكل محضر المتابعة الحي — البنّاء + Host + Portal.
 * يُستدعى من نقرة المحضر قبل setShow حتى لا يُستبدل الإضبارة الحية بهيكل فارغ.
 */
import { LazyExecutionFollowupModalHost } from './executionFollowupHostLazy';
import { LazyExecutionFollowupModalPortal } from './executionFollowupModalLazy';
import {
    loadAndCacheFollowupModalSnapshotBuilder,
    peekFollowupModalSnapshotBuilder,
} from './hooks/followupModalSnapshotBuilderCache';

/** إن لم تكتمل الكِسر خلال هذه المهلة نفتح بالمسار الحالي (InstantFrame) حتى لا تبدو النقرة ميتة */
export const FOLLOWUP_CHROME_FALLBACK_MS = 80;

export function isExecutionFollowupChromeReady(): boolean {
    return (
        peekFollowupModalSnapshotBuilder() != null &&
        LazyExecutionFollowupModalHost.isPreloaded() &&
        LazyExecutionFollowupModalPortal.isPreloaded()
    );
}

export function ensureExecutionFollowupChromeReady(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (isExecutionFollowupChromeReady()) return Promise.resolve();

    const ready = Promise.all([
        loadAndCacheFollowupModalSnapshotBuilder(),
        LazyExecutionFollowupModalHost.preload(),
        LazyExecutionFollowupModalPortal.preload(),
    ]).then(() => undefined);

    return Promise.race([
        ready,
        new Promise<void>((resolve) => {
            window.setTimeout(resolve, FOLLOWUP_CHROME_FALLBACK_MS);
        }),
    ]);
}
