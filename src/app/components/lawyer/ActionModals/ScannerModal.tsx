import React from 'react';
import { createPortal } from 'react-dom';
import { SmartVaultScannerPanel, type ScannerSaveResult } from '@/app/components/lawyer/SmartVaultModal/SmartVaultScannerPanel';

interface ScannerResult {
    text: string;
    image: string;
    storagePath?: string;
    signedUrl?: string;
}

interface ScannerModalProps {
    onClose: () => void;
    onScanComplete?: (result: ScannerResult) => void;
    userId: string;
}

/** @deprecated استخدم SmartVaultModal مع الماسح المدمج */
export const ScannerModal = ({ onClose, onScanComplete, userId }: ScannerModalProps) => {
    const handleSaved = (result: ScannerSaveResult) => {
        onScanComplete?.({
            text: result.text,
            image: result.image,
            storagePath: result.storagePath,
            signedUrl: result.signedUrl ?? undefined,
        });
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <SmartVaultScannerPanel
            standalone
            userId={userId}
            onClose={onClose}
            onSaved={handleSaved}
        />,
        document.body,
    );
};
