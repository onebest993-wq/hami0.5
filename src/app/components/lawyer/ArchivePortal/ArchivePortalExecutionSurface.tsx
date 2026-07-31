import React from 'react';
import type { ArchivePortalProps } from '@/app/types/common';
import { executionTrashDaysRemaining } from '@/app/utils/executionTrash';
import { useArchivePortalController } from './hooks/useArchivePortalController';
import { ArchivePortalChrome } from './ArchivePortalChrome';

export function ArchivePortalExecutionSurface(props: ArchivePortalProps) {
    const portal = useArchivePortalController({
        type: props.type,
        files: props.files,
        criminalCases: props.criminalCases,
        initialLawsuitJurisdictionTab: props.initialLawsuitJurisdictionTab,
        onPermanentlyDeleteExecutions: props.onPermanentlyDeleteExecutions,
        onPermanentlyDeleteLawsuits: props.onPermanentlyDeleteLawsuits,
        onMoveLawsuitToTrash: props.onMoveLawsuitToTrash,
        onArchiveLawsuit: props.onArchiveLawsuit,
        onRestoreLawsuitFromTrash: props.onRestoreLawsuitFromTrash,
        onMoveExecutionToTrash: props.onMoveExecutionToTrash,
        onRestoreExecutionFromTrash: props.onRestoreExecutionFromTrash,
        onArchiveExecution: props.onArchiveExecution,
        onRestoreArchivedExecution: props.onRestoreArchivedExecution,
    });
    return (
        <ArchivePortalChrome
            {...props}
            portal={portal}
            executionTrashDaysRemaining={executionTrashDaysRemaining}
        />
    );
}
