import React, { Suspense, useMemo, useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { LawsuitsWorkspaceTabLoading } from './LawsuitsWorkspaceShell';
import {
    URGENT_DOSSIER_BTN_GHOST,
    URGENT_DOSSIER_DIALOG_PANEL,
} from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';

function createLazyUrgentDashboard() {
    return lazyWithRetry(() =>
        import('@/app/runtime/urgentOrdersViewLoader')
            .then((m) => m.loadUrgentOrdersViewModule())
            .then((mod) => ({
                default: mod.View_Urgent_And_Orders_Dashboard as unknown as LazyComponent,
            })),
    );
}

function TabLoadErrorFallback({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="h-full flex items-center justify-center p-4">
            <div className={`${URGENT_DOSSIER_DIALOG_PANEL} max-w-md w-full text-right`}>
                <p className="text-white font-extrabold text-sm">تعذّر تحميل هذا القسم</p>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">
                    تحقق من الاتصال ثم أعد المحاولة. إن استمر الخطأ، حدّث الصفحة (Ctrl+Shift+R).
                </p>
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={onRetry}
                        className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[44px] py-2 text-xs`}
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        </div>
    );
}

type LawsuitsWorkspaceUrgentTabProps = {
    active: boolean;
    focusCaseId?: string;
};

/**
 * تبويب المستعجل داخل مساحة الدعاوى — جسر خارج نطاق الأرشيف المدني.
 */
export function LawsuitsWorkspaceUrgentTab({
    active,
    focusCaseId,
}: LawsuitsWorkspaceUrgentTabProps): React.ReactElement {
    const [urgentLoadKey, setUrgentLoadKey] = useState(0);
    const [armed, setArmed] = useState(active);
    const LazyView = useMemo(() => createLazyUrgentDashboard(), [urgentLoadKey]);

    useEffect(() => {
        if (active) setArmed(true);
    }, [active]);

    const retryUrgentLoad = useCallback(() => {
        void import('@/app/runtime/urgentOrdersViewLoader')
            .then((m) => {
                m.resetUrgentOrdersViewLoader();
                m.prefetchUrgentOrdersViewModule();
            })
            .catch(() => undefined);
        setUrgentLoadKey((key) => key + 1);
    }, []);

    if (!armed) {
        return <div className="hidden" aria-hidden />;
    }

    return (
        <div
            className={
                active
                    ? 'h-full overflow-y-auto overscroll-y-contain touch-pan-y'
                    : 'hidden'
            }
            aria-hidden={!active}
        >
            <ErrorBoundary
                key={`urgent-${urgentLoadKey}`}
                fallback={<TabLoadErrorFallback onRetry={retryUrgentLoad} />}
            >
                <Suspense
                    fallback={
                        <LawsuitsWorkspaceTabLoading label="جاري تحميل الطلبات المستعجلة..." />
                    }
                >
                    <LazyView embeddedInWorkspace focusCaseId={focusCaseId} />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}

export function LawsuitsCivilTabLoadErrorFallback({
    onRetry,
}: {
    onRetry: () => void;
}): React.ReactElement {
    return <TabLoadErrorFallback onRetry={onRetry} />;
}
