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
import { shouldVirtualizeRepositoryFeed } from './repositoryFeedVirtualLayout';

type RepositoryFeedPanelProps = {
    filter: RepositoryFeedFilter;
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
    layoutClass: string;
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
    layoutClass,
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
}: RepositoryFeedPanelProps) {
    if (items.length === 0) {
        const hasSearch = Boolean(searchQuery.trim());
        return (
            <div
                className="flex min-h-[28vh] flex-col items-center justify-center px-4 py-10 text-center"
                data-testid={`repository-feed-empty-${filter}`}
            >
                <p className="text-sm text-white/45 max-w-sm leading-relaxed">
                    {emptyCopy(filter, hasSearch)}
                </p>
            </div>
        );
    }

    const virtualize = shouldVirtualizeRepositoryFeed(items.length);

    return (
        <div
            className={virtualize ? undefined : layoutClass}
            data-repository-view={feedLayout}
            data-testid={`repository-feed-panel-${filter}`}
            data-repository-virtualized={virtualize ? 'true' : undefined}
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
            />
        </div>
    );
});
