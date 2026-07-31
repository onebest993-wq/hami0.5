import { useEffect, useRef } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { isHamiSettingsModuleResolved } from '@/app/runtime/hamiSettingsLoader';
import {
    markSettingsPerfPhase,
    reportSettingsPerf,
} from '@/app/services/settings/settingsPerfMetrics';
import { observeSettingsSectionInteractive } from '@/app/components/lawyer/HamiSettings/hooks/observeSettingsSectionInteractive';

export function useSettingsLifecycle(
    open: boolean,
    activeSection: SettingsSectionId,
    userId?: string | null,
    onHydrated?: () => void,
) {
    const reportedRef = useRef(false);

    useEffect(() => {
        if (!open) {
            reportedRef.current = false;
            return;
        }
        markSettingsPerfPhase('first-paint');
    }, [open]);

    useEffect(() => {
        if (!open || reportedRef.current) return;

        const markInteractiveNow = () => {
            if (reportedRef.current) return;
            reportedRef.current = true;
            markSettingsPerfPhase('interactive');
            reportSettingsPerf({
                userId: userId ?? undefined,
                activeSection,
                hadChunkCached: isHamiSettingsModuleResolved(),
            });
            onHydrated?.();
        };

        const stopObserve = observeSettingsSectionInteractive({
            activeSection,
            isDone: () => reportedRef.current,
            onInteractive: markInteractiveNow,
        });

        /* احتياطي — لا يبقى open→interactive معلّقاً إن تأخّر القسم (S1/S9) */
        const fallback = window.setTimeout(markInteractiveNow, 1_200);

        return () => {
            stopObserve();
            window.clearTimeout(fallback);
        };
    }, [activeSection, onHydrated, open, userId]);
}
