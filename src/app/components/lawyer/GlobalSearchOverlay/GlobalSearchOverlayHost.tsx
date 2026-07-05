import React, { useLayoutEffect, useState } from 'react';
import type { GlobalSearchOverlayProps } from '@/app/components/lawyer/GlobalSearchOverlay/types';
import { GlobalSearchOverlayLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import {
    getCachedGlobalSearchOverlay,
    loadGlobalSearchOverlayModule,
} from '@/app/runtime/globalSearchLoader';
import {
    GLOBAL_SEARCH_SHELL_HYDRATED_EVENT,
    hydrateGlobalSearchShellForInstantOpen,
} from '@/app/runtime/globalSearchBootHydrator';

type GlobalSearchOverlayComponent = React.ComponentType<GlobalSearchOverlayProps>;

/** يحمّل واجهة البحث مرة واحدة — shell فوري أثناء التحميل */
export function GlobalSearchOverlayHost(props: GlobalSearchOverlayProps): React.ReactElement | null {
    const { open = true, onClose } = props;
    const [Component, setComponent] = useState<GlobalSearchOverlayComponent | null>(
        () => getCachedGlobalSearchOverlay(),
    );

    useLayoutEffect(() => {
        let cancelled = false;

        const adoptModule = () => {
            const cached = getCachedGlobalSearchOverlay();
            if (cached) {
                setComponent(() => cached);
                return;
            }
            void loadGlobalSearchOverlayModule().then((mod) => {
                if (!cancelled && mod?.GlobalSearchOverlay) {
                    setComponent(() => mod.GlobalSearchOverlay);
                }
            });
        };

        adoptModule();

        const onHydrated = () => adoptModule();
        window.addEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        void hydrateGlobalSearchShellForInstantOpen(true);
    }, [open]);

    if (!open) {
        return null;
    }

    if (!Component) {
        return <GlobalSearchOverlayLoadingFallback onClose={onClose} />;
    }

    return <Component {...props} />;
}
