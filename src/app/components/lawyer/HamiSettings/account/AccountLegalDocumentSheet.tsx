import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLawyerSettingsAppearance } from '@/app/context/LawyerSettingsContext';
import { registerAccountLegalDocumentGuard } from '../settingsEscapeStack';
import { SettingsNestedSheetFrame } from '../SettingsNestedSheetFrame';
import type { AccountLegalDocument, AccountLegalDocumentId } from './accountLegalContent';
import { loadAccountLegalDocuments } from './accountLegalContentLoad';
import { AccountLegalDocumentHeader } from './AccountLegalDocumentHeader';
import { AccountLegalDocumentBody } from './AccountLegalDocumentBody';

function resolveSheetPortalRoot(): HTMLElement {
    return (
        document.querySelector('[data-testid="hami-settings-overlay-host"]') ??
        document.querySelector('[data-hami-settings-shell]')?.parentElement ??
        document.body
    );
}

export function AccountLegalDocumentSheet({
    documentId,
    onClose,
}: {
    documentId: AccountLegalDocumentId | null;
    onClose: () => void;
}) {
    const appearance = useLawyerSettingsAppearance();
    const shellDir = appearance.language === 'en' ? 'ltr' : 'rtl';
    const open = documentId !== null;
    const [doc, setDoc] = useState<AccountLegalDocument | null>(null);

    useEffect(() => {
        if (!documentId) {
            setDoc(null);
            return;
        }
        let cancelled = false;
        void loadAccountLegalDocuments()
            .then((documents) => {
                if (!cancelled) setDoc(documents[documentId] ?? null);
            })
            .catch(() => {
                if (!cancelled) setDoc(null);
            });
        return () => {
            cancelled = true;
        };
    }, [documentId]);

    useEffect(() => {
        if (!open) {
            registerAccountLegalDocumentGuard(false);
            return;
        }
        registerAccountLegalDocumentGuard(true, onClose);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            registerAccountLegalDocumentGuard(false);
        };
    }, [onClose, open]);

    if (!open || !doc || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <SettingsNestedSheetFrame
            testId="account-legal-document-sheet"
            extraRootClassName="hami-account-legal-document-sheet"
            extraRootProps={{ 'data-account-legal-doc': doc.id }}
            dir={shellDir}
            label={doc.title}
            onClose={onClose}
        >
            <AccountLegalDocumentHeader doc={doc} onClose={onClose} />
            <AccountLegalDocumentBody doc={doc} />
        </SettingsNestedSheetFrame>,
        resolveSheetPortalRoot(),
    );
}
