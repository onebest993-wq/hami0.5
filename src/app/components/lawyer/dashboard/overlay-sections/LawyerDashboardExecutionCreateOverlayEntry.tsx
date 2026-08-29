import React from 'react';
import { ExecutionCreationPortal } from '@/app/components/lawyer/dashboard/ExecutionCreationPortal';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import {
    EXECUTION_CREATE_CLOSE_GUARD_MS,
    EXECUTION_CREATE_UNMOUNT_DELAY_MS,
    armExecutionCreateCloseGuard,
    clearExecutionCreateCloseGuard,
} from '@/app/components/lawyer/dashboard/executionCreateCloseGuard';

type Props = Pick<LawyerDashboardOverlaysBundleProps, 'archive' | 'executionCreate'> & {
    onCloseCreate?: () => void;
};

/**
 * إنشاء إضبارة تنفيذ — على MainView مباشرة.
 * Escape يُدار من LawyerDashboardMainView.
 */
export function LawyerDashboardExecutionCreateOverlayEntry({
    archive,
    executionCreate,
    onCloseCreate,
}: Props): React.ReactElement | null {
    const { isExecutionModalOpen, setIsExecutionModalOpen, handleAddExecutionFile } = executionCreate;
    if (!isExecutionModalOpen) return null;

    const closeCreate = () => {
        armExecutionCreateCloseGuard();
        window.setTimeout(() => {
            if (onCloseCreate) {
                onCloseCreate();
                return;
            }
            setIsExecutionModalOpen(false);
            archive.setArchiveType('execution');
            window.setTimeout(() => {
                clearExecutionCreateCloseGuard();
            }, EXECUTION_CREATE_CLOSE_GUARD_MS);
        }, EXECUTION_CREATE_UNMOUNT_DELAY_MS);
    };

    return (
        <ExecutionCreationPortal
            key="execution-create"
            isOpen={isExecutionModalOpen}
            onClose={closeCreate}
            onSave={handleAddExecutionFile}
        />
    );
}
