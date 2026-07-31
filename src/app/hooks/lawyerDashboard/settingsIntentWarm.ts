import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
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
        })
        .catch(() => undefined);
    warmRemainingSectionsIdle();
}

/**
 * عند فتح الإعدادات — التبويب الظاهر فوراً + باقي الأقسام في microtask
 * حتى يكون التنقل بين التبويبات فورياً بلا انتظار idle طويل.
 */
export function warmSettingsOnOpen(): void {
    prefetchSettingsOverlayEntry();
    prefetchHamiSettingsModule();
    void loadSettingsWarmModules()
        .then((m) => {
            const persisted = m.readPersistedSettingsSection();
            const first = [
                m.resolveSettingsSectionComponent(persisted),
                ...(persisted !== 'appearance'
                    ? [m.resolveSettingsSectionComponent('appearance')]
                    : []),
            ];
            return Promise.all(first).then(() => {
                if (!shouldAllowIntentWarmFromDom()) return;
                queueMicrotask(() => {
                    m.prefetchAllSettingsSections();
                    void m.preloadAllSettingsSectionComponents().catch(() => undefined);
                });
            });
        })
        .catch(() => undefined);
}

/** pointerdown — بوابة MainView + shell + تبويب محفوظ + المظهر */
export function primeSettingsShellForOpen(): void {
    prefetchSettingsOverlayEntry();
    prefetchHamiSettingsModule();
    void loadSettingsWarmModules()
        .then((m) => {
            const persisted = m.readPersistedSettingsSection();
            const jobs = [m.resolveSettingsSectionComponent(persisted)];
            if (persisted !== 'appearance') {
                jobs.push(m.resolveSettingsSectionComponent('appearance'));
            }
            return Promise.all(jobs);
        })
        .catch(() => undefined);
}
