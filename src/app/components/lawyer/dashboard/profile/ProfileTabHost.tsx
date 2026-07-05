import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { LawyerDashboardProfileTab } from '@/app/components/lawyer/dashboard/LawyerDashboardProfileTab';
import { LawyerProfileTabLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import {
    getCachedLawyerDashboardProfileTab,
    loadProfileHubModule,
} from '@/app/runtime/profileHubLoader';
import {
    PROFILE_SHELL_HYDRATED_EVENT,
    hydrateProfileShellForInstantOpenWithData,
} from '@/app/runtime/profileBootHydrator';

type ProfileTabProps = React.ComponentProps<typeof LawyerDashboardProfileTab>;
type ProfileTabComponent = React.ComponentType<ProfileTabProps>;

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function ProfileTabLoadError({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            data-testid="profile-tab-load-error"
            className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-[#05060D] px-6 text-center"
            role="alert"
        >
            <p className="text-sm font-semibold text-white/80">تعذّر تحميل الملف المهني</p>
            <button
                type="button"
                data-testid="profile-tab-retry"
                onClick={onRetry}
                className="rounded-lg border border-[#E6C673]/35 bg-[#141824]/80 px-4 py-2 text-sm font-bold text-[#E6C673]"
            >
                إعادة المحاولة
            </button>
        </div>
    );
}

/** محمّل واحد للملف المهني — التبويب + الواجهة في hub واحد */
export function ProfileTabHost(props: ProfileTabProps): React.ReactElement {
    const { visible, onBack } = props;
    const [Component, setComponent] = useState<ProfileTabComponent | null>(() =>
        getCachedLawyerDashboardProfileTab(),
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    useLayoutEffect(() => {
        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            const cached = getCachedLawyerDashboardProfileTab();
            if (cached) {
                setComponent(() => cached);
                setLoadFailed(false);
                return;
            }

            void loadProfileHubModule()
                .then(([tabMod]) => {
                    if (cancelled) return;
                    if (tabMod?.LawyerDashboardProfileTab) {
                        setComponent(() => tabMod.LawyerDashboardProfileTab);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('LawyerDashboardProfileTab missing');
                })
                .catch(() => {
                    if (cancelled) return;
                    attempts += 1;
                    if (attempts < MAX_LOAD_ATTEMPTS) {
                        window.setTimeout(adoptModule, LOAD_RETRY_MS);
                        return;
                    }
                    setLoadFailed(true);
                });
        };

        adoptModule();

        const onHydrated = () => adoptModule();
        window.addEventListener(PROFILE_SHELL_HYDRATED_EVENT, onHydrated);

        void hydrateProfileShellForInstantOpenWithData(undefined, visible).catch(() => undefined);

        return () => {
            cancelled = true;
            window.removeEventListener(PROFILE_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, [loadGeneration, visible]);

    useLayoutEffect(() => {
        if (!visible) return;
        void hydrateProfileShellForInstantOpenWithData(undefined, true);
    }, [visible]);

    if (!visible) {
        return null;
    }

    if (!Component) {
        if (loadFailed) return <ProfileTabLoadError onRetry={retryLoad} />;
        return <LawyerProfileTabLoadingFallback onBack={onBack} />;
    }

    return <Component {...props} />;
}
