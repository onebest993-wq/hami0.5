import React from 'react';
import { AnimatePresence } from 'motion/react';
import { ConsolidationNavBar } from '@/app/components/lawyer/smart-modal/parts/ConsolidationNavBar';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';

type Props = Pick<LawyerDashboardOverlaysBundleProps, 'dossier'>;

/**
 * شريط توحيد/ربط الدعاوى — على MainView مباشرة.
 */
export function LawyerDashboardConsolidationNavOverlayEntry({
    dossier,
}: Props): React.ReactElement | null {
    const { activeFile, setActiveFile, caseLinkNav, consolidationSpawnNav } = dossier;

    if (!consolidationSpawnNav && !caseLinkNav) return null;

    return (
        <AnimatePresence>
            {consolidationSpawnNav ? (
                <ConsolidationNavBar
                    key="consolidation-nav"
                    primaryCaseNo={consolidationSpawnNav.primaryCaseNo}
                    secondaryLabel="الدعوى الثانية (جديدة)"
                    activeView={consolidationSpawnNav.activeView}
                    onSelectPrimary={consolidationSpawnNav.onSelectPrimary}
                    onSelectSecondary={consolidationSpawnNav.onSelectSecondary}
                />
            ) : caseLinkNav ? (
                <ConsolidationNavBar
                    key="case-link-nav"
                    primaryCaseNo={caseLinkNav.first.caseNo}
                    secondaryLabel={`الدعوى المربوطة (${caseLinkNav.second.caseNo})`}
                    activeView={
                        activeFile && activeFile.id === caseLinkNav.second.id
                            ? 'secondary'
                            : 'primary'
                    }
                    onSelectPrimary={() => setActiveFile(caseLinkNav.first)}
                    onSelectSecondary={() => setActiveFile(caseLinkNav.second)}
                />
            ) : null}
        </AnimatePresence>
    );
}
