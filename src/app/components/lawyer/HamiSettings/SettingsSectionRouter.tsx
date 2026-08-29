import React, { Suspense, lazy } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { isSettingsLayerOpen } from '@/app/runtime/settingsInstantPaint';
import { SecuritySection } from './security/SecuritySection';
import { useSettingsSectionMountSet } from './hooks/useSettingsSectionMountSet';
import { SettingsSectionActiveProvider } from './settingsSectionActiveContext';

const AppearanceSection = lazy(() =>
    import('./appearance/AppearanceSection').then((m) => ({ default: m.AppearanceSection })),
);
const DataSection = lazy(() => import('./data/DataSection').then((m) => ({ default: m.DataSection })));
const AccountSection = lazy(() =>
    import('./account/AccountSection').then((m) => ({ default: m.AccountSection })),
);

type SettingsSectionPanelProps = {
    sectionId: SettingsSectionId;
    onClose: () => void;
    accountProps: SettingsSectionRouterProps['accountProps'];
};

function SettingsSectionPanel({
    sectionId,
    onClose,
    accountProps,
}: SettingsSectionPanelProps) {
    switch (sectionId) {
        case 'security':
            return <SecuritySection />;
        case 'appearance':
            return (
                <Suspense fallback={null}>
                    <AppearanceSection />
                </Suspense>
            );
        case 'data':
            return (
                <Suspense fallback={null}>
                    <DataSection onLogout={accountProps.onLogout} />
                </Suspense>
            );
        case 'account':
            return (
                <Suspense fallback={null}>
                    <AccountSection
                        onClose={onClose}
                        onLogout={accountProps.onLogout}
                        userId={accountProps.userId}
                    />
                </Suspense>
            );
    }
}

export type SettingsSectionRouterProps = {
    activeSection: SettingsSectionId;
    onClose: () => void;
    open?: boolean;
    accountProps: {
        onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>;
        userId?: string | null;
    };
};

export function SettingsSectionRouter({
    activeSection,
    onClose,
    open = true,
    accountProps,
}: SettingsSectionRouterProps) {
    const contentLive = isSettingsLayerOpen(open);
    const mountedSections = useSettingsSectionMountSet(activeSection, contentLive);

    return (
        <div className="hami-settings-section-frame mx-auto w-full max-w-xl lg:max-w-2xl">
            {Array.from(mountedSections).map((sectionId) => {
                const isActive = sectionId === activeSection;
                return (
                    <div key={sectionId} hidden={!isActive} aria-hidden={!isActive}>
                        <SettingsSectionActiveProvider active={isActive && contentLive}>
                            <SettingsSectionPanel
                                sectionId={sectionId}
                                onClose={onClose}
                                accountProps={accountProps}
                            />
                        </SettingsSectionActiveProvider>
                    </div>
                );
            })}
        </div>
    );
}
