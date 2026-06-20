// @ts-nocheck
import React, { Suspense, useState } from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import DossierOpeningFallback from '@/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback';

export type ActiveOrderFileProps = {
    fileData: unknown;
    onClose: () => void;
    onCaseUpdated?: (caseId: string, patch: Record<string, unknown>) => void;
};

let activeOrderFilePreload: Promise<{ default: React.ComponentType<ActiveOrderFileProps> }> | null = null;

const LazyDashboardActiveOrderFile = lazyWithRetry(() => {
    const load = import('./Dashboard_Active_Order_File').then((m) => ({
        default: m.Dashboard_Active_Order_File as unknown as LazyComponent,
    }));
    activeOrderFilePreload = load;
    return load;
});

/** يحمّل حزمة الإضبارة مسبقاً عند التمرير على بطاقة طلب */
export function preloadActiveOrderFilePanel(): void {
    if (typeof window === 'undefined') return;
    if (!activeOrderFilePreload) {
        activeOrderFilePreload = import('./Dashboard_Active_Order_File').then((m) => ({
            default: m.Dashboard_Active_Order_File,
        }));
    }
}

/** إعادة محاولة بعد فشل تحميل الـ chunk (مثلاً بعد نشر نسخة جديدة) */
export function resetActiveOrderFilePanelCache(): void {
    activeOrderFilePreload = null;
}

function DossierRenderFailed({
    onClose,
    onRetry,
    detail,
}: {
    onClose: () => void;
    onRetry: () => void;
    detail?: string;
}) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#0B1021] p-6 text-center">
                <p className="text-amber-300 font-extrabold text-lg">خطأ أثناء عرض الإضبارة</p>
                <p className="mt-2 text-white/50 text-sm">حدث خطأ في مساحة العمل. جرّب إعادة المحاولة أو أغلق الملف وافتحه من جديد.</p>
                {import.meta.env.DEV && detail ? (
                    <p className="mt-2 text-red-300/80 text-xs font-mono break-all">{detail}</p>
                ) : null}
                <div className="mt-4 flex gap-2 justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-white/20 text-white/80 hover:bg-white/10"
                    >
                        إغلاق
                    </button>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/10"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * غلاف الإضبارة — تحميل كسول مع إعادة محاولة لتفادي فشل جلب الـ chunk
 * (Failed to fetch dynamically imported module) بعد النشر أو أثناء HMR.
 */
export const DeferredActiveOrderFile: React.FC<ActiveOrderFileProps> = (props) => {
    const [retryKey, setRetryKey] = useState(0);
    const [renderDetail, setRenderDetail] = useState<string | undefined>();

    return (
        <ErrorBoundary
            key={retryKey}
            fallback={
                <DossierRenderFailed
                    onClose={props.onClose}
                    onRetry={() => {
                        setRenderDetail(undefined);
                        setRetryKey((k) => k + 1);
                    }}
                    detail={renderDetail}
                />
            }
            onError={(error, info) => {
                const msg = error instanceof Error ? error.message : String(error);
                setRenderDetail(msg);
                console.error('[ActiveOrderFile] render error:', error, info.componentStack);
            }}
        >
            <Suspense fallback={<DossierOpeningFallback />}>
                <LazyDashboardActiveOrderFile key={retryKey} {...props} />
            </Suspense>
        </ErrorBoundary>
    );
};
