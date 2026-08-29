import React, { Suspense, type ReactElement, type ReactNode } from 'react';
import { AdminDashboard } from '@/app/components/AdminDashboard';
import {
    AdminHeadquartersLoginGate,
    AdminPcAccessDenied,
    type AdminAccessDenyInfo,
} from '@/app/components/admin/AdminHeadquartersAccess';
import { RequireTrustedDevice } from '@/app/components/admin/RequireTrustedDevice';
import { HqStepUpHost } from '@/app/components/admin/HqStepUpHost';
import { setPreferredAuthGateMode } from '@/app/services/auth/authGatePreferredMode';

export type HostInnerProps = {
    pending: boolean;
    allowed: boolean;
    needsLogin: boolean;
    deny: AdminAccessDenyInfo;
    fallback: ReactNode;
    onSessionRequired: () => void;
    onLoggedIn?: () => void;
    onBack: () => void;
    onLogout: () => void;
    onSwitchAccount: () => Promise<void> | void;
    /** تطوير فقط — يتجاوز بوابة الجهاز الموثّق ورمز التأكيد. */
    skipTrustedDevice?: boolean;
    /** بعد إقلاع جلسة المقر التطويرية يبدأ النبض الحي. */
    devSessionReady?: boolean;
};

export default function HostInner({
    pending,
    allowed,
    needsLogin,
    deny,
    fallback,
    onSessionRequired,
    onLoggedIn,
    onBack,
    onLogout,
    onSwitchAccount,
    skipTrustedDevice = false,
    devSessionReady = true,
}: HostInnerProps): ReactElement {
    if (skipTrustedDevice && !devSessionReady) return <>{fallback}</>;
    if (skipTrustedDevice) {
        return (
            <>
                <HqStepUpHost />
                <AdminDashboard onLogout={onLogout} skipLiveProbe={!devSessionReady} />
            </>
        );
    }
    if (pending && !allowed) return <>{fallback}</>;
    if (allowed) {
        const dashboard = <AdminDashboard onLogout={onLogout} />;
        return (
            <Suspense fallback={fallback}>
                <RequireTrustedDevice onSessionRequired={onSessionRequired}>
                    <>
                        <HqStepUpHost />
                        {dashboard}
                    </>
                </RequireTrustedDevice>
            </Suspense>
        );
    }
    if (needsLogin) {
        return <AdminHeadquartersLoginGate onBack={onBack} onLoggedIn={onLoggedIn} />;
    }
    return (
        <AdminPcAccessDenied
            onBack={onBack}
            onSwitchAccount={() => {
                setPreferredAuthGateMode('login');
                void onSwitchAccount();
            }}
            info={deny}
        />
    );
}
