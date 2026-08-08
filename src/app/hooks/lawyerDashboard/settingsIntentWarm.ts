import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
import { prefetchSettingsDialogs } from '@/app/components/lawyer/HamiSettings/settingsDialogPrefetch';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { shouldAllowIntentWarmFromDom } from '@/app/services/settings/intentWarmGate';

async function loadSettingsWarmModules() {
    const [{ loadSettingsSection, prefetchAllSettingsSections, prefetchPersistedSettingsSection }, registry, persistence] =
        await Promise.all([
            import('@/app/components/lawyer/HamiSettings/settingsSectionLoader'),
            import('@/app/components/lawyer/HamiSettings/settingsSectionRegistry'),
            import('@/app/components/lawyer/HamiSettings/settingsSectionPersistence'),
        ]);
    return {
        loadSettingsSection,
        prefetchAllSettingsSections,
        prefetchPersistedSettingsSection,
        preloadAllSettingsSectionComponents: registry.preloadAllSettingsSectionComponents,
        resolveSettingsSectionComponent: registry.resolveSettingsSectionComponent,
        readPersistedSettingsSection: persistence.readPersistedSettingsSection,
    };
}

function warmRemainingSectionsIdle(): void {
    if (!shouldAllowIntentWarmFromDom()) return;
    scheduleIdleWork(
        () => {
            void loadSettingsWarmModules()
                .then((m) => {
                    m.prefetchAllSettingsSections();
                    return m.preloadAllSettingsSectionComponents();
                })
                .catch(() => undefined);
        },
        { minDelayMs: 0, timeoutMs: 6_000 },
    );
}

/** عند hover/لمس أيقونة الإعدادات — shell + بوابة MainView + التبويب النشط؛ الباقي idle */
export function warmSettingsOnHover(): void {
    if (typeof window === 'undefined') return;
    prefetchSettingsDialogs();
    prefetchSettingsOverlayEntry();
    if (!shouldAllowIntentWarmFromDom()) {
        prefetchHamiSettingsModule();
        return;
    }
    if (isLitePerformanceActive()) {
        prefetchHamiSettingsModule();
        return;
    }
    prefetchHamiSettingsModule();
    void loadSettingsWarmModules()
        .then((m) => {
            m.prefetchPersistedSettingsSection();
            queueMicrotask(() => {
                void m.preloadAllSettingsSectionComponents().catch(() => undefined);
            });
        })
        .catch(() => undefined);
    warmRemainingSectionsIdle();
}

export function warmSettingsOnOpen(): void {
    prefetchSettingsDialogs();
    prefetchSettingsOverlayEntry();
    prefetchHamiSettingsModule();
    void loadSettingsWarmModules()
        .then((m) => {
            const persisted = m.readPersistedSettingsSection();
            return Promise.all([
                m.resolveSettingsSectionComponent(persisted),
                m.preloadAllSettingsSectionComponents(),
            ]);
        })
        .catch(() => undefined);
}

/** pointerdown — shell + كل التبويبات بالتوازي */
export function primeSettingsShellForOpen(): void {
    prefetchSettingsDialogs();
    prefetchSettingsOverlayEntry();
    prefetchHamiSettingsModule();
    void loadSettingsWarmModules()
        .then((m) => m.preloadAllSettingsSectionComponents())
        .catch(() => undefined);
}
