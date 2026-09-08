import { useEffect, useRef } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { isHamiSettingsModuleResolved } from '@/app/runtime/hamiSettingsLoader';
import {
    markSettingsPerfPhase,
    reportSettingsPerf,
} from '@/app/services/settings/settingsPerfMetrics';
import { SETTINGS_INTERACTIVE_FALLBACK_MS } from '@/app/services/settings/settingsPerfBudget';
import { observeSettingsSectionInteractive } from '@/app/components/lawyer/HamiSettings/hooks/observeSettingsSectionInteractive';

let sessionIdCounter = 0;

export function useSettingsLifecycle(
    open: boolean,
    activeSection: SettingsSectionId,
    userId?: string | null,
    onHydrated?: () => void,
) {
    const reportedRef = useRef(false);
    const stopObserveRef = useRef<(() => void) | null>(null);
    const fallbackTimerRef = useRef<number | null>(null);
    const sectionIdRef = useRef(0);
    const activeSectionIdRef = useRef(0);
    const sessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);
    const lastPaintSectionRef = useRef<SettingsSectionId | null>(null);
    const lastPaintOpenRef = useRef<boolean>(false);

    const cleanupActiveGuards = () => {
        if (stopObserveRef.current) {
            try {
                stopObserveRef.current();
            } catch {
                /* ignore */
            }
            stopObserveRef.current = null;
        }
        if (fallbackTimerRef.current !== null) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
    };

    useEffect(() => {
        if (!open) {
            reportedRef.current = false;
            activeSectionIdRef.current = 0;
            lastPaintSectionRef.current = null;
            lastPaintOpenRef.current = false;
            cleanupActiveGuards();
            return;
        }

        if (
            lastPaintOpenRef.current !== open ||
            lastPaintSectionRef.current !== activeSection
        ) {
            lastPaintOpenRef.current = open;
            lastPaintSectionRef.current = activeSection;
            reportedRef.current = false;
            markSettingsPerfPhase('first-paint');
        }

        if (reportedRef.current) return;

        sessionIdCounter += 1;
        const thisSessionId = sessionIdCounter;
        sessionIdRef.current = thisSessionId;
        activeSessionIdRef.current = thisSessionId;

        sectionIdRef.current += 1;
        const currentSectionId = sectionIdRef.current;
        activeSectionIdRef.current = currentSectionId;
        reportedRef.current = false;

        cleanupActiveGuards();

        const markInteractiveNow = () => {
            if (sessionIdRef.current !== activeSessionIdRef.current) return;
            if (activeSectionIdRef.current !== currentSectionId) return;
            if (reportedRef.current) return;
            reportedRef.current = true;
            markSettingsPerfPhase('interactive');
            reportSettingsPerf({
                userId: userId ?? undefined,
                activeSection,
                hadChunkCached: isHamiSettingsModuleResolved(),
            });
            onHydrated?.();
            cleanupActiveGuards();
        };

        stopObserveRef.current = observeSettingsSectionInteractive({
            activeSection,
            isDone: () => reportedRef.current,
            onInteractive: markInteractiveNow,
        });

        /* احتياطي — لا يبقى open→interactive معلّقاً إن تأخّر القسم (S1/S9) */
        fallbackTimerRef.current = window.setTimeout(
            markInteractiveNow,
            SETTINGS_INTERACTIVE_FALLBACK_MS,
        );

        return cleanupActiveGuards;
    }, [activeSection, onHydrated, open, userId]);
}
