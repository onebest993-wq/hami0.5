import { useLawyerSettingsOptional } from '@/app/context/LawyerSettingsContext';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';

/** يتزامن مع data-hami-lite وإعدادات الأداء */
export function useLitePerformanceActive(): boolean {
    const ctx = useLawyerSettingsOptional();
    return isLitePerformanceActive(ctx?.settings.performance.litePerformance);
}
