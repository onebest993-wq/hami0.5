import React, { useRef } from 'react';
import {
    resolveRepositoryCardArticleClass,
    resolveRepositoryCardInnerLayout,
} from './repositoryFeedLayout';
import { REPO_CARD } from './smartRepositoryTheme';
import { DossierEntryCard } from './entryCards/DossierEntryCard';
import { GlobalEntryCard } from './entryCards/GlobalEntryCard';
import { VaultEntryCard } from './entryCards/VaultEntryCard';
import type { UniversalEntryCardProps } from './entryCards/universalEntryCardTypes';

export type { UniversalEntryCardProps } from './entryCards/universalEntryCardTypes';

export const UniversalEntryCard = React.memo(function UniversalEntryCard({
    item,
    lawsuitFiles,
    executionFiles,
    dossiers,
    vaultDocsById,
    feedLayout = 'grid',
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
}: UniversalEntryCardProps) {
    const cardRef = useRef<HTMLElement>(null);
    const layoutId = feedLayout;
    const innerLayout = resolveRepositoryCardInnerLayout(layoutId);
    const cardClass = resolveRepositoryCardArticleClass({
        item,
        layoutId,
        baseCardClass: REPO_CARD,
    });
    const bodyClampClass = innerLayout === 'row' ? ' line-clamp-4 sm:line-clamp-5' : ' line-clamp-3';

    if (item.kind === 'vault_doc') {
        return (
            <VaultEntryCard
                item={item}
                cardRef={cardRef}
                cardClass={cardClass}
                feedLayout={layoutId}
                dossiers={dossiers}
                rooms={rooms}
                onMoveVaultDocToRoom={onMoveVaultDocToRoom}
                onBindVaultDoc={onBindVaultDoc}
                onDeleteVaultDoc={onDeleteVaultDoc}
                onEditVaultDoc={onEditVaultDoc}
                onViewVaultDoc={onViewVaultDoc}
                viewingVaultDocId={viewingVaultDocId}
            />
        );
    }

    if (item.kind === 'dossier') {
        return (
            <DossierEntryCard
                item={item}
                cardRef={cardRef}
                cardClass={cardClass}
                lawsuitFiles={lawsuitFiles}
                executionFiles={executionFiles}
                onSaveGlobal={onSaveGlobal}
                onUpdateLawsuit={onUpdateLawsuit}
                onUpdateExecution={onUpdateExecution}
            />
        );
    }

    return (
        <GlobalEntryCard
            item={item}
            cardRef={cardRef}
            cardClass={cardClass}
            innerLayout={innerLayout}
            bodyClampClass={bodyClampClass}
            vaultDocsById={vaultDocsById}
            dossiers={dossiers}
            lawsuitFiles={lawsuitFiles}
            executionFiles={executionFiles}
            onSaveGlobal={onSaveGlobal}
            onDeleteGlobal={onDeleteGlobal}
            onUpdateLawsuit={onUpdateLawsuit}
            onUpdateExecution={onUpdateExecution}
            onLinkGlobalToDossier={onLinkGlobalToDossier}
            onViewVaultDoc={onViewVaultDoc}
            rooms={rooms}
            onMoveGlobalToRoom={onMoveGlobalToRoom}
        />
    );
});
