import { useAuthUser } from '@/app/context/AuthContext';
import type { ActiveOrderFileProps } from '../types';
import { ConfirmDialogPortal } from '../components/ConfirmDialogPortal';
import type { ActiveOrderFileViewProps } from '../layout/ActiveOrderFileViewProps';
import { useOrderFileLifecycleState } from './useOrderFileLifecycleState';
import { assembleActiveOrderFileViewProps } from './assembleActiveOrderFileViewProps';
import { useActiveOrderFileWorkspaceCluster } from './useActiveOrderFileWorkspaceCluster';
import { useActiveOrderFileLifecycleCluster } from './useActiveOrderFileLifecycleCluster';

/** يجمّع كل hooks إضبارة المستعجل ويُرجع props جاهزة لـ ActiveOrderFileView */
export function useActiveOrderFileOrchestration({
    fileData,
    onClose,
    onCaseUpdated,
}: ActiveOrderFileProps): ActiveOrderFileViewProps {
    const fd = fileData as Record<string, unknown>;
    const authUser = useAuthUser();
    const userId = authUser?.id ?? null;
    const caseId = typeof fd?.id === 'string' ? fd.id : null;
    const defaultDeadlineDays = fd?.type === 'urgent_action' ? 7 : 3;

    const lifecycleState = useOrderFileLifecycleState({ fileData, defaultDeadlineDays });

    const workspace = useActiveOrderFileWorkspaceCluster({
        fileData,
        caseId,
        userId,
        onCaseUpdated,
        fd,
        lifecycleState,
    });

    const lifecycle = useActiveOrderFileLifecycleCluster({
        caseId,
        lifecycleState,
        workspace,
        defaultDeadlineDays,
        onCaseUpdated,
    });

    return assembleActiveOrderFileViewProps({
        onClose,
        confirmPortal: (
            <ConfirmDialogPortal
                open={workspace.confirmDialog.open}
                message={workspace.confirmDialog.message}
                onCancel={() => workspace.resolveConfirm(false)}
                onConfirm={() => workspace.resolveConfirm(true)}
            />
        ),
        lifecyclePanelProps: lifecycle.lifecyclePanelProps,
        casePathway: workspace.casePathway,
        partyWorkspace: workspace.partyWorkspaceBundle,
        metaPartyEdit: workspace.metaPartyEditBundle,
        orderWorkspaceActions: workspace.orderWorkspaceBundle,
        caseFollowups: workspace.caseFollowups,
        caseEvents: workspace.caseEvents,
        caseNotes: workspace.caseNotes,
        caseAttachments: workspace.caseAttachments,
        todayYmdValue: workspace.todayYmdValue,
        requestDateYmd: workspace.requestDateYmd,
        lifecycleDerived: lifecycle.lifecycleDerived,
        caseData: workspace.caseData,
        decisionNotificationModalOpen: lifecycle.decisionNotificationModalOpen,
        setDecisionNotificationModalOpen: lifecycle.setDecisionNotificationModalOpen,
        submitDecisionNotification: lifecycle.submitDecisionNotification,
    });
}
