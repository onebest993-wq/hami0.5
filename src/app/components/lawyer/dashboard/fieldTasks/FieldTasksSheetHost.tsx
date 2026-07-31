import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { FieldTasksBottomSheet } from '@/app/components/lawyer/dashboard/FieldTasksBottomSheet';
import { FieldTasksInstantSheetShell } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksInstantSheetShell';
import {
    getCachedFieldTasksBottomSheet,
    loadFieldTasksSheetModule,
} from '@/app/runtime/fieldTasksHubLoader';
import {
    FIELD_TASKS_SHELL_HYDRATED_EVENT,
    hydrateFieldTasksShellForInstantOpen,
} from '@/app/runtime/fieldTasksBootHydrator';

type FieldTasksBottomSheetProps = React.ComponentProps<typeof FieldTasksBottomSheet>;
type SheetComponent = React.ComponentType<FieldTasksBottomSheetProps>;

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function FieldTasksSheetLoadError({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            data-testid="field-tasks-sheet-load-error"
            className="fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-3 px-6 py-8 text-center"
            role="alert"
        >
            <p className="text-sm font-semibold text-[#E8F5F0]/85">تعذّر تحميل ستارة الميدان</p>
            <button
                type="button"
                data-testid="field-tasks-sheet-retry"
                onClick={onRetry}
                className="rounded-lg border border-[#A67C52]/35 bg-[#0c0c0e]/80 px-4 py-2 text-sm font-bold text-[#E6C673]"
            >
                إعادة المحاولة
            </button>
        </div>
    );
}

/** يحمّل ستارة الميدان مرة واحدة — يبقي الـ chunk دافئاً عند host مركّب حتى مع open=false */
export function FieldTasksSheetHost(props: FieldTasksBottomSheetProps): React.ReactElement | null {
    const { open, onClose } = props;
    const [Component, setComponent] = useState<SheetComponent | null>(() => getCachedFieldTasksBottomSheet());
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    useLayoutEffect(() => {
        const cached = getCachedFieldTasksBottomSheet();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
        }

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            void loadFieldTasksSheetModule()
                .then((mod) => {
                    if (cancelled) return;
                    if (mod?.FieldTasksBottomSheet) {
                        setComponent(() => mod.FieldTasksBottomSheet);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('FieldTasksBottomSheet missing');
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
            const resolved = getCachedFieldTasksBottomSheet();
            if (resolved) {
                setComponent(() => resolved);
                setLoadFailed(false);
            }
        };
        window.addEventListener(FIELD_TASKS_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(FIELD_TASKS_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, [loadGeneration]);

    useLayoutEffect(() => {
        if (!open) return;
        void hydrateFieldTasksShellForInstantOpen(true);
    }, [open]);

    /* Host مركّب + chunk جاهز: أبقِ الستارة في الشجرة (مخفية) لمسار reveal الدافئ */
    if (!open) {
        if (Component) return <Component {...props} onClose={onClose} />;
        return null;
    }

    if (!Component) {
        if (loadFailed) return <FieldTasksSheetLoadError onRetry={retryLoad} />;
        return <FieldTasksInstantSheetShell />;
    }

    return <Component {...props} onClose={onClose} />;
}
