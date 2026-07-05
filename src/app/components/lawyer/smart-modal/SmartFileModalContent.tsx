import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SmartFileModalsPortal } from './layout/SmartFileModalsPortal';
import { SmartFileMainPanel } from './layout/SmartFileMainPanel';
import { PersonalStatusSmartFileChrome } from '@/app/components/lawyer/personal-status/PersonalStatusSmartFileChrome';
import { SmartFileChrome } from './layout/SmartFileChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from './smartFile/civilLawsuitTestIds';
import { useSmartFileModalOrchestrator } from './hooks/useSmartFileModalOrchestrator';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { ColleagueConsultationProvider } from '../caseShare/ColleagueConsultationContext';
import { extractLawsuitShareSource } from '@/app/services/caseShare/caseShareExtractors';
import {
    PERSONAL_STATUS_DOSSIER_INNER,
    PERSONAL_STATUS_DOSSIER_PANEL,
    PERSONAL_STATUS_DOSSIER_ROOT,
} from '@/app/components/lawyer/personal-status/personalStatusVisualTheme';
import { SmartFileModalThemeProvider } from './smartFile/smartFileModalTheme';
import { prefetchSmartFileModalShellWidgets } from './lazySmartFileModalWidgets';
import { HUB_DOSSIER_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { isSmartFileNestedOverlayOpen } from './smartFile/smartFileNestedOverlayState';
import {
    isSmartFileInlineOverlayOpen,
    resetSmartFileInlineOverlayRegistry,
} from './smartFile/smartFileInlineOverlayRegistry';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
export type { SmartFileModalProps } from './smartFile/smartFileModalTypes';

function prefetchSmartFileHotModals(): void {
    if (typeof window === 'undefined') return;
    void import('./modals/contentEntryModals').catch(() => undefined);
    void import('./modals/EditCaseInfoModal').catch(() => undefined);
    void import('./parts/LegalActionsMenu').catch(() => undefined);
    void import('./parts/QuickActions').catch(() => undefined);
    void import('./parts/TimelineFeed').catch(() => undefined);
}

export const SmartFileModalContent = (props: import('./smartFile/smartFileModalTypes').SmartFileModalProps) => {
    const { onClose } = props;
    const { layout, consolidationNavActive, caseLinkNavActive } = useSmartFileModalOrchestrator(props);
    const isPersonalDossier = isPersonalStatusFile(props.file);

    useBodyScrollLock(true);

    useEffect(() => {
        resetSmartFileInlineOverlayRegistry();
        prefetchSmartFileModalShellWidgets();
        prefetchSmartFileHotModals();
    }, []);

    useEffect(() => {
        return () => {
            resetSmartFileInlineOverlayRegistry();
        };
    }, []);

    useEffect(() => {
        if (!layout) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (isSmartFileNestedOverlayOpen(layout.modalsPortal) || isSmartFileInlineOverlayOpen()) return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [layout, onClose]);

    const shareSource = useMemo(() => {
        const file = props.file as unknown as FileData;
        const stageIndex = file.activeStageIndex ?? 0;
        const stage = file.stages?.[stageIndex];
        return extractLawsuitShareSource(file, stage);
    }, [props.file]);

    if (!layout) {
        return null;
    }

    const themeVariant = layout.modalsPortal.modalVisualVariant ?? (isPersonalDossier ? 'personal-pearl' : 'civil');

    const rootClass = isPersonalDossier
        ? `${PERSONAL_STATUS_DOSSIER_ROOT} ${consolidationNavActive || caseLinkNavActive ? 'pt-12' : ''}`
        : `fixed inset-0 ${HUB_DOSSIER_Z_CLASS} bg-[#0F121E] font-['Tajawal'] overflow-hidden print:static print:bg-transparent print:overflow-visible pointer-events-auto ${
              consolidationNavActive || caseLinkNavActive ? 'pt-12' : ''
          }`;

    const panelClass = isPersonalDossier
        ? `${PERSONAL_STATUS_DOSSIER_PANEL} rounded-none border-0 flex flex-col min-h-0 overflow-hidden shadow-none print:h-auto print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:rounded-none`
        : 'w-full h-full max-w-none mx-0 my-0 bg-[#0F121E] rounded-none border-0 flex flex-col min-h-0 overflow-hidden shadow-none print:h-auto print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:rounded-none';

    const innerClass = isPersonalDossier
        ? PERSONAL_STATUS_DOSSIER_INNER
        : 'flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F121E] relative';

    const modalsLayer =
        typeof document !== 'undefined' ? (
            createPortal(<SmartFileModalsPortal {...layout.modalsPortal} />, document.body)
        ) : (
            <SmartFileModalsPortal {...layout.modalsPortal} />
        );

    return (
        <ColleagueConsultationProvider source={shareSource}>
            <SmartFileModalThemeProvider variant={themeVariant}>
                <div
                    className={rootClass}
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.dossier}
                    data-dossier-variant={isPersonalDossier ? 'personal' : 'civil'}
                >
                    <div className={panelClass}>
                        <div className={innerClass}>
                            {isPersonalDossier ? (
                                <PersonalStatusSmartFileChrome {...layout.chrome} />
                            ) : (
                                <SmartFileChrome {...layout.chrome} />
                            )}
                            <SmartFileMainPanel {...layout.mainPanel} />
                        </div>
                    </div>
                </div>
                {modalsLayer}
            </SmartFileModalThemeProvider>
        </ColleagueConsultationProvider>
    );
};
