import React, { memo } from 'react';
import type { RefObject } from 'react';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import {
    repositoryFeedFilterLabel,
    type RepositoryFeedFilter,
    type RepositoryFeedItem,
} from '@/app/services/repository/repositoryUnifiedFeed';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';
import { RepositoryFeedList } from './RepositoryFeedList';

type RepositoryFeedPanelProps = {
    filter: RepositoryFeedFilter;
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
    searchQuery: string;
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    dossiers: DossierPickerOption[];
    vaultDocsById: Map<string, SmartVaultDoc>;
    rooms?: RepositoryRoom[];
    onMoveGlobalToRoom?: (note: GlobalNote, roomId: string | null) => void | Promise<void>;
    onMoveVaultDocToRoom?: (doc: SmartVaultDoc, roomId: string | null) => void | Promise<void>;
    onSaveGlobal: (note: GlobalNote) => void;
    onDeleteGlobal: (id: string | number) => void;
    onUpdateLawsuit: (file: FileData) => void;
    onUpdateExecution: (file: ExecutionFile) => void;
    onLinkGlobalToDossier: (note: GlobalNote, dossier: DossierPickerOption) => Promise<void>;
    onBindVaultDoc: (doc: SmartVaultDoc, dossier: DossierPickerOption) => Promise<void>;
    onDeleteVaultDoc: (doc: SmartVaultDoc) => void | Promise<void>;
    onEditVaultDoc: (doc: SmartVaultDoc) => void;
    onViewVaultDoc: (doc: SmartVaultDoc) => void | Promise<void>;
    viewingVaultDocId?: string | null;
    scrollParentRef?: RefObject<HTMLDivElement | null>;
    focusNoteId?: string;
};

function emptyCopy(filter: RepositoryFeedFilter, hasSearch: boolean): string {
    if (hasSearch) return 'لا توجد نتائج للبحث';
    if (filter === 'all') return 'المستودع فارغ';
    return `لا توجد عناصر في «${repositoryFeedFilterLabel(filter)}»`;
}

export const RepositoryFeedPanel = memo(function RepositoryFeedPanel({
    filter,
    items,
    feedLayout,
    searchQuery,
    lawsuitFiles,
    executionFiles,
    dossiers,
    vaultDocsById,
    rooms,
    onMoveGlobalToRoom,
    onMoveVaultDocToRoom,
    onSaveGlobal,
    onDeleteGlobal,
    onUpdateLawsuit,
    onUpdateExecution,
    onLinkGlobalToDossier,
    onBindVaultDoc,
    onDeleteVaultDoc,
    onEditVaultDoc,
    onViewVaultDoc,
    viewingVaultDocId,
    scrollParentRef,
    focusNoteId,
}: RepositoryFeedPanelProps) {
    if (items.length === 0) {
        const hasSearch = Boolean(searchQuery.trim());
        return (
            <div
                className="flex min-h-[18vh] flex-col items-center justify-center px-3 py-6 text-center"
                data-testid={`repository-feed-empty-${filter}`}
            >
                <p className="text-sm text-white/45 max-w-sm leading-relaxed">
                    {emptyCopy(filter, hasSearch)}
                </p>
            </div>
        );
    }

    return (
        <div
            data-repository-view={feedLayout}
            data-testid={`repository-feed-panel-${filter}`}
            data-repository-virtualized="true"
        >
            <RepositoryFeedList
                key={feedLayout}
                items={items}
                feedLayout={feedLayout}
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
                scrollParentRef={scrollParentRef}
                focusNoteId={focusNoteId}
            />
        </div>
    );
});
