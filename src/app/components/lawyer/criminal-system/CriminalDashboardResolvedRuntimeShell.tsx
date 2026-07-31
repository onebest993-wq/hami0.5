import React, { Suspense } from 'react';
import { ColleagueConsultationProvider } from '../caseShare/ColleagueConsultationContext';
import { extractCriminalShareSource } from '@/app/services/caseShare/caseShareExtractors';
import { LazyCriminalNewCase } from './criminalDashboardLazyRegistry';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';
import type { CriminalCase, CriminalStoreState } from './criminalStore';
import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import type { CriminalDashboardDossierBodyProps } from './CriminalDashboardDossierBody';
import { CriminalDashboardDossierBody } from './CriminalDashboardDossierBody';
import { LegalToastBanner } from './criminalDashboardRuntimeShells';
import { CriminalDashboardLazySurfaceFallback } from './criminalDashboardRuntimeShells';

const LazyCriminalDashboardModalsHost = React.lazy(() =>
    import('./CriminalDashboardModalsHost').then((m) => ({
        default: m.CriminalDashboardModalsHost,
    })),
);

export type CriminalDashboardResolvedRuntimeShellProps = {
    id: string;
    onOpenCase?: (id: string) => void;
    criminalCase: CriminalCase;
    legalToast: string;
    dossierBodyProps: CriminalDashboardDossierBodyProps;
    modalsHostProps: CriminalDashboardModalsHostProps;
    modalsHostMounted: boolean;
    forceModalsHost: boolean;
    isInlineSeveranceFormOpen: boolean;
    pendingSeveranceContext: CriminalStoreState['pendingSeveranceContext'];
    closeInlineSeveranceForm: () => void;
    setIsInlineSeveranceFormOpen: (open: boolean) => void;
};

export function CriminalDashboardResolvedRuntimeShell({
    id,
    onOpenCase,
    criminalCase,
    legalToast,
    dossierBodyProps,
    modalsHostProps,
    modalsHostMounted,
    forceModalsHost,
    isInlineSeveranceFormOpen,
    pendingSeveranceContext,
    closeInlineSeveranceForm,
    setIsInlineSeveranceFormOpen,
}: CriminalDashboardResolvedRuntimeShellProps) {
    return (
        <ColleagueConsultationProvider source={extractCriminalShareSource(criminalCase)}>
            <div
                className="flex flex-1 min-h-0 flex-col w-full bg-slate-900 print:bg-white print:text-black"
                data-testid={CRIMINAL_DOSSIER_TEST_IDS.dossier}
                data-dossier-state="ready"
            >
                <LegalToastBanner message={legalToast} />
                <div
                    dir="rtl"
                    className="flex flex-1 min-h-0 flex-col w-full bg-slate-900 text-white overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] print:overflow-visible print:min-h-screen print:bg-white print:text-black"
                >
                    <CriminalDashboardDossierBody {...dossierBodyProps} />

                    {modalsHostMounted || forceModalsHost ? (
                        <Suspense
                            fallback={
                                <div
                                    className="sr-only"
                                    aria-busy="true"
                                    aria-live="polite"
                                    data-testid="criminal-modals-host-loading"
                                >
                                    جاري تجهيز النوافذ
                                </div>
                            }
                        >
                            <LazyCriminalDashboardModalsHost {...modalsHostProps} />
                        </Suspense>
                    ) : null}
                </div>

                {isInlineSeveranceFormOpen && pendingSeveranceContext?.parentCaseId === id ? (
                    <div
                        className="fixed inset-0 z-[230] flex flex-col min-h-0 bg-[#0B1021] print:hidden"
                        dir="rtl"
                        role="dialog"
                        aria-modal="true"
                        aria-label="تعبئة بيانات الإضبارة المفرّقة"
                    >
                        <Suspense
                            fallback={
                                <CriminalDashboardLazySurfaceFallback minHeightClass="min-h-[100vh]" />
                            }
                        >
                            <LazyCriminalNewCase
                                embeddedOverlay
                                severanceFormMode
                                onBack={closeInlineSeveranceForm}
                                onClose={closeInlineSeveranceForm}
                                onCreated={(newCaseId) => {
                                    setIsInlineSeveranceFormOpen(false);
                                    if (onOpenCase) {
                                        onOpenCase(newCaseId);
                                    }
                                }}
                            />
                        </Suspense>
                    </div>
                ) : null}
            </div>
        </ColleagueConsultationProvider>
    );
}
