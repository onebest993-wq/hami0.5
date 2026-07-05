import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { CommunityScreenProps } from '@/app/components/lawyer/CommunityScreen';
import { CommunityScreenLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import {
    getCachedCommunityScreen,
    loadCommunityScreenModule,
    type CommunityScreenComponent,
} from '@/app/runtime/communityHubLoader';
import {
    COMMUNITY_SHELL_HYDRATED_EVENT,
    hydrateCommunityShellForInstantOpen,
} from '@/app/runtime/communityBootHydrator';

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function CommunityLoadError({ onRetry, onBack }: { onRetry: () => void; onBack?: () => void }) {
    return (
        <div
            data-testid="forum-load-error"
            className="fixed inset-0 z-[95] h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 font-['Tajawal','Cairo',sans-serif]"
            style={{ background: 'linear-gradient(155deg, #0E0812 0%, #140A18 48%, #1A1020 100%)' }}
            role="alert"
            dir="rtl"
        >
            <p className="text-[#F0B896]/85 text-sm font-bold text-center">تعذّر تحميل المنتدى القانوني</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    data-testid="forum-load-retry"
                    onClick={onRetry}
                    className="min-h-[44px] rounded-xl border border-[#F0B896]/35 bg-white/5 px-4 py-2 text-sm font-bold text-[#F0B896] touch-manipulation"
                >
                    إعادة المحاولة
                </button>
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="min-h-[44px] rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white touch-manipulation"
                    >
                        إغلاق
                    </button>
                ) : null}
            </div>
        </div>
    );
}

/** يحمّل CommunityScreen مرة واحدة — shell فوري أثناء التحميل */
export function CommunityScreenHost(props: CommunityScreenProps): React.ReactElement {
    const { onBack } = props;
    const [Component, setComponent] = useState<CommunityScreenComponent | null>(() =>
        getCachedCommunityScreen(),
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    useLayoutEffect(() => {
        const cached = getCachedCommunityScreen();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
        }

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            void loadCommunityScreenModule()
                .then((mod) => {
                    if (cancelled) return;
                    if (mod?.CommunityScreen) {
                        setComponent(() => mod.CommunityScreen);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('CommunityScreen missing');
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

        const onHydrated = () => {
            const resolved = getCachedCommunityScreen();
            if (resolved) {
                setComponent(() => resolved);
                setLoadFailed(false);
            }
        };
        window.addEventListener(COMMUNITY_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(COMMUNITY_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, [loadGeneration]);

    useLayoutEffect(() => {
        void hydrateCommunityShellForInstantOpen(true);
    }, []);

    if (Component) {
        return <Component {...props} />;
    }

    if (loadFailed) {
        return <CommunityLoadError onRetry={retryLoad} onBack={onBack} />;
    }

    return <CommunityScreenLoadingFallback onBack={onBack} />;
}
