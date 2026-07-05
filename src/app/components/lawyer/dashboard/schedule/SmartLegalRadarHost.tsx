import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { SmartLegalRadar } from '@/app/components/lawyer/SmartLegalRadar';
import { ScheduleInstantShell } from '@/app/components/lawyer/dashboard/schedule/ScheduleInstantShell';
import {
    getCachedSmartLegalRadar,
    loadScheduleHubModule,
} from '@/app/runtime/scheduleHubLoader';
import { SCHEDULE_SHELL_HYDRATED_EVENT } from '@/app/runtime/scheduleBootHydrator';

type RadarProps = React.ComponentProps<typeof SmartLegalRadar>;
type RadarComponent = React.ComponentType<RadarProps>;

type SmartLegalRadarHostProps = RadarProps & {
    onLoadFailed?: () => void;
};

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function RadarLoadError({ onBack, onRetry }: { onBack: () => void; onRetry: () => void }) {
    return (
        <div
            data-testid="smart-legal-radar-load-error"
            className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-[#1f1712] px-6 text-center"
            role="alert"
        >
            <p className="text-sm font-semibold text-[#F5EDE0]/85">تعذّر تحميل رادار المواعيد</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                    type="button"
                    data-testid="smart-legal-radar-retry"
                    onClick={onRetry}
                    className="rounded-lg border border-[#C4956A]/35 bg-[#2d2219]/80 px-4 py-2 text-sm font-bold text-[#E6C673]"
                >
                    إعادة المحاولة
                </button>
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-lg border border-[#F5EDE0]/15 px-4 py-2 text-sm font-bold text-[#F5EDE0]/80"
                >
                    رجوع
                </button>
            </div>
        </div>
    );
}

/** يحمّل SmartLegalRadar — يتخطى Suspense عند وجود كاش من boot hydrator */
export function SmartLegalRadarHost(props: SmartLegalRadarHostProps): React.ReactElement {
    const { onBack, onLoadFailed } = props;
    const [Component, setComponent] = useState<RadarComponent | null>(() => getCachedSmartLegalRadar());
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    useLayoutEffect(() => {
        const cached = getCachedSmartLegalRadar();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
            return;
        }

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            void loadScheduleHubModule()
                .then(([, radarMod]) => {
                    if (cancelled) return;
                    if (radarMod?.SmartLegalRadar) {
                        setComponent(() => radarMod.SmartLegalRadar);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('SmartLegalRadar missing');
                })
                .catch(() => {
                    if (cancelled) return;
                    attempts += 1;
                    if (attempts < MAX_LOAD_ATTEMPTS) {
                        window.setTimeout(adoptModule, LOAD_RETRY_MS);
                        return;
                    }
                    setLoadFailed(true);
                    onLoadFailed?.();
                });
        };

        adoptModule();

        const onHydrated = () => adoptModule();
        window.addEventListener(SCHEDULE_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(SCHEDULE_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, [loadGeneration, onLoadFailed]);

    if (!Component) {
        if (loadFailed) return <RadarLoadError onBack={onBack} onRetry={retryLoad} />;
        return <ScheduleInstantShell onBack={onBack} />;
    }

    return <Component {...props} />;
}
