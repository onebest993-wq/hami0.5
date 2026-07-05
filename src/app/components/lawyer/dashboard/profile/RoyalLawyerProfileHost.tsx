import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { RoyalLawyerProfile } from '@/app/components/lawyer/RoyalLawyerProfile';
import { LawyerProfileTabLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import {
    getCachedRoyalLawyerProfile,
    loadProfileHubModule,
} from '@/app/runtime/profileHubLoader';
import { PROFILE_SHELL_HYDRATED_EVENT } from '@/app/runtime/profileBootHydrator';

type RoyalProfileProps = React.ComponentProps<typeof RoyalLawyerProfile>;
type RoyalProfileComponent = React.ComponentType<RoyalProfileProps>;

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function RoyalProfileLoadError({ onBack, onRetry }: { onBack?: () => void; onRetry: () => void }) {
    return (
        <div
            data-testid="royal-lawyer-profile-load-error"
            className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 bg-[#05060D] px-6 text-center"
            role="alert"
        >
            <p className="text-sm font-semibold text-white/80">تعذّر تحميل واجهة الملف</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                    type="button"
                    data-testid="royal-lawyer-profile-retry"
                    onClick={onRetry}
                    className="rounded-lg border border-[#E6C673]/35 bg-[#141824]/80 px-4 py-2 text-sm font-bold text-[#E6C673]"
                >
                    إعادة المحاولة
                </button>
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-white/75"
                    >
                        رجوع
                    </button>
                ) : null}
            </div>
        </div>
    );
}

/** يحمّل RoyalLawyerProfile — يتخطى Suspense عند وجود كاش من boot hydrator */
export function RoyalLawyerProfileHost(props: RoyalProfileProps): React.ReactElement {
    const { onBack } = props;
    const [Component, setComponent] = useState<RoyalProfileComponent | null>(() =>
        getCachedRoyalLawyerProfile(),
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
            const cached = getCachedRoyalLawyerProfile();
            if (cached) {
                setComponent(() => cached);
                setLoadFailed(false);
                return;
            }

            void loadProfileHubModule()
                .then(([, profileMod]) => {
                    if (cancelled) return;
                    if (profileMod?.RoyalLawyerProfile) {
                        setComponent(() => profileMod.RoyalLawyerProfile);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('RoyalLawyerProfile missing');
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

        return () => {
            cancelled = true;
            window.removeEventListener(PROFILE_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, [loadGeneration]);

    if (!Component) {
        if (loadFailed) return <RoyalProfileLoadError onBack={onBack} onRetry={retryLoad} />;
        return <LawyerProfileTabLoadingFallback onBack={onBack} />;
    }

    return <Component {...props} />;
}
