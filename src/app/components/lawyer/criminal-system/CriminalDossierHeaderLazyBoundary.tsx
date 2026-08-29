import React, { Suspense, type ReactNode } from 'react';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { resolveDossierHeaderNavVisibility } from '@/app/components/lawyer/dashboard/resolveDossierHeaderNavVisibility';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';

type CriminalDossierHeaderLazyBoundaryProps = {
    children: ReactNode;
    onNavBack?: () => void;
    onNavExit?: () => void;
    dossierNestedNav?: boolean;
};

/**
 * حدود Suspense لترويسة الإضبارة الكسولة.
 * الـ fallback كان شريطاً فارغاً بلا مغادرة — على الموبايل يظهر `ready` قبل وصول
 * شظية الترويسة فيختفي زر الإغلاق من DOM. نبقي نفس الشريط ونضع أزرار BootChrome.
 */
export function CriminalDossierHeaderLazyBoundary({
    children,
    onNavBack,
    onNavExit,
    dossierNestedNav = false,
}: CriminalDossierHeaderLazyBoundaryProps) {
    const nav = resolveDossierHeaderNavVisibility(dossierNestedNav);
    const handleExit = onNavExit ?? onNavBack;

    return (
        <Suspense
            fallback={
                <div className="min-h-[96px] border-b border-white/[0.06] bg-[#1b1511]/70">
                    {handleExit ? (
                        <div className="flex w-full items-center gap-2 px-4 pt-2 pb-1 print:hidden">
                            <DossierHeaderNavButtons
                                onBack={onNavBack}
                                onExit={handleExit}
                                showBack={nav.showBack}
                                showExit={nav.showExit}
                                backTestId={CRIMINAL_DOSSIER_TEST_IDS.back}
                                exitTestId={CRIMINAL_DOSSIER_TEST_IDS.exit}
                            />
                            <div className="min-w-0 flex-1" />
                            <span className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0" aria-hidden />
                            <span className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0" aria-hidden />
                        </div>
                    ) : null}
                </div>
            }
        >
            {children}
        </Suspense>
    );
}
