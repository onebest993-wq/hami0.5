import React, { lazy, Suspense, useEffect, useMemo } from 'react';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import type { ContainerKindTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { prefetchProfileSettingsStudioTabs } from '@/app/utils/lazyComponents';
import { BlockLivePreview } from '../BlockLivePreview';
import { ProfileSettingsTabSkeleton } from './ProfileSettingsTabSkeleton';

const LazyProfileSettingsPrivacyTab = lazy(() =>
    import('./ProfileSettingsPrivacyTab').then((m) => ({ default: m.ProfileSettingsPrivacyTab })),
);
const LazyProfileSettingsAppearanceTab = lazy(() =>
    import('./ProfileSettingsAppearanceTab').then((m) => ({ default: m.ProfileSettingsAppearanceTab })),
);
const LazyProfileSettingsContainersTab = lazy(() =>
    import('./ProfileSettingsContainersTab').then((m) => ({ default: m.ProfileSettingsContainersTab })),
);

type ProfileSettingsSheetPanelsProps = {
    tab: ProfileSettingsTab;
    draft: ProfilePageCustomization;
    actions: ProfileAction[];
    randomDisabled: boolean;
    randomCooldownSec: number;
    containerKind: ContainerKindTab;
    setContainerKind: (kind: ContainerKindTab) => void;
    textBlocks: ProfileCustomBlock[];
    imageBlocks: ProfileCustomBlock[];
    expandedBlockId: string | null;
    setExpandedBlockId: React.Dispatch<React.SetStateAction<string | null>>;
    uploadingBlockId: string | null;
    uploadingCanvasBlockId: string | null;
    onDraftChange: (updater: (prev: ProfilePageCustomization) => ProfilePageCustomization) => void;
    onToggleContactVisibility: (actionId: string, hidden: boolean) => void;
    onRandomAppearance: () => void;
    onAddBlock: (kind: 'text' | 'image') => void;
    onUpdateBlock: (id: string, patch: Partial<ProfileCustomBlock>) => void;
    onRemoveBlock: (id: string) => void;
    onPickBlockImage: (blockId: string) => void;
    onUploadCanvasBg: (blockId: string) => void;
};

function ProfileSettingsTabPanel({
    active,
    tabId,
    children,
}: {
    active: boolean;
    tabId: ProfileSettingsTab;
    children: React.ReactNode;
}) {
    return (
        <div
            id={`profile-settings-panel-${tabId}`}
            role="tabpanel"
            aria-labelledby={`profile-settings-tab-${tabId}`}
            hidden={!active}
            className={active ? '' : 'hidden'}
            data-testid={`profile-settings-panel-${tabId}`}
        >
            {children}
        </div>
    );
}

export function ProfileSettingsSheetPanels({
    tab,
    draft,
    actions,
    randomDisabled,
    randomCooldownSec,
    containerKind,
    setContainerKind,
    textBlocks,
    imageBlocks,
    expandedBlockId,
    setExpandedBlockId,
    uploadingBlockId,
    uploadingCanvasBlockId,
    onDraftChange,
    onToggleContactVisibility,
    onRandomAppearance,
    onAddBlock,
    onUpdateBlock,
    onRemoveBlock,
    onPickBlockImage,
    onUploadCanvasBg,
}: ProfileSettingsSheetPanelsProps) {
    useEffect(() => {
        prefetchProfileSettingsStudioTabs();
    }, []);

    const expandedContainerBlock = useMemo(() => {
        if (tab !== 'containers' || !expandedBlockId) return null;
        return (
            textBlocks.find((b) => b.id === expandedBlockId) ??
            imageBlocks.find((b) => b.id === expandedBlockId) ??
            null
        );
    }, [tab, expandedBlockId, textBlocks, imageBlocks]);

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {expandedContainerBlock ? (
                <div
                    className="profile-settings-block-preview-dock shrink-0 px-4 pt-2 pb-2"
                    data-testid="profile-block-preview-dock"
                >
                    <BlockLivePreview block={expandedContainerBlock} interactive />
                </div>
            ) : null}
            <div className="profile-settings-scroll-panel flex-1 overflow-y-auto px-4 py-2 min-h-0 overscroll-contain">
                <ProfileSettingsTabPanel active={tab === 'privacy'} tabId="privacy">
                    <Suspense fallback={<ProfileSettingsTabSkeleton />}>
                        <LazyProfileSettingsPrivacyTab
                            draft={draft}
                            actions={actions}
                            onDraftChange={onDraftChange}
                            onToggleContactVisibility={onToggleContactVisibility}
                        />
                    </Suspense>
                </ProfileSettingsTabPanel>
                <ProfileSettingsTabPanel active={tab === 'appearance'} tabId="appearance">
                    <Suspense fallback={<ProfileSettingsTabSkeleton />}>
                        <LazyProfileSettingsAppearanceTab
                            draft={draft}
                            randomDisabled={randomDisabled}
                            randomCooldownSec={randomCooldownSec}
                            onDraftChange={onDraftChange}
                            onRandomAppearance={onRandomAppearance}
                        />
                    </Suspense>
                </ProfileSettingsTabPanel>
                <ProfileSettingsTabPanel active={tab === 'containers'} tabId="containers">
                    <Suspense fallback={<ProfileSettingsTabSkeleton />}>
                        <LazyProfileSettingsContainersTab
                            containerKind={containerKind}
                            setContainerKind={setContainerKind}
                            textBlocks={textBlocks}
                            imageBlocks={imageBlocks}
                            expandedBlockId={expandedBlockId}
                            setExpandedBlockId={setExpandedBlockId}
                            uploadingBlockId={uploadingBlockId}
                            uploadingCanvasBlockId={uploadingCanvasBlockId}
                            onAddBlock={onAddBlock}
                            onUpdateBlock={onUpdateBlock}
                            onRemoveBlock={onRemoveBlock}
                            onPickBlockImage={onPickBlockImage}
                            onUploadCanvasBg={onUploadCanvasBg}
                        />
                    </Suspense>
                </ProfileSettingsTabPanel>
            </div>
        </div>
    );
}
