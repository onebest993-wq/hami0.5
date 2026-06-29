import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import type { RepositoryFeedFilter, RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import { RepositoryFeedPanel } from './RepositoryFeedPanel';

type RepositoryFeedSectionProps = {
    feedLoading: boolean;
    activeFilter: RepositoryFeedFilter;
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
    layoutClass: string;
    itemLayoutClass: string;
    searchQuery: string;
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    dossiers: DossierPickerOption[];
    vaultDocsById: Map<string, SmartVaultDoc>;
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
};

export const RepositoryFeedSection = memo(function RepositoryFeedSection({
    feedLoading,
    activeFilter,
    items,
    feedLayout,
    layoutClass,
    itemLayoutClass,
    searchQuery,
    lawsuitFiles,
    executionFiles,
    dossiers,
    vaultDocsById,
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
}: RepositoryFeedSectionProps) {
    if (feedLoading) {
        return (
            <div
                className="flex items-center justify-center py-12"
                data-testid="repository-feed-loading"
                aria-busy="true"
            >
                <Loader2 size={32} className="text-[#E6C673] animate-spin" />
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
            searchQuery={searchQuery}
            lawsuitFiles={lawsuitFiles}
            executionFiles={executionFiles}
            dossiers={dossiers}
            vaultDocsById={vaultDocsById}
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
        />
    );
});
