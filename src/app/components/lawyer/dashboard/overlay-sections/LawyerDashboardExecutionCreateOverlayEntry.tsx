import React from 'react';
import { ExecutionCreationPortal } from '@/app/components/lawyer/dashboard/ExecutionCreationPortal';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';

type Props = Pick<LawyerDashboardOverlaysBundleProps, 'archive' | 'executionCreate'>;

/**
 * إنشاء إضبارة تنفيذ — على MainView مباشرة.
 * Escape يُدار من LawyerDashboardMainView.
 */
export function LawyerDashboardExecutionCreateOverlayEntry({
    archive,
    executionCreate,
}: Props): React.ReactElement | null {
    const { isExecutionModalOpen, setIsExecutionModalOpen, handleAddExecutionFile } = executionCreate;
    if (!isExecutionModalOpen) return null;

    return (
        <ExecutionCreationPortal
            key="execution-create"
            isOpen={isExecutionModalOpen}
            onClose={() => {
                setIsExecutionModalOpen(false);
                // العودة لمخزن التنفيذ وليس الرئيسية
                archive.setArchiveType('execution');
            }}
            onSave={handleAddExecutionFile}
        />
    );
}
