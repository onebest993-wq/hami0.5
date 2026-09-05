import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';

/** بوابة + شِل فقط — بلا تبويبات ثانوية حتى لا تزاحم طلاء الأمن */
function prefetchSettingsShellChain(): void {
    prefetchSettingsOverlayEntry();
    prefetchHamiSettingsModule();
}

/** hover/لمس أيقونة الإعدادات — بوابة + shell فقط */
export function warmSettingsOnHover(): void {
    if (typeof window === 'undefined') return;
    prefetchSettingsShellChain();
}

export function warmSettingsOnOpen(): void {
    void import('@/app/runtime/sectionChunkRecency')
        .then((m) => m.rememberOpenedSectionChunk('settings'))
        .catch(() => undefined);
    prefetchSettingsShellChain();
}

/** pointerdown — جذع الفتح فقط؛ المنظر عند نية تبويبه */
export function primeSettingsShellForOpen(): void {
    prefetchSettingsShellChain();
}
