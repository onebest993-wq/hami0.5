import React, { memo } from 'react';
import type { RefObject } from 'react';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import type { RepositoryFeedFilter, RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import { getRepositoryFeedContainerClass } from './repositoryFeedLayout';
import { RepositoryFeedPanel } from './RepositoryFeedPanel';

type RepositoryFeedSectionProps = {
    feedLoading: boolean;
    activeFilter: RepositoryFeedFilter;
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
    layoutClass: string;
    itemLayoutClass: string;
    scrollParentRef?: RefObject<HTMLElement | null>;
    searchQuery: string;
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    dossiers: DossierPickerOption[];
    vaultDocsById: Map<string, SmartVaultDoc>;
    rooms?: RepositoryRoom[];
    onMoveGlobalToRoom?: (note: GlobalNote, roomId: string | null) => void | Promise<void>;
    onMoveVaultDocToRoom?: (doc: SmartVaultDoc, roomId: string | null) => void | Promise<void>;
    viewingVaultDocId?: string | null;
    onSaveGlobal: (note: GlobalNote) => void | Promise<void>;
    onDeleteGlobal: (id: string | number) => void;
    onUpdateLawsuit: (file: FileData) => void;
    onUpdateExecution: (file: ExecutionFile) => void;
    onLinkGlobalToDossier: (note: GlobalNote, dossier: DossierPickerOption) => Promise<void>;
    onBindVaultDoc: (doc: SmartVaultDoc, dossier: DossierPickerOption) => Promise<void>;
    onDeleteVaultDoc: (doc: SmartVaultDoc) => void | Promise<void>;
    onEditVaultDoc: (doc: SmartVaultDoc) => void;
    onViewVaultDoc: (doc: SmartVaultDoc) => void | Promise<void>;
    onCreateNote?: () => void;
};

export const RepositoryFeedSection = memo(function RepositoryFeedSection({
    feedLoading,
    activeFilter,
    items,
    feedLayout,
    layoutClass,
    itemLayoutClass,
    scrollParentRef,
    searchQuery,
    lawsuitFiles,
    executionFiles,
    dossiers,
    vaultDocsById,
    rooms,
    onMoveGlobalToRoom,
    onMoveVaultDocToRoom,
    viewingVaultDocId,
    onSaveGlobal,
    onDeleteGlobal,
    onUpdateLawsuit,
    onUpdateExecution,
    onLinkGlobalToDossier,
    onBindVaultDoc,
    onDeleteVaultDoc,
    onEditVaultDoc,
    onViewVaultDoc,
    onCreateNote,
}: RepositoryFeedSectionProps) {
    if (feedLoading) {
        const pulseLayout = layoutClass || getRepositoryFeedContainerClass(feedLayout);
        return (
            <div
                className={pulseLayout}
                data-testid="repository-feed-loading"
                data-repository-view={feedLayout}
                aria-busy="true"
            >
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-2 animate-pulse"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="h-2.5 w-16 rounded bg-white/[0.06]" />
                            <div className="h-5 w-14 rounded-full bg-white/[0.05]" />
                        </div>
                        <div className="h-3 w-[72%] rounded bg-white/[0.07]" />
                        <div className="h-2.5 w-[48%] rounded bg-white/[0.05]" />
                    </div>
                ))}
                <span className="sr-only">جاري تحميل البطاقات</span>
            </div>
        );
    }

    return (
        <RepositoryFeedPanel
            filter={activeFilter}
            active
            items={items}
            feedLayout={feedLayout}
            layoutClass={layoutClass}
            itemLayoutClass={itemLayoutClass}
            scrollParentRef={scrollParentRef}
            searchQuery={searchQuery}
            lawsuitFiles={lawsuitFiles}
            executionFiles={executionFiles}
            dossiers={dossiers}
            vaultDocsById={vaultDocsById}
            rooms={rooms}
            onMoveGlobalToRoom={onMoveGlobalToRoom}
            onMoveVaultDocToRoom={onMoveVaultDocToRoom}
            onSaveGlobal={onSaveGlobal}
            onDeleteGlobal={onDeleteGlobal}
            onUpdateLawsuit={onUpdateLawsuit}
            onUpdateExecution={onUpdateExecution}
            onLinkGlobalToDossier={onLinkGlobalToDossier}
            onBindVaultDoc={onBindVaultDoc}
            onDeleteVaultDoc={onDeleteVaultDoc}
            onEditVaultDoc={onEditVaultDoc}
            onViewVaultDoc={onViewVaultDoc}
            viewingVaultDocId={viewingVaultDocId}
            onCreateNote={onCreateNote}
        />
    );
});
