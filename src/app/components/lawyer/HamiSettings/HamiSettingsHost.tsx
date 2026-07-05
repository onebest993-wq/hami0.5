import React, { useLayoutEffect, useState } from 'react';
import type { HamiSettingsProps } from '@/app/components/lawyer/HamiSettings/index';
import { SettingsScreenLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import { loadHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import {
    SETTINGS_SHELL_HYDRATED_EVENT,
    hydrateSettingsShellForInstantOpen,
} from '@/app/runtime/settingsBootHydrator';

type HamiSettingsComponent = React.ComponentType<HamiSettingsProps>;

/** يحمّل الإعدادات مرة واحدة — لا يشغّل الشاشة إلا عند open */
export function HamiSettingsHost(props: HamiSettingsProps): React.ReactElement | null {
    const { open, onClose } = props;
    const [Component, setComponent] = useState<HamiSettingsComponent | null>(() => {
        return null;
    });

    useLayoutEffect(() => {
        let cancelled = false;

        const adoptModule = () => {
            void loadHamiSettingsModule().then((mod) => {
                if (!cancelled && mod?.HamiSettings) {
                    setComponent(() => mod.HamiSettings);
                }
            });
        };

        adoptModule();

        const onHydrated = () => adoptModule();
        window.addEventListener(SETTINGS_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(SETTINGS_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        void hydrateSettingsShellForInstantOpen(true);
    }, [open]);

    if (!open) {
        return null;
    }

    if (!Component) {
        return <SettingsScreenLoadingFallback onClose={onClose} />;
    }

    return <Component {...props} />;
}
