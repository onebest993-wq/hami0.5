import React, { Suspense, useMemo } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { loadSettingsSection } from './settingsSectionLoader';
import { useSettingsSectionMountSet } from './hooks/useSettingsSectionMountSet';
import { SettingsSectionActiveProvider } from './settingsSectionActiveContext';
import { AppearanceSection } from './appearance/AppearanceSection';

const LazySecuritySection = React.lazy(() =>
    loadSettingsSection('security').then((m) => ({ default: m.SecuritySection! })),
);
const LazyDataSection = React.lazy(() =>
    loadSettingsSection('data').then((m) => ({ default: m.DataSection! })),
);
const LazyAccountSection = React.lazy(() =>
    loadSettingsSection('account').then((m) => ({ default: m.AccountSection! })),
);

type SettingsSectionRouterProps = {
    activeSection: SettingsSectionId;
    onClose: () => void;
    onEnterHomeLayoutEdit?: () => void;
    /** false مع keep-alive — لا spinner في الخلفية */
    open?: boolean;
    accountProps: {
        onLogout?: () => void;
        onOpenProfile?: () => void;
        onOpenPrivacy?: () => void;
    };
};

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

function renderSection(
    id: SettingsSectionId,
    props: Omit<SettingsSectionRouterProps, 'activeSection' | 'open'>,
): React.ReactNode {
    switch (id) {
        case 'appearance':
            return <AppearanceSection onEnterHomeLayoutEdit={props.onEnterHomeLayoutEdit} />;
        case 'security':
            return <LazySecuritySection />;
        case 'data':
            return <LazyDataSection />;
        case 'account':
            return (
                <LazyAccountSection
                    onClose={props.onClose}
                    onLogout={props.accountProps.onLogout}
                    onOpenProfile={props.accountProps.onOpenProfile}
                    onOpenPrivacy={props.accountProps.onOpenPrivacy}
                />
            );
        default:
            return null;
    }
}

export function SettingsSectionRouter({
    activeSection,
    onClose,
    onEnterHomeLayoutEdit,
    open = true,
    accountProps,
}: SettingsSectionRouterProps) {
    const mountedSections = useSettingsSectionMountSet(activeSection);
    const sectionProps = useMemo(
        () => ({ onClose, onEnterHomeLayoutEdit, accountProps }),
        [accountProps, onClose, onEnterHomeLayoutEdit],
    );

    return (
        <div className="hami-settings-section-frame mx-auto w-full max-w-xl lg:max-w-2xl">
            {Array.from(mountedSections).map((sectionId) => {
                const isActive = sectionId === activeSection;
                return (
                    <div key={sectionId} hidden={!isActive} aria-hidden={!isActive}>
                        <SettingsSectionActiveProvider active={isActive}>
                            <Suspense fallback={<SettingsSectionLoadingFallback />}>
                                {renderSection(sectionId, sectionProps)}
                            </Suspense>
                        </SettingsSectionActiveProvider>
                    </div>
                );
            })}
        </div>
    );
}
