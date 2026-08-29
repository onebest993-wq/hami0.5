import { createContext, useContext, type ReactNode } from 'react';
import type { FollowupModalSnapshot as FollowupGeneratedSnapshot } from './followupSnapshotFieldKeys';

/**
 * مكوّنات تبويب المحضر + lazy — خارج القائمة المولَّدة في followupSnapshotFieldKeys
 * (generate-shell-overlay-infra يعيد كتابة تلك القائمة).
 */
export type FollowupModalPortalTabKey =
    | 'CoerciveTab'
    | 'LazyCoerciveTab'
    | 'PersonalTab'
    | 'LazyPersonalTab'
    | 'SeizureRequestsTab'
    | 'LazySeizureRequestsTab'
    | 'FinancialTab'
    | 'LazyFinancialTab'
    | 'DossierControlsTab'
    | 'LazyDossierControlsTab'
    | 'OtherPartyTab'
    | 'LazyOtherPartyTab'
    | 'RequestsTab'
    | 'LazyRequestsTab'
    | 'CommunicationsTab'
    | 'LazyCommunicationsTab'
    | 'DebtorFinancialProgressBar';

export type FollowupModalSnapshot = FollowupGeneratedSnapshot &
    Partial<Record<FollowupModalPortalTabKey, unknown>>;

const FollowupModalStoreContext = createContext<FollowupModalSnapshot | null>(null);

/** @deprecated Alias — scope wiring only; provider is FollowupModalStoreProvider */
export const FollowupModalContext = FollowupModalStoreContext;

export function FollowupModalStoreProvider({
    snapshot,
    children,
}: {
    snapshot: FollowupModalSnapshot;
    children: ReactNode;
}) {
    return (
        <FollowupModalStoreContext.Provider value={snapshot}>
            {children}
        </FollowupModalStoreContext.Provider>
    );
}

export function useFollowupModal(): FollowupModalSnapshot {
    const snapshot = useContext(FollowupModalStoreContext);
    if (!snapshot) {
        throw new Error('useFollowupModal must run inside FollowupModalStoreProvider');
    }
    return snapshot;
}
