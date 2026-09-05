/**
 * بعد طلاء شبكة الرئيسية: بايتات فتح مخازن الهب — بلا تركيب Host.
 *
 * نافذة CSS-uncover (~800ms) بعد content-ready هي رأس مال أول نقرة فورية.
 * الجلوس لا يركّب keep-alive؛ النية/الفتح هما من يسلّحان Host.
 * على lite / توفير بيانات / 2G: مسار التنفيذ فقط إن كان آخر قسم. لا يُستدعى من splash.
 */
import {
    isRecencyBackgroundWarmAllowed,
    isSectionBackgroundPrefetchAllowed,
} from '@/app/runtime/sectionPrefetchPolicy';

let prefetchStarted = false;

export function prefetchHubArchivesAfterHomePaint(): void {
    if (typeof window === 'undefined' || prefetchStarted) return;
    const full = isSectionBackgroundPrefetchAllowed();
    const recencyExecution = isRecencyBackgroundWarmAllowed('execution');
    if (!full && !recencyExecution) return;
    prefetchStarted = true;

    void import('@/app/runtime/yieldToMain')
        .then(async ({ yieldToMain }) => {
            const open = await import('@/app/runtime/executionArchiveOpenSession');
            open.prefetchExecutionArchiveOpen();
            if (!isSectionBackgroundPrefetchAllowed()) return;
            await yieldToMain();
            const hub = await import('@/app/runtime/hubArchiveLoader');
            hub.prefetchLawsuitArchiveHubModule();
        })
        .catch(() => undefined);
}

export function resetHubArchiveAfterHomePaintForTests(): void {
    prefetchStarted = false;
}
