import React from 'react';
import { MissingCaseShell } from './criminalDashboardRuntimeShells';
import { CriminalDashboardBootChrome } from './CriminalDashboardBootChrome';
import { CriminalDashboardResolvedRuntimeShell } from './CriminalDashboardResolvedRuntimeShell';
import { useCriminalBootOrchestrator } from './orchestrators/useCriminalBootOrchestrator';
import {
    useCriminalDashboardResolvedOrchestration,
    type CriminalDashboardOrchestrationInput,
} from './useCriminalDashboardResolvedOrchestration';

export type CriminalDashboardProps = CriminalDashboardOrchestrationInput & {
    /**
     * يُستدعى عند اختيار «تفريق الدعوى (شطر إضبارة)»: على المستوى الأعلى
     * يجب فتح شاشة «إضبارة جديدة» مع تجاوز خطوة اختيار نوع القضية (جزائية مباشرة).
     */
    onRequestNewCaseFromSeverance?: () => void;
};

export const CriminalDashboardResolvedRuntime = React.memo(function CriminalDashboardResolvedRuntime({
    id,
    onClose,
    onExitToHome,
    onOpenCase,
}: CriminalDashboardProps) {
    useCriminalBootOrchestrator();

    const orchestration = useCriminalDashboardResolvedOrchestration({
        id,
        onClose,
        onExitToHome,
        onOpenCase,
    });

    if (
        orchestration.isCaseHydrating ||
        (orchestration.isMissingCase && !orchestration.missingRecoveryDone)
    ) {
        return (
            <CriminalDashboardBootChrome
                caseId={id}
                onClose={onClose}
                onExitToHome={onExitToHome}
            />
        );
    }

    if (orchestration.isMissingCase) {
        return <MissingCaseShell onClose={onClose} onExitToHome={onExitToHome} />;
    }

    if (!orchestration.criminalCase) {
        return <MissingCaseShell onClose={onClose} onExitToHome={onExitToHome} />;
    }

    return (
        <CriminalDashboardResolvedRuntimeShell
            id={id}
            onOpenCase={onOpenCase}
            criminalCase={orchestration.criminalCase}
            legalToast={orchestration.legalToast}
            dossierBodyProps={orchestration.dossierBodyProps}
            modalsHostProps={orchestration.modalsHostProps}
            modalsHostMounted={orchestration.modalsHostMounted}
            forceModalsHost={orchestration.forceModalsHost}
            isInlineSeveranceFormOpen={orchestration.isInlineSeveranceFormOpen}
            pendingSeveranceContext={orchestration.pendingSeveranceContext}
            closeInlineSeveranceForm={orchestration.closeInlineSeveranceForm}
            setIsInlineSeveranceFormOpen={orchestration.setIsInlineSeveranceFormOpen}
        />
    );
});
