import React from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { AppearanceSection } from './appearance/AppearanceSection';
import { useSettingsSectionMountSet } from './hooks/useSettingsSectionMountSet';
import { SettingsSectionActiveProvider } from './settingsSectionActiveContext';
import { getResolvedSettingsSection } from './settingsSectionRegistry';

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
    if (sectionId === 'appearance') {
        return <AppearanceSection />;
    }

    const Component = getResolvedSettingsSection(sectionId);
    if (!Component) return null;

    if (sectionId === 'account') {
        const Account = Component as React.ComponentType<{
            onClose: () => void;
            onLogout?: () => void;
        }>;
        return <Account onClose={onClose} onLogout={accountProps.onLogout} />;
    }

    return <Component />;
}

export type SettingsSectionRouterProps = {
    activeSection: SettingsSectionId;
    onClose: () => void;
    open?: boolean;
    accountProps: {
        onLogout?: () => void;
    };
};

export function SettingsSectionRouter({
    activeSection,
    onClose,
    open = true,
    accountProps,
}: SettingsSectionRouterProps) {
    const mountedSections = useSettingsSectionMountSet(activeSection);

    return (
        <div className="hami-settings-section-frame mx-auto w-full max-w-xl lg:max-w-2xl">
            {Array.from(mountedSections).map((sectionId) => {
                const isActive = sectionId === activeSection;
                return (
                    <div key={sectionId} hidden={!isActive} aria-hidden={!isActive}>
                        <SettingsSectionActiveProvider active={isActive && open}>
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
