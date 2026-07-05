import React, { memo } from 'react';
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
import { RepositoryFeedList } from './RepositoryFeedList';
import { shouldVirtualizeRepositoryFeed } from './repositoryFeedVirtualLayout';

type RepositoryFeedPanelProps = {
    filter: RepositoryFeedFilter;
    active: boolean;
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
    layoutClass: string;
    itemLayoutClass?: string;
    searchQuery: string;
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    dossiers: DossierPickerOption[];
    vaultDocsById: Map<string, SmartVaultDoc>;
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
};

function emptyCopy(filter: RepositoryFeedFilter, hasSearch: boolean): string {
    if (hasSearch) return 'لا توجد نتائج للبحث';
    if (filter === 'all') return 'المستودع فارغ — أنشئ بطاقة جديدة أو ارفع ملفاً';
    return `لا توجد عناصر في «${repositoryFeedFilterLabel(filter)}»`;
}

export const RepositoryFeedPanel = memo(function RepositoryFeedPanel({
    filter,
    active,
    items,
    feedLayout,
    layoutClass,
    itemLayoutClass = '',
    searchQuery,
    lawsuitFiles,
    executionFiles,
    dossiers,
    vaultDocsById,
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
}: RepositoryFeedPanelProps) {
    if (items.length === 0) {
        return (
            <p
                hidden={!active}
                className={`text-sm text-white/40 text-center py-10 ${active ? '' : 'hidden'}`}
                data-testid={`repository-feed-empty-${filter}`}
            >
                {emptyCopy(filter, Boolean(searchQuery.trim()))}
            </p>
        );
    }

    const virtualize = shouldVirtualizeRepositoryFeed(items.length);
    const containerClass = virtualize
        ? `${active ? '' : 'hidden'}`.trim()
        : `${layoutClass} ${active ? '' : 'hidden'}`.trim();

    return (
        <div
            hidden={!active}
            className={containerClass}
            data-repository-view={feedLayout}
            data-testid={`repository-feed-panel-${filter}`}
            data-repository-virtualized={virtualize ? 'true' : undefined}
            role="tabpanel"
            aria-hidden={!active}
        >
            <RepositoryFeedList
                items={items}
                itemLayoutClass={itemLayoutClass}
                feedLayout={feedLayout}
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
        </div>
    );
});
