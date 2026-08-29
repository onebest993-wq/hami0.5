import React, { Suspense } from 'react';
import { DossierEditModal } from '../modals/DossierEditModal';
import { ActiveOrderFileHeader } from './ActiveOrderFileHeader';
import { ArchiveBanner } from './ArchiveBanner';
import { PartiesSidebar } from './PartiesSidebar';
import { LifecyclePanel } from './LifecyclePanel';
import { AdminWorkspacePanel } from './AdminWorkspacePanel';
import type { ActiveOrderFileViewProps } from './ActiveOrderFileViewProps';
import { URGENT_DOSSIER_CARD } from './urgentDossierUi';
import { LazyActiveOrderModalQuickLog } from './activeOrderQuickLogLazy';

export type { ActiveOrderFileViewProps } from './ActiveOrderFileViewProps';
export { preloadActiveOrderQuickLog } from './activeOrderQuickLogLazy';

export function ActiveOrderFileView({
    onClose,
    confirmPortal,
    lifecyclePanelProps,
    adminWorkspace,
    decisionNotificationModal,
    dossierEdit,
    header,
    archive,
    parties,
}: ActiveOrderFileViewProps) {
    return (
        <>
            <div
                data-testid="urgent-active-order-dossier"
                className="fixed inset-0 z-[200] bg-[#0B1021] font-['Tajawal'] flex flex-col overflow-hidden"
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                {decisionNotificationModal.isOpen ? (
                    <Suspense fallback={null}>
                        <LazyActiveOrderModalQuickLog
                            isOpen={decisionNotificationModal.isOpen}
                            onClose={decisionNotificationModal.onClose}
                            actionType="notification"
                            caseName={decisionNotificationModal.caseName}
                            minActionDate={decisionNotificationModal.minActionDate}
                            onSubmit={decisionNotificationModal.onSubmit}
                        />
                    </Suspense>
                ) : null}
                <DossierEditModal {...dossierEdit} />

                <ActiveOrderFileHeader {...header} onClose={onClose} />

                {archive ? (
                    <ArchiveBanner
                        isIqrarContext={archive.isIqrarContext}
                        archiveSummaryText={archive.archiveSummaryText}
                        archivedAt={archive.archivedAt}
                        formatDateTimeText={archive.formatDateTimeText}
                    />
                ) : null}

                <div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]"
                >
                    <div className="max-w-5xl mx-auto px-3 py-3">
                        <div className={`${URGENT_DOSSIER_CARD} overflow-hidden`}>
                            <PartiesSidebar
                                embedded
                                party1Entries={parties.party1Entries}
                                party2Entries={parties.party2Entries}
                                procedureType={parties.procedureType}
                                isFinalized
                                onEditParty={() => {}}
                            />
                            <div className="border-t border-white/[0.06] px-4 py-3">
                                <LifecyclePanel embedded {...lifecyclePanelProps} />
                            </div>
                        </div>
                    </div>
                </div>

                <AdminWorkspacePanel variant="dock" {...adminWorkspace} />
            </div>
            {confirmPortal}
        </>
    );
}
