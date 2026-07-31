import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { CRIMINAL_MODAL_Z } from './criminalModalPortal';
import { CriminalDashboardBootChrome } from './CriminalDashboardBootChrome';
import { LazyCriminalDashboardEntry } from './CriminalDashboardEntryLazy';

type CriminalDashboardPortalProps = {
    caseId: string;
    headline?: string;
    onClose: () => void;
    onOpenCase: (caseId: string) => void;
    onRequestNewCaseFromSeverance: () => void;
    onExitToHome?: () => void;
};

function CriminalDossierCrashFallback({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            style={{ zIndex: CRIMINAL_MODAL_Z.shell + 10 }}
            role="alertdialog"
            aria-modal="true"
            aria-label="تعذّر فتح الإضبارة"
            data-testid="criminal-dossier-error-fallback"
        >
            <p className="text-sm font-bold text-red-300">تعذّر تحميل الإضبارة الجزائية</p>
            <p className="max-w-sm text-xs text-white/45">يمكنك الإغلاق والمحاولة مجدداً دون فقدان باقي التطبيق.</p>
            <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-[#E6C673]/40 px-4 text-xs font-bold text-[#E6C673] touch-manipulation"
            >
                إغلاق
            </button>
        </div>
    );
}

/** إضبارة جزائية — غلاف فوري ثم lazy chunk + عزل أعطال (مطابق لنمط التنفيذ) */
export function CriminalDashboardPortal({
    caseId,
    headline,
    onClose,
    onOpenCase,
    onRequestNewCaseFromSeverance,
    onExitToHome,
}: CriminalDashboardPortalProps) {
    const handleExit = onExitToHome ?? onClose;
    useBodyScrollLock(true);

    const layer = (
        <ErrorBoundary fallback={<CriminalDossierCrashFallback onClose={onClose} />}>
            <div
                className="fixed inset-0 flex flex-col overflow-hidden bg-slate-900 print:bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
                style={{ zIndex: CRIMINAL_MODAL_Z.shell }}
                data-testid="criminal-dashboard-portal"
            >
                <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <Suspense
                            fallback={
                                <CriminalDashboardBootChrome
                                    caseId={caseId}
                                    headline={headline}
                                    onClose={onClose}
                                    onExitToHome={handleExit}
                                />
                            }
                        >
                            <LazyCriminalDashboardEntry
                                key={caseId}
                                id={caseId}
                                onClose={onClose}
                                onExitToHome={handleExit}
                                onOpenCase={onOpenCase}
                                onRequestNewCaseFromSeverance={onRequestNewCaseFromSeverance}
                            />
                        </Suspense>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
