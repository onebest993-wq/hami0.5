import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import {
    loadSettingsSection,
    prefetchAllSettingsSections,
    prefetchPersistedSettingsSection,
} from '@/app/components/lawyer/HamiSettings/settingsSectionLoader';
import { readPersistedSettingsSection } from '@/app/components/lawyer/HamiSettings/settingsSectionPersistence';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { shouldAggressiveHeaderShellWarm } from '@/app/hooks/lawyerDashboard/headerShellIntentWarm';

/** عند hover/لمس أيقونة الإعدادات: chunk + التبويب المحفوظ */
export function warmSettingsOnHover(): void {
    prefetchHamiSettingsModule();
    prefetchPersistedSettingsSection();
}

/** عند فتح الإعدادات — shell + التبويب النشط فوراً؛ بقية الأقسام idle */
export function warmSettingsOnOpen(): void {
    warmSettingsOnHover();
    void loadSettingsSection(readPersistedSettingsSection()).catch(() => undefined);
    if (typeof window === 'undefined' || !shouldAggressiveHeaderShellWarm()) return;
    scheduleIdleWork(
        () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            prefetchAllSettingsSections();
        },
        { minDelayMs: 600, timeoutMs: 10_000 },
    );
}
