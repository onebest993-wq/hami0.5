import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import {
    loadSettingsSection,
    prefetchAllSettingsSections,
    prefetchPersistedSettingsSection,
} from '@/app/components/lawyer/HamiSettings/settingsSectionLoader';
import { preloadAllSettingsSectionComponents } from '@/app/components/lawyer/HamiSettings/settingsSectionRegistry';
import { readPersistedSettingsSection } from '@/app/components/lawyer/HamiSettings/settingsSectionPersistence';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';

/** عند hover/لمس أيقونة الإعدادات — shell + كل الأقسام في الخلفية */
export function warmSettingsOnHover(): void {
    prefetchHamiSettingsModule();
    prefetchPersistedSettingsSection();
    prefetchAllSettingsSections();
    scheduleIdleWork(
        () => {
            void preloadAllSettingsSectionComponents().catch(() => undefined);
        },
        { minDelayMs: 0, timeoutMs: 6_000 },
    );
}

/** عند فتح الإعدادات — تحميل متوازٍ فوري للـ shell والتبويبات */
export function warmSettingsOnOpen(): void {
    warmSettingsOnHover();
    const persisted = readPersistedSettingsSection();
    void Promise.all([
        loadSettingsSection(persisted),
        preloadAllSettingsSectionComponents(),
    ]).catch(() => undefined);
}

/** تحميل كامل قبل أول paint للإعدادات — يُستدعى من pointerdown */
export function primeSettingsShellForOpen(): void {
    warmSettingsOnOpen();
}
