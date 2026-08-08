import React, { useLayoutEffect } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
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
        dossierSearchOpen: props.dossierSearchOpen,
        onDossierSearchOpenChange: props.onDossierSearchOpenChange,
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
        let cancelled = false;
        const report = () => {
            if (cancelled) return;
            props.onLawsuitShellChrome?.({
                lawsuitViewMode: portal.lawsuitViewMode,
                setLawsuitViewMode: portal.setLawsuitViewMode,
                unifiedArchivedCount: portal.unifiedArchivedCount,
                lawsuitTrashedCount: portal.lawsuitTrashedCount,
                hasLawsuitLifecycle: portal.hasLawsuitLifecycle,
            });
        };
        // بعد أول طلاء للشبكة — لا تعِد رسم InstantShell أثناء commit المحتوى
        const idle =
            typeof requestIdleCallback !== 'undefined'
                ? requestIdleCallback(report, { timeout: 400 })
                : window.setTimeout(report, 0);
        return () => {
            cancelled = true;
            if (typeof cancelIdleCallback !== 'undefined' && typeof idle === 'number') {
                cancelIdleCallback(idle as number);
            } else {
                window.clearTimeout(idle as number);
            }
            props.onLawsuitShellChrome?.(null);
        };
    }, [
        props.onLawsuitShellChrome,
        portal.lawsuitViewMode,
        portal.setLawsuitViewMode,
        portal.unifiedArchivedCount,
        portal.lawsuitTrashedCount,
        portal.hasLawsuitLifecycle,
    ]);

    return <LawsuitArchiveChrome {...props} portal={portal} />;
}
