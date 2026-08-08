import React from 'react';
import type { ArchivePortalProps } from '@/app/types/common';
import { executionTrashDaysRemaining } from '@/app/utils/executionTrash';
import { useArchivePortalController } from './hooks/useArchivePortalController';
import { ExecutionArchiveChrome } from './ExecutionArchiveChrome';

export function ArchivePortalExecutionSurface(props: ArchivePortalProps) {
    const portal = useArchivePortalController({
        files: props.files,
        onPermanentlyDeleteExecutions: props.onPermanentlyDeleteExecutions,
        onMoveExecutionToTrash: props.onMoveExecutionToTrash,
        onRestoreExecutionFromTrash: props.onRestoreExecutionFromTrash,
        onArchiveExecution: props.onArchiveExecution,
        onRestoreArchivedExecution: props.onRestoreArchivedExecution,
    });
    return (
        <ExecutionArchiveChrome
            {...props}
            portal={portal}
            executionTrashDaysRemaining={executionTrashDaysRemaining}
        />
    );
}
