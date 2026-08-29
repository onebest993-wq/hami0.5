import React, { useEffect, useLayoutEffect } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ArchivePortalProps } from '@/app/types/common';
import { useLawsuitArchivePortalController } from './hooks/useLawsuitArchivePortalController';
import { LawsuitArchiveChrome } from './LawsuitArchiveChrome';

export function ArchivePortalLawsuitSurface(props: ArchivePortalProps) {
    const portal = useLawsuitArchivePortalController({
        files: props.files,
        criminalCases: props.criminalCases,
        initialLawsuitJurisdictionTab: props.initialLawsuitJurisdictionTab,
        onPermanentlyDeleteLawsuits: props.onPermanentlyDeleteLawsuits,
        onMoveLawsuitToTrash: props.onMoveLawsuitToTrash,
        onArchiveLawsuit: props.onArchiveLawsuit,
        onRestoreLawsuitFromTrash: props.onRestoreLawsuitFromTrash,
        dossierSearchQuery: props.dossierSearchQuery,
        onDossierSearchQueryChange: props.onDossierSearchQueryChange,
        dossierViewMode: props.dossierViewMode,
        onDossierViewModeChange: props.onDossierViewModeChange,
        lawsuitLifecycleCounts: props.lawsuitLifecycleCounts,
        lawsuitArchivedFiles: props.lawsuitArchivedFiles as FileData[] | null | undefined,
        lawsuitTrashFiles: props.lawsuitTrashFiles as FileData[] | null | undefined,
        onEnsureLawsuitArchivedLoaded: props.onEnsureLawsuitArchivedLoaded,
        onEnsureLawsuitTrashLoaded: props.onEnsureLawsuitTrashLoaded,
    });

    useLayoutEffect(() => {
        props.onLawsuitShellChrome?.({
            lawsuitViewMode: portal.lawsuitViewMode,
            setLawsuitViewMode: portal.setLawsuitViewMode,
            unifiedArchivedCount: portal.unifiedArchivedCount,
            lawsuitTrashedCount: portal.lawsuitTrashedCount,
        });
    }, [
        props.onLawsuitShellChrome,
        portal.lawsuitViewMode,
        portal.setLawsuitViewMode,
        portal.unifiedArchivedCount,
        portal.lawsuitTrashedCount,
    ]);

    useEffect(() => {
        return () => {
            props.onLawsuitShellChrome?.(null);
        };
    }, [props.onLawsuitShellChrome]);

    return <LawsuitArchiveChrome {...props} portal={portal} />;
}
