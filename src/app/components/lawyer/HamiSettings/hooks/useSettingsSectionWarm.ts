import { useEffect } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    prefetchSecondarySettingsSections,
    prefetchSettingsSection,
} from '@/app/components/lawyer/HamiSettings/settingsSectionLoad';

/**
 * التحميل الأولي: التبويب الحالي فوراً؛ بقية الأقسام بعد خمول حتى لا تزاحم طلاء الأمن.
 */
export function useSettingsSectionWarm(mounted: boolean, activeSection: SettingsSectionId): void {
    useEffect(() => {
        if (!mounted) return;
        prefetchSettingsSection(activeSection);
    }, [activeSection, mounted]);

    useEffect(() => {
        if (!mounted) return;
        return scheduleIdleWork(prefetchSecondarySettingsSections, { minDelayMs: 0, timeoutMs: 1_200 });
    }, [mounted]);
}
