import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartFileModalsPortal } from './layout/SmartFileModalsPortal';
import { SmartFileMainPanel } from './layout/SmartFileMainPanel';
import { PersonalStatusSmartFileChrome } from '@/app/components/lawyer/personal-status/PersonalStatusSmartFileChrome';
import { SmartFileChrome } from './layout/SmartFileChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from './smartFile/civilLawsuitTestIds';
import { useSmartFileModalOrchestrator } from './hooks/useSmartFileModalOrchestrator';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import {
    PERSONAL_STATUS_DOSSIER_INNER,
    PERSONAL_STATUS_DOSSIER_PANEL,
    PERSONAL_STATUS_DOSSIER_ROOT,
} from '@/app/components/lawyer/personal-status/personalStatusVisualTheme';
import { SmartFileModalThemeProvider } from './smartFile/smartFileModalTheme';
export type { SmartFileModalProps } from './smartFile/smartFileModalTypes';

export const SmartFileModalContent = (props: import('./smartFile/smartFileModalTypes').SmartFileModalProps) => {
    const { layout, consolidationNavActive, caseLinkNavActive } = useSmartFileModalOrchestrator(props);
    const isPersonalDossier = isPersonalStatusFile(props.file);

    if (!layout) return null;

    const rootClass = isPersonalDossier
        ? `${PERSONAL_STATUS_DOSSIER_ROOT} ${consolidationNavActive || caseLinkNavActive ? 'pt-12' : ''}`
        : `fixed inset-0 z-[100] bg-[#0F121E] font-['Tajawal'] overflow-hidden print:static print:bg-transparent print:overflow-visible ${
              consolidationNavActive || caseLinkNavActive ? 'pt-12' : ''
          }`;

    const panelClass = isPersonalDossier
        ? `${PERSONAL_STATUS_DOSSIER_PANEL} rounded-none border-0 flex flex-col min-h-0 overflow-hidden shadow-none print:h-auto print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:rounded-none`
        : 'w-full h-full max-w-none mx-0 my-0 bg-[#0F121E] rounded-none border-0 flex flex-col min-h-0 overflow-hidden shadow-none print:h-auto print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:rounded-none will-change-opacity';

    const innerClass = isPersonalDossier
        ? PERSONAL_STATUS_DOSSIER_INNER
        : 'flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F121E] relative';

    return (
        <AnimatePresence>
            <motion.div
                className={rootClass}
                data-testid={CIVIL_LAWSUIT_TEST_IDS.dossier}
                data-dossier-variant={isPersonalDossier ? 'personal' : 'civil'}
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={panelClass}
                >
                    <div className={innerClass}>
                        <SmartFileModalThemeProvider variant={layout.modalsPortal.modalVisualVariant ?? (isPersonalDossier ? 'personal-pearl' : 'civil')}>
                            {isPersonalDossier ? (
                                <PersonalStatusSmartFileChrome {...layout.chrome} />
                            ) : (
                                <SmartFileChrome {...layout.chrome} />
                            )}
                            <SmartFileMainPanel {...layout.mainPanel} />
                            <SmartFileModalsPortal {...layout.modalsPortal} />
                        </SmartFileModalThemeProvider>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
