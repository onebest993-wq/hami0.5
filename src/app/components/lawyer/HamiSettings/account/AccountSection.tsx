import React, { memo, useState } from 'react';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { useLawyerSettingsReset } from '@/app/context/LawyerSettingsContext';
import { SettingCard } from '../settings-ui/index';
import { AccountLegalDocumentSheet } from './AccountLegalDocumentSheet';
import { AccountSessionRows, AccountSupportRows } from './AccountSessionRows';
import { useAccountSectionActions } from './useAccountSectionActions';
import type { AccountLegalDocumentId } from './accountLegalContent';

export type AccountSectionProps = {
    onClose: () => void;
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>;
    userId?: string | null;
};

export const AccountSection = memo(function AccountSection({
    onClose,
    onLogout,
    userId,
}: AccountSectionProps) {
    const [openLegalDocument, setOpenLegalDocument] = useState<AccountLegalDocumentId | null>(null);
    const signedIn = isRealSignedIn(userId);
    const resetToDefaults = useLawyerSettingsReset();
    const actions = useAccountSectionActions(onClose, onLogout, resetToDefaults);

    return (
        <div data-testid="settings-section-account" data-settings-interactive="true">
            <SettingCard>
                <AccountSupportRows
                    openSupportLink={actions.openSupportLink}
                    onOpenLegalDocument={setOpenLegalDocument}
                />
                <AccountSessionRows
                    signedIn={signedIn}
                    onLogout={onLogout}
                    logoutPending={actions.logoutPending}
                    deletePhase={actions.deletePhase}
                    deleteCountdown={actions.deleteCountdown}
                    cancelDeleteCountdown={actions.cancelDeleteCountdown}
                    requestLogin={actions.requestLogin}
                    requestLogout={actions.requestLogout}
                    requestDeleteAccount={actions.requestDeleteAccount}
                />
            </SettingCard>
            <AccountLegalDocumentSheet
                documentId={openLegalDocument}
                onClose={() => setOpenLegalDocument(null)}
            />
        </div>
    );
});
