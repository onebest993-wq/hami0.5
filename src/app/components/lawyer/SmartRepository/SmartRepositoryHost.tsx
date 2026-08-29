import React, { useLayoutEffect } from 'react';
import { SmartRepositoryModal } from '@/app/components/lawyer/SmartRepositoryModal';
import type { SmartRepositoryModalProps } from '@/app/components/lawyer/SmartRepositoryModal';
import { prefetchVaultBlobStore } from '@/app/services/vaultBlobStore';
import { prefetchRepositoryDialogs } from '@/app/components/lawyer/SmartRepository/repositoryDialog';

/**
 * المستودع — استيراد ثابت؛ keepAlive يبقي المودال مخفياً للكشف اللحظي.
 */
export function SmartRepositoryHost(props: SmartRepositoryModalProps): React.ReactElement | null {
    const { isOpen, keepAlive = false } = props;

    useLayoutEffect(() => {
        if (!isOpen) return;
        void import('@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor');
        void import('@/app/components/lawyer/SmartVaultModal/SmartVaultScannerPanel');
        void import('@/app/components/lawyer/SmartVaultModal/VaultUploadMetaSheet');
        void import('@/app/components/lawyer/ActionModals/VoiceRecorderModal');
        prefetchVaultBlobStore();
        prefetchRepositoryDialogs();
    }, [isOpen]);

    if (!isOpen && !keepAlive) {
        return null;
    }

    return <SmartRepositoryModal {...props} />;
}
