import type { ReactNode } from 'react';
import type { AdminWorkspacePanelProps } from './AdminWorkspacePanelProps';
import type { ActiveOrderFileHeaderProps } from './ActiveOrderFileHeader';
import type { LifecyclePanelProps } from './LifecyclePanelProps';
import type { DossierEditModalProps } from '../modals/DossierEditModal';

export type ActiveOrderFileViewProps = {
    onClose: () => void;
    confirmPortal: ReactNode;
    lifecyclePanelProps: LifecyclePanelProps;
    adminWorkspace: AdminWorkspacePanelProps;
    decisionNotificationModal: {
        isOpen: boolean;
        onClose: () => void;
        caseName: string;
        minActionDate?: string;
        onSubmit: (payload: { actionDate: string }) => void;
    };
    dossierEdit: Pick<
        DossierEditModalProps,
        | 'open'
        | 'isIqrarContext'
        | 'procedureType'
        | 'dossierEditForm'
        | 'setDossierEditForm'
        | 'onClose'
        | 'onSave'
    >;
    header: Omit<ActiveOrderFileHeaderProps, 'onClose' | 'formatDateText' | 'onOpenEdit'> & {
        formatDateText: ActiveOrderFileHeaderProps['formatDateText'];
        onOpenEdit: () => void;
    };
    archive?: {
        isIqrarContext: boolean;
        archiveSummaryText: string;
        archivedAt?: string;
        formatDateTimeText: (value: unknown) => string;
    };
    parties: {
        party1Entries: Record<string, unknown>[];
        party2Entries: Record<string, unknown>[];
        procedureType: string;
    };
};
