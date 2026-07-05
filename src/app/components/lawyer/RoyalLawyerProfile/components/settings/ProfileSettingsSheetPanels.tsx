import React, { useLayoutEffect, useMemo, useState } from 'react';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import type { ContainerKindTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    getCachedProfileSettingsAppearanceTab,
    getCachedProfileSettingsContainersTab,
    getCachedProfileSettingsPrivacyTab,
    isProfileSettingsStudioTabsResolved,
    loadProfileSettingsStudioTabs,
    prefetchProfileSettingsStudioTabsModule,
} from '@/app/runtime/profileSettingsStudioTabsLoader';
import { BlockLivePreview } from '../BlockLivePreview';
import { ProfileSettingsTabSkeleton } from './ProfileSettingsTabSkeleton';

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
    const [tabsReady, setTabsReady] = useState(() => isProfileSettingsStudioTabsResolved());

    useLayoutEffect(() => {
        prefetchProfileSettingsStudioTabsModule();
        if (isProfileSettingsStudioTabsResolved()) {
            setTabsReady(true);
            return;
        }

        let cancelled = false;
        void loadProfileSettingsStudioTabs()
            .then(() => {
                if (!cancelled) setTabsReady(true);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, []);

    const expandedContainerBlock = useMemo(() => {
        if (tab !== 'containers' || !expandedBlockId) return null;
        return (
            textBlocks.find((b) => b.id === expandedBlockId) ??
            imageBlocks.find((b) => b.id === expandedBlockId) ??
            null
        );
    }, [tab, expandedBlockId, textBlocks, imageBlocks]);

    const PrivacyTab = getCachedProfileSettingsPrivacyTab();
    const AppearanceTab = getCachedProfileSettingsAppearanceTab();
    const ContainersTab = getCachedProfileSettingsContainersTab();
    const studioTabsResolved =
        tabsReady && Boolean(PrivacyTab && AppearanceTab && ContainersTab);

    const activePanel = useMemo(() => {
        if (!studioTabsResolved) return null;

        if (tab === 'privacy' && PrivacyTab) {
            return (
                <PrivacyTab
                    draft={draft}
                    actions={actions}
                    onDraftChange={onDraftChange}
                    onToggleContactVisibility={onToggleContactVisibility}
                />
            );
        }
        if (tab === 'appearance' && AppearanceTab) {
            return (
                <AppearanceTab
                    draft={draft}
                    randomDisabled={randomDisabled}
                    randomCooldownSec={randomCooldownSec}
                    onDraftChange={onDraftChange}
                    onRandomAppearance={onRandomAppearance}
                />
            );
        }
        if (tab === 'containers' && ContainersTab) {
            return (
                <ContainersTab
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
            );
        }
        return null;
    }, [
        studioTabsResolved,
        tab,
        PrivacyTab,
        AppearanceTab,
        ContainersTab,
        draft,
        actions,
        onDraftChange,
        onToggleContactVisibility,
        randomDisabled,
        randomCooldownSec,
        onRandomAppearance,
        containerKind,
        setContainerKind,
        textBlocks,
        imageBlocks,
        expandedBlockId,
        setExpandedBlockId,
        uploadingBlockId,
        uploadingCanvasBlockId,
        onAddBlock,
        onUpdateBlock,
        onRemoveBlock,
        onPickBlockImage,
        onUploadCanvasBg,
    ]);

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {expandedContainerBlock ? (
                <div
                    className="profile-settings-block-preview-dock shrink-0 px-4 pt-2 pb-2"
                    data-testid="profile-block-preview-dock"
                >
                    <BlockLivePreview block={expandedContainerBlock} interactive={false} />
                </div>
            ) : null}
            <div className="profile-settings-scroll-panel flex-1 overflow-y-auto px-4 py-2 min-h-0 overscroll-contain">
                <div
                    id={`profile-settings-panel-${tab}`}
                    role="tabpanel"
                    aria-labelledby={`profile-settings-tab-${tab}`}
                    data-testid={`profile-settings-panel-${tab}`}
                >
                    {studioTabsResolved ? activePanel : <ProfileSettingsTabSkeleton />}
                </div>
            </div>
        </div>
    );
}
