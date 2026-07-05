import React, { useLayoutEffect, useState } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { AppearanceSection } from './appearance/AppearanceSection';
import { useSettingsSectionMountSet } from './hooks/useSettingsSectionMountSet';
import { SettingsSectionActiveProvider } from './settingsSectionActiveContext';
import {
    getResolvedSettingsSection,
    resolveSettingsSectionComponent,
} from './settingsSectionRegistry';

function SettingsSectionLoadingFallback() {
    return (
        <div
            className="px-2 pt-2 space-y-3"
            data-testid="settings-section-loading"
            aria-busy="true"
            aria-label="جاري تحميل قسم الإعدادات"
        >
            <div className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" aria-hidden />
            <div className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" aria-hidden />
            <div className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" aria-hidden />
        </div>
    );
}

type SettingsSectionPanelProps = {
    sectionId: SettingsSectionId;
    active: boolean;
    onClose: () => void;
    onEnterHomeLayoutEdit?: () => void;
    accountProps: SettingsSectionRouterProps['accountProps'];
};

function SettingsSectionPanel({
    sectionId,
    active,
    onClose,
    onEnterHomeLayoutEdit,
    accountProps,
}: SettingsSectionPanelProps) {
    const [Component, setComponent] = useState<React.ComponentType<object> | null>(() =>
        sectionId === 'appearance' ? AppearanceSection : getResolvedSettingsSection(sectionId),
    );

    useLayoutEffect(() => {
        if (!active || sectionId === 'appearance') return;

        const cached = getResolvedSettingsSection(sectionId);
        if (cached) {
            setComponent(() => cached);
            return;
        }

        let cancelled = false;
        void resolveSettingsSectionComponent(sectionId).then((next) => {
            if (!cancelled && next) setComponent(() => next);
        });
        return () => {
            cancelled = true;
        };
    }, [active, sectionId]);

    if (sectionId === 'appearance') {
        return <AppearanceSection onEnterHomeLayoutEdit={onEnterHomeLayoutEdit} />;
    }

    if (!Component) {
        return active ? <SettingsSectionLoadingFallback /> : null;
    }

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
    onEnterHomeLayoutEdit?: () => void;
    open?: boolean;
    accountProps: {
        onLogout?: () => void;
    };
};

export function SettingsSectionRouter({
    activeSection,
    onClose,
    onEnterHomeLayoutEdit,
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
                                active={isActive && open}
                                onClose={onClose}
                                onEnterHomeLayoutEdit={onEnterHomeLayoutEdit}
                                accountProps={accountProps}
                            />
                        </SettingsSectionActiveProvider>
                    </div>
                );
            })}
        </div>
    );
}
