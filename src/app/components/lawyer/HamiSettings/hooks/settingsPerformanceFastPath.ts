import {
    applyReduceMotionToDom,
    markSettingsDomFastPath,
    type AppSettingsState,
} from '@/app/services/settings';
import {
    applyLitePerformanceDataset,
    normalizeLitePerformanceMode,
} from '@/app/runtime/devicePerformanceTier';

export function applyPerformanceFastPath(
    partial: Partial<AppSettingsState['performance']>,
    snapshot: AppSettingsState,
): boolean {
    const keys = Object.keys(partial);
    if (keys.length !== 1) return false;

    if (Object.prototype.hasOwnProperty.call(partial, 'enableAnimations')) {
        const enableAnimations =
            typeof partial.enableAnimations === 'boolean'
                ? partial.enableAnimations
                : snapshot.performance.enableAnimations;
        applyReduceMotionToDom(snapshot.appearance.reduceMotion, enableAnimations);
        markSettingsDomFastPath();
        return true;
    }

    if (Object.prototype.hasOwnProperty.call(partial, 'litePerformance')) {
        applyLitePerformanceDataset(normalizeLitePerformanceMode(partial.litePerformance));
        markSettingsDomFastPath();
        return true;
    }

    return false;
}
