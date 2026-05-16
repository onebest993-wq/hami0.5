import type { ReactNode } from 'react';
import type { AdminWorkspacePanelProps } from './AdminWorkspacePanelProps';
import type { ActiveOrderFileHeaderProps } from './ActiveOrderFileHeader';
import type { LifecyclePanelProps } from './LifecyclePanelProps';
import type { MetaEditModalProps } from '../modals/MetaEditModal';
import type { PartyEditModalProps } from '../modals/PartyEditModal';

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
    metaEdit: Pick<MetaEditModalProps, 'open' | 'isIqrarContext' | 'khulasaText' | 'metaEditForm' | 'setMetaEditForm' | 'onClose' | 'onSave'>;
    partyEdit: Pick<PartyEditModalProps, 'partyEditTarget' | 'partyEditForm' | 'setPartyEditForm' | 'onClose' | 'onSave'>;
    header: Omit<ActiveOrderFileHeaderProps, 'onClose' | 'formatDateText'> & {
        formatDateText: ActiveOrderFileHeaderProps['formatDateText'];
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
        isFinalized: boolean;
        onEditParty: (payload: { type: 'party1' | 'party2'; index: number; party: Record<string, unknown> }) => void;
    };
};
