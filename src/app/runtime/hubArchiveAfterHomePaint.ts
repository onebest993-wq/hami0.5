/**
 * بعد طلاء شبكة الرئيسية: بايتات فتح مخازن الهب — بلا تركيب Host.
 *
 * نافذة CSS-uncover (~800ms) بعد content-ready هي رأس مال أول نقرة فورية.
 * الجلوس لا يركّب keep-alive؛ النية/الفتح هما من يسلّحان Host.
 * لا يُستدعى من مسار الـ splash ولا من homeMainGridPaintGate.
 */
import { isSectionBackgroundPrefetchAllowed } from '@/app/runtime/sectionPrefetchPolicy';

let prefetchStarted = false;

export function prefetchHubArchivesAfterHomePaint(): void {
    if (typeof window === 'undefined' || prefetchStarted) return;
    if (!isSectionBackgroundPrefetchAllowed({ allowOnLite: true })) return;
    prefetchStarted = true;

    void import('@/app/runtime/executionArchiveOpenSession')
        .then((m) => m.prefetchExecutionArchiveOpen())
        .catch(() => undefined);

    if (isSectionBackgroundPrefetchAllowed()) {
        void import('@/app/runtime/hubArchiveLoader')
            .then((m) => m.prefetchLawsuitArchiveHubModule())
            .catch(() => undefined);
    }
}

export function resetHubArchiveAfterHomePaintForTests(): void {
    prefetchStarted = false;
}
