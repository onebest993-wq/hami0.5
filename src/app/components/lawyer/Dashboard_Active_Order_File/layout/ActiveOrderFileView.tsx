import React from 'react';
import { Modal_Quick_Log } from '../../Modal_Quick_Log';
import { MetaEditModal } from '../modals/MetaEditModal';
import { PartyEditModal } from '../modals/PartyEditModal';
import { ActiveOrderFileHeader } from './ActiveOrderFileHeader';
import { ArchiveBanner } from './ArchiveBanner';
import { PartiesSidebar } from './PartiesSidebar';
import { LifecyclePanel } from './LifecyclePanel';
import { AdminWorkspacePanel } from './AdminWorkspacePanel';
import type { ActiveOrderFileViewProps } from './ActiveOrderFileViewProps';

export type { ActiveOrderFileViewProps } from './ActiveOrderFileViewProps';

export function ActiveOrderFileView({
    onClose,
    confirmPortal,
    lifecyclePanelProps,
    adminWorkspace,
    decisionNotificationModal,
    metaEdit,
    partyEdit,
    header,
    archive,
    parties,
}: ActiveOrderFileViewProps) {
    return (
        <>
            <div
                className="fixed inset-0 z-[200] bg-[#0B1021] font-['Tajawal'] overflow-hidden"
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                <Modal_Quick_Log
                    isOpen={decisionNotificationModal.isOpen}
                    onClose={decisionNotificationModal.onClose}
                    actionType="notification"
                    caseName={decisionNotificationModal.caseName}
                    minActionDate={decisionNotificationModal.minActionDate}
                    onSubmit={decisionNotificationModal.onSubmit}
                />
                <MetaEditModal {...metaEdit} />
                <PartyEditModal {...partyEdit} />

                <ActiveOrderFileHeader {...header} onClose={onClose} />

                {archive ? (
                    <ArchiveBanner
                        isIqrarContext={archive.isIqrarContext}
                        archiveSummaryText={archive.archiveSummaryText}
                        archivedAt={archive.archivedAt}
                        formatDateTimeText={archive.formatDateTimeText}
                    />
                ) : null}

                <div className="h-[calc(100vh-58px)] overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <PartiesSidebar
                            party1Entries={parties.party1Entries}
                            party2Entries={parties.party2Entries}
                            procedureType={parties.procedureType}
                            isFinalized={parties.isFinalized}
                            onEditParty={parties.onEditParty}
                        />

                        <div className="lg:col-span-3 space-y-4">
                            <LifecyclePanel {...lifecyclePanelProps} />
                            <AdminWorkspacePanel {...adminWorkspace} />
                        </div>
                    </div>
                </div>
            </div>
            {confirmPortal}
        </>
    );
}
