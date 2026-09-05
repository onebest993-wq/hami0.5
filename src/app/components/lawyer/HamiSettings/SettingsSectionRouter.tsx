import React, { Suspense, lazy, useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { SettingsSectionId } from '@/app/services/settings/types';
import { isSettingsLayerOpen } from '@/app/runtime/settingsInstantPaint';
import { SecuritySection } from './security/SecuritySection';
import { useSettingsSectionMountSet } from './hooks/useSettingsSectionMountSet';
import { SettingsSectionActiveProvider } from './settingsSectionActiveContext';
import { SettingsSectionInstantSlots } from './SettingsSectionInstantSlots';
import { SettingsSectionReveal } from './SettingsSectionReveal';
import {
    loadAccountSection,
    loadAppearanceSection,
    loadDataSection,
    prefetchSettingsSection,
} from './settingsSectionLoad';

const AppearanceSection = lazy(loadAppearanceSection);
const DataSection = lazy(loadDataSection);
const AccountSection = lazy(loadAccountSection);

type SettingsSectionPanelProps = {
    sectionId: SettingsSectionId;
    onClose: () => void;
    accountProps: SettingsSectionRouterProps['accountProps'];
    onReady: (id: SettingsSectionId) => void;
};

function SettingsSectionPanel({
    sectionId,
    onClose,
    accountProps,
    onReady,
}: SettingsSectionPanelProps) {
    switch (sectionId) {
        case 'security':
            return <SecuritySection />;
        case 'appearance':
            return (
                <Suspense fallback={<SettingsSectionInstantSlots />}>
                    <SettingsSectionReveal sectionId="appearance" onReady={onReady}>
                        <AppearanceSection />
                    </SettingsSectionReveal>
                </Suspense>
            );
        case 'data':
            return (
                <Suspense fallback={<SettingsSectionInstantSlots />}>
                    <SettingsSectionReveal sectionId="data" onReady={onReady}>
                        <DataSection onLogout={accountProps.onLogout} />
                    </SettingsSectionReveal>
                </Suspense>
            );
        case 'account':
            return (
                <Suspense fallback={<SettingsSectionInstantSlots />}>
                    <SettingsSectionReveal sectionId="account" onReady={onReady}>
                        <AccountSection
                            onClose={onClose}
                            onLogout={accountProps.onLogout}
                            userId={accountProps.userId}
                        />
                    </SettingsSectionReveal>
                </Suspense>
            );
    }
}

type SettingsSectionRouterProps = {
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
    const [renderedSection, setRenderedSection] = useState(activeSection);
    const [, startTransition] = useTransition();
    const mountedSections = useSettingsSectionMountSet(activeSection, contentLive);
    const readyIdsRef = useRef(new Set<SettingsSectionId>(['security']));
    const [readyTick, setReadyTick] = useState(0);

    const onSectionReady = useCallback((id: SettingsSectionId) => {
        if (readyIdsRef.current.has(id)) return;
        readyIdsRef.current.add(id);
        setReadyTick((tick) => tick + 1);
    }, []);

    useEffect(() => {
        if (activeSection === renderedSection) return;
        prefetchSettingsSection(activeSection);
        if (!contentLive) {
            setRenderedSection(activeSection);
            return;
        }
        if (!readyIdsRef.current.has(activeSection)) return;
        startTransition(() => {
            setRenderedSection(activeSection);
        });
    }, [activeSection, contentLive, readyTick, renderedSection]);

    return (
        <div className="hami-settings-section-frame mx-auto w-full">
            {Array.from(mountedSections).map((sectionId) => {
                const isShown = sectionId === renderedSection;
                const isIncoming = sectionId === activeSection && !isShown;
                const isIdle = !isShown && !isIncoming;
                return (
                    <div
                        key={sectionId}
                        hidden={isIdle}
                        aria-hidden={!isShown}
                        data-settings-section-id={sectionId}
                        data-settings-section-park={isIncoming ? '1' : undefined}
                    >
                        <SettingsSectionActiveProvider active={sectionId === activeSection && contentLive}>
                            <SettingsSectionPanel
                                sectionId={sectionId}
                                onClose={onClose}
                                accountProps={accountProps}
                                onReady={onSectionReady}
                            />
                        </SettingsSectionActiveProvider>
                    </div>
                );
            })}
        </div>
    );
}
