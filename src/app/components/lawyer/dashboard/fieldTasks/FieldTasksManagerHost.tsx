import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { TasksManagerOverlay } from '@/app/components/lawyer/dashboard/TasksManagerOverlay';
import { TasksManagerFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import {
    getCachedTasksManagerOverlay,
    loadTasksManagerModule,
} from '@/app/runtime/fieldTasksHubLoader';

type TasksManagerOverlayProps = React.ComponentProps<typeof TasksManagerOverlay>;
type OverlayComponent = React.ComponentType<TasksManagerOverlayProps>;

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function TasksManagerLoadError({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            data-testid="tasks-manager-load-error"
            className="fixed inset-0 z-[130] flex flex-col items-center justify-center gap-3 px-6 text-center"
            role="alert"
        >
            <p className="text-sm font-semibold text-[#E8F5F0]/85">تعذّر تحميل أجندة المهام</p>
            <button
                type="button"
                data-testid="tasks-manager-retry"
                onClick={onRetry}
                className="rounded-lg border border-[#A67C52]/35 bg-[#0c0c0e]/80 px-4 py-2 text-sm font-bold text-[#E6C673]"
            >
                إعادة المحاولة
            </button>
        </div>
    );
}

/** يحمّل أجندة المهام مرة واحدة — keep-alive عبر open prop */
export function FieldTasksManagerHost(props: TasksManagerOverlayProps): React.ReactElement | null {
    const { open, onClose } = props;
    const [Component, setComponent] = useState<OverlayComponent | null>(() => getCachedTasksManagerOverlay());
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    useLayoutEffect(() => {
        const cached = getCachedTasksManagerOverlay();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
            return;
        }

        let cancelled = false;
        let attempts = 0;

        const tryLoad = () => {
            void loadTasksManagerModule()
                .then((mod) => {
                    if (cancelled) return;
                    if (mod?.TasksManagerOverlay) {
                        setComponent(() => mod.TasksManagerOverlay);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('TasksManagerOverlay missing');
                })
                .catch(() => {
                    if (cancelled) return;
                    attempts += 1;
                    if (attempts < MAX_LOAD_ATTEMPTS) {
                        window.setTimeout(tryLoad, LOAD_RETRY_MS);
                        return;
                    }
                    setLoadFailed(true);
                });
        };

        tryLoad();
        return () => {
            cancelled = true;
        };
    }, [loadGeneration]);

    if (!open) {
        return null;
    }

    if (!Component) {
        if (loadFailed) return <TasksManagerLoadError onRetry={retryLoad} />;
        return <>{TasksManagerFallback}</>;
    }

    return <Component {...props} onClose={onClose} />;
}
