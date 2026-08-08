import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import type { ThemeKey, ShapeKey } from '@/app/types/common';
import { LAWYER_SETTINGS_V2_DEFAULTS } from './defaults';
import type { AppSettingsState } from './types';
import { SETTINGS_SCHEMA_VERSION } from './types';
import { normalizeLitePerformanceMode } from '@/app/runtime/devicePerformanceTier';
import { normalizeHomeLayout } from './homeLayout';
import { normalizeNotificationSettings } from './notificationSettings';
import { normalizeGlassOpacity } from './surfaceAppearance';

let cached: AppSettingsState | null = null;
let cacheAt = 0;
let live: AppSettingsState | null = null;
let liveAt = 0;

function ensureRuntimeListener(): void {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { __hamiSettingsRuntimeInstalled?: boolean };
    if (w.__hamiSettingsRuntimeInstalled) return;
    w.__hamiSettingsRuntimeInstalled = true;
    window.addEventListener('hami:settings-updated', (evt) => {
        try {
            const next = (evt as CustomEvent).detail as unknown;
            if (!next || typeof next !== 'object') return;
            live = next as AppSettingsState;
            liveAt = Date.now();
            cached = live;
            cacheAt = liveAt;
        } catch {
            return;
        }
    });
}

export function invalidateLawyerSettingsCache(): void {
    cached = null;
    cacheAt = 0;
}

export function publishLawyerSettingsLive(next: AppSettingsState): void {
    live = next;
    liveAt = Date.now();
    cached = next;
    cacheAt = liveAt;
}

function clampGlassOpacity(value: unknown): number {
    return normalizeGlassOpacity(value);
}

function clamp01(value: unknown, fallback: number): number {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.min(1, Math.max(0, n));
}

/**
 * لقطة sync خفيفة بلا migrate / backgroundPresets / homeLayout —
 * المخطط الحالي يُدمَج سطحياً؛ الإرث يأخذ defaults + theme/shape حتى يكتمل migrate بعد paint.
 */
export function hydrateLawyerSettingsFast(
    raw: unknown,
    themeKey?: ThemeKey | null,
    shapeKey?: ShapeKey | null,
): AppSettingsState {
    if (raw && typeof raw === 'object') {
        const obj = raw as Partial<AppSettingsState> & Record<string, unknown>;
        if (obj.version === SETTINGS_SCHEMA_VERSION && obj.appearance) {
            const appearance = {
                ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                ...obj.appearance,
                themeMode: 'dark' as const,
                theme: (themeKey ?? obj.appearance.theme ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.theme) as ThemeKey,
                shape: (shapeKey ?? obj.appearance.shape ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.shape) as ShapeKey,
                glassOpacity: clampGlassOpacity(obj.appearance.glassOpacity),
                backgroundPreset: obj.appearance.backgroundPreset ?? 'none',
                backgroundPatternOpacity: clamp01(
                    obj.appearance.backgroundPatternOpacity,
                    LAWYER_SETTINGS_V2_DEFAULTS.appearance.backgroundPatternOpacity,
                ),
                backgroundPatternBlur: clamp01(
                    obj.appearance.backgroundPatternBlur,
                    LAWYER_SETTINGS_V2_DEFAULTS.appearance.backgroundPatternBlur,
                ),
                homeContainerBorder: obj.appearance.homeContainerBorder !== false,
                wallpaper: undefined,
            };
            return {
                version: SETTINGS_SCHEMA_VERSION,
                appearance,
                security: {
                    ...LAWYER_SETTINGS_V2_DEFAULTS.security,
                    ...obj.security,
                    localOnlyMode: obj.security?.localOnlyMode === true,
                },
                data: { ...LAWYER_SETTINGS_V2_DEFAULTS.data, ...obj.data },
                performance: {
                    ...LAWYER_SETTINGS_V2_DEFAULTS.performance,
                    ...obj.performance,
                    litePerformance: normalizeLitePerformanceMode(obj.performance?.litePerformance),
                },
                homeLayout: normalizeHomeLayout(obj.homeLayout ?? LAWYER_SETTINGS_V2_DEFAULTS.homeLayout),
            notifications: normalizeNotificationSettings(obj.notifications),
            };
        }
    }

    const base: AppSettingsState = {
        ...LAWYER_SETTINGS_V2_DEFAULTS,
        appearance: { ...LAWYER_SETTINGS_V2_DEFAULTS.appearance },
    };
    if (themeKey) base.appearance = { ...base.appearance, theme: themeKey };
    if (shapeKey) base.appearance = { ...base.appearance, shape: shapeKey };
    return base;
}

/** Sync read for services/hooks outside React (short TTL cache). */
export function getLawyerSettingsSnapshot(): AppSettingsState {
    ensureRuntimeListener();
    const now = Date.now();
    if (live && now - liveAt < 60_000) return live;
    if (cached && now - cacheAt < 400) return cached;
    const raw = persistenceRepository.load('lawyer_settings');
    const theme = persistenceRepository.load<ThemeKey>('lawyer_theme');
    const shape = persistenceRepository.load<ShapeKey>('lawyer_shape');
    cached = hydrateLawyerSettingsFast(raw, theme, shape);
    cacheAt = now;
    return cached;
}
