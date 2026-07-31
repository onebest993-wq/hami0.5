import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { ExecutionDashboardBootChrome } from '@/app/components/lawyer/dashboard/ExecutionDashboardBootChrome';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { loadExecutionDashboardModule } from '@/app/runtime/executionDashboardLoader';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

const LazyExecutionDashboard = createPreloadableLazyComponent(() =>
    loadExecutionDashboardModule().then((mod) => ({
        default: mod.ExecutionDashboard as unknown as LazyComponent,
    })),
);

if (typeof window !== 'undefined') {
    void LazyExecutionDashboard.preload();
}

type ExecutionDashboardPortalProps = {
    file: FileData;
    /** رجوع للأرشيف / الشاشة السابقة */
    onClose: () => void;
    /** مغادرة نهائية للصفحة الرئيسية */
    onExitToHome: () => void;
    onUpdate: (file: FileData) => void;
    open?: boolean;
};

function ExecutionDossierCrashFallback({ onExitToHome }: { onExitToHome: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[230] flex flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            role="alertdialog"
            aria-modal="true"
            aria-label="تعذّر فتح الإضبارة"
            data-testid="execution-dossier-error-fallback"
        >
            <p className="text-sm font-bold text-red-300">تعذّر تحميل الإضبارة التنفيذية</p>
            <p className="max-w-sm text-xs text-white/45">يمكنك الإغلاق والمحاولة مجدداً دون فقدان باقي التطبيق.</p>
            <button
                type="button"
                onClick={onExitToHome}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-[#E6C673]/40 px-4 text-xs font-bold text-[#E6C673] touch-manipulation"
            >
                إغلاق
            </button>
        </div>
    );
}

/** إضبارة التنفيذ — غلاف مطابق لإطار الهاتف ثم lazy chunk + عزل أعطال */
export function ExecutionDashboardPortal({
    file,
    onClose,
    onExitToHome,
    onUpdate,
    open = true,
}: ExecutionDashboardPortalProps) {
    const layer = (
        <div
            className="fixed inset-0"
            style={{
                zIndex: open ? 230 : -1,
                visibility: open ? 'visible' : 'hidden',
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
            }}
            aria-hidden={!open}
            data-testid={open ? 'execution-dashboard-portal-open' : 'execution-dashboard-portal-keepalive'}
        >
            <ErrorBoundary fallback={<ExecutionDossierCrashFallback onExitToHome={onExitToHome} />}>
                <Suspense
                    fallback={
                        open ? (
                            <ExecutionDashboardBootChrome
                                file={file}
                                onExitToHome={onExitToHome}
                            />
                        ) : null
                    }
                >
                    <LazyExecutionDashboard
                        key={`exec-${file.id}`}
                        file={file}
                        onClose={onClose}
                        onUpdate={onUpdate}
                    />
                </Suspense>
            </ErrorBoundary>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}

/** تسخين مكوّن الإضبارة نفسه — للتوافق مع ensureExecutionDashboardPortalReady */
export function prefetchExecutionDashboardComponent(): Promise<void> {
    return LazyExecutionDashboard.preload();
}
