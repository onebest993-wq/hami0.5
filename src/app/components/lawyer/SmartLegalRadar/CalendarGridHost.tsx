import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { CalendarGrid } from '@/app/components/lawyer/SmartLegalRadar/CalendarGrid';
import { CalendarGridInstantShell } from '@/app/components/lawyer/SmartLegalRadar/CalendarGridInstantShell';
import {
    getCachedRadarCalendarGrid,
    loadRadarCalendarGridModule,
    prefetchRadarCalendarGrid,
} from '@/app/runtime/radarWidgetLoader';

type CalendarGridProps = React.ComponentProps<typeof CalendarGrid>;
type CalendarGridComponent = React.ComponentType<CalendarGridProps>;

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

export function CalendarGridHost(props: CalendarGridProps & { visible: boolean }): React.ReactElement | null {
    const { visible, ...gridProps } = props;
    const [Component, setComponent] = useState<CalendarGridComponent | null>(() =>
        getCachedRadarCalendarGrid(),
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    useLayoutEffect(() => {
        prefetchRadarCalendarGrid();

        const cached = getCachedRadarCalendarGrid();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
            return;
        }

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            void loadRadarCalendarGridModule()
                .then((mod) => {
                    if (cancelled) return;
                    if (mod?.CalendarGrid) {
                        setComponent(() => mod.CalendarGrid);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('CalendarGrid missing');
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
        return () => {
            cancelled = true;
        };
    }, [loadGeneration]);

    if (!visible) return null;

    if (!Component) {
        if (loadFailed) {
            return (
                <div className="mb-6 p-4 text-center" role="alert">
                    <p className="text-sm hami-radar-text-secondary mb-2">تعذّر تحميل التقويم الكامل</p>
                    <button
                        type="button"
                        onClick={retryLoad}
                        className="rounded-lg border border-[#C4956A]/35 px-3 py-1.5 text-xs font-bold text-[#E6C673]"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            );
        }
        return <CalendarGridInstantShell />;
    }

    return <Component {...gridProps} />;
}
