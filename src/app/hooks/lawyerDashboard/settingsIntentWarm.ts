import { prefetchSecondarySettingsSections } from '@/app/components/lawyer/HamiSettings/settingsSectionLoad';
import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { shouldAllowIntentWarmFromDom } from '@/app/services/settings/intentWarmGate';

/** Entry + شِل + كل تبويبات المركز — بلا انتظار بعد أول طلاء */
function prefetchSettingsOpenChain(): void {
    prefetchSettingsOverlayEntry();
    prefetchHamiSettingsModule();
    prefetchSecondarySettingsSections();
}

/** hover/لمس أيقونة الإعدادات — بوابة + shell فقط (لا تسخين أقسام وهمي) */
export function warmSettingsOnHover(): void {
    if (typeof window === 'undefined') return;
    if (!shouldAllowIntentWarmFromDom() || isLitePerformanceActive()) {
        prefetchSettingsOverlayEntry();
        prefetchHamiSettingsModule();
        return;
    }
    prefetchSettingsOpenChain();
}

export function warmSettingsOnOpen(): void {
    prefetchSettingsOpenChain();
}

/** pointerdown — نفس سلسلة الفتح */
export function primeSettingsShellForOpen(): void {
    prefetchSettingsOpenChain();
}
