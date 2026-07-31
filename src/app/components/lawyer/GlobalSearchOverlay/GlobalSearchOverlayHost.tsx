import React, { useLayoutEffect, useState } from 'react';
import type { GlobalSearchOverlayProps } from '@/app/components/lawyer/GlobalSearchOverlay/types';
import { GlobalSearchInstantShell } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantShell';
import {
    getCachedGlobalSearchOverlay,
    loadGlobalSearchOverlayModule,
} from '@/app/runtime/globalSearchLoader';
import {
    GLOBAL_SEARCH_SHELL_HYDRATED_EVENT,
    hydrateGlobalSearchShellForInstantOpen,
} from '@/app/runtime/globalSearchBootHydrator';

type GlobalSearchOverlayComponent = React.ComponentType<GlobalSearchOverlayProps>;

export type GlobalSearchOverlayHostProps = GlobalSearchOverlayProps & {
    /** مركّب مخفياً — الشجرة دافئة؛ الفتح = إظهار فقط */
    keepAlive?: boolean;
};

/** يحمّل واجهة البحث مرة واحدة — قشرة حقيقية أثناء التحميل + keepAlive */
export function GlobalSearchOverlayHost({
    keepAlive = false,
    ...props
}: GlobalSearchOverlayHostProps): React.ReactElement | null {
    const { open = true, onClose } = props;
    const [Component, setComponent] = useState<GlobalSearchOverlayComponent | null>(
        () => getCachedGlobalSearchOverlay(),
    );
    const [loadError, setLoadError] = useState(false);
    const [retryToken, setRetryToken] = useState(0);

    /* kick أثناء الرسم إن فُتح/دُفئ بلا كاش — قبل paint التالي */
    if ((open || keepAlive) && !Component && typeof window !== 'undefined') {
        void loadGlobalSearchOverlayModule().catch(() => undefined);
    }

    useLayoutEffect(() => {
        if (!open && !keepAlive) return;
        let cancelled = false;

        const adoptModule = () => {
            const cached = getCachedGlobalSearchOverlay();
            if (cached) {
                setLoadError(false);
                setComponent(() => cached);
                return;
            }
            void loadGlobalSearchOverlayModule()
                .then((mod) => {
                    if (cancelled) return;
                    if (mod?.GlobalSearchOverlay) {
                        setLoadError(false);
                        setComponent(() => mod.GlobalSearchOverlay);
                        return;
                    }
                    setLoadError(true);
                })
                .catch(() => {
                    if (!cancelled) setLoadError(true);
                });
        };

        adoptModule();

        const onHydrated = () => adoptModule();
        window.addEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, [open, keepAlive, retryToken]);

    useLayoutEffect(() => {
        if (!open && !keepAlive) return;
        void hydrateGlobalSearchShellForInstantOpen(true);
    }, [open, keepAlive]);

    if (!open && !keepAlive) {
        return null;
    }

    if (loadError && !Component) {
        if (!open) return null;
        return (
            <div
                className="fixed inset-0 z-[280] flex items-center justify-center bg-[#010308]/85 p-4"
                role="alertdialog"
                aria-label="خطأ في البحث"
                data-testid="global-search-load-error"
            >
                <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A0F1C] p-5 text-center space-y-4">
                    <p className="text-white/80 text-sm font-bold">تعذّر تحميل البحث الشامل</p>
                    <div className="flex gap-2 justify-center">
                        <button
                            type="button"
                            data-testid="global-search-load-retry"
                            className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-[#E6C673]/15 text-[#E6C673] text-sm font-bold touch-manipulation"
                            onClick={() => {
                                setLoadError(false);
                                setRetryToken((n) => n + 1);
                            }}
                        >
                            إعادة المحاولة
                        </button>
                        <button
                            type="button"
                            data-testid="global-search-load-close"
                            className="min-h-[44px] min-w-[44px] px-4 rounded-xl border border-white/10 text-white/70 text-sm font-bold touch-manipulation"
                            onClick={onClose}
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!Component) {
        /* keepAlive مغلق: لا قشرة ظاهرة أثناء تسخين صامت — InstantShell فقط عند الفتح */
        if (!open) return null;
        return <GlobalSearchInstantShell onClose={onClose} open userId={props.userId} />;
    }

    return <Component {...props} keepWarm={keepAlive} />;
}
