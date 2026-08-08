import React from 'react';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { resolveDossierHeaderNavVisibility } from '@/app/components/lawyer/dashboard/resolveDossierHeaderNavVisibility';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';

/**
 * غلاف تحميل داخل منطقة المحتوى — أزرار الرجوع/المغادرة في الترويسة أو هنا أثناء التحميل.
 */
export function CriminalDashboardBootChrome({
    caseId,
    headline,
    onClose,
    onExitToHome,
}: {
    caseId: string;
    headline?: string;
    onClose?: () => void;
    onExitToHome?: () => void;
}) {
    const title = (headline ?? '').trim() || 'إضبارة جزائية';
    const handleExit = onExitToHome ?? onClose;
    const nav = resolveDossierHeaderNavVisibility(false);

    return (
        <div
            className="flex h-full min-h-0 flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
            dir="rtl"
            data-testid="criminal-dashboard-boot-chrome"
            data-case-id={caseId}
        >
            {handleExit ? (
                <div className="shrink-0 px-4 pt-2 pb-1">
                    <div className="flex w-full items-center gap-2">
                        <DossierHeaderNavButtons
                            onBack={onClose}
                            onExit={handleExit}
                            showBack={nav.showBack}
                            showExit={nav.showExit}
                            backTestId={CRIMINAL_DOSSIER_TEST_IDS.back}
                            exitTestId={CRIMINAL_DOSSIER_TEST_IDS.exit}
                        />
                        <div className="min-w-0 flex-1 text-center">
                            <span className="truncate text-sm font-semibold tracking-tight text-rose-300/95">
                                الإضبارة الجزائية
                            </span>
                        </div>
                        <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />
                        <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />
                    </div>
                </div>
            ) : null}
            <div className="flex flex-1 min-h-0 flex-col px-4 pb-4">
                <div className="mb-3 rounded-2xl border border-rose-500/20 bg-[#0B1120]/55 px-3 py-3">
                    <div className="h-3 w-24 motion-safe:animate-pulse rounded bg-white/10" />
                    <p className="mt-2 truncate text-center text-sm font-bold text-rose-50/90">{title}</p>
                </div>
                <div className="space-y-3 flex-1">
                    <div className="h-20 motion-safe:animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
                    <div className="h-28 motion-safe:animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
                    <div className="h-24 motion-safe:animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
                </div>
            </div>
        </div>
    );
}
