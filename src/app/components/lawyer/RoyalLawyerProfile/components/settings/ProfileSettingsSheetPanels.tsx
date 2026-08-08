import React, { useLayoutEffect, useMemo, useState } from 'react';

import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';

import type { ContainerKindTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';

import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';

import {

    getCachedProfileSettingsAppearanceTab,

    getCachedProfileSettingsContainersTab,

    isProfileStudioMainTabResolved,

    loadProfileStudioMainTab,

    prefetchProfileStudioMainTab,

} from '@/app/runtime/profileSettingsStudioTabsLoader';

import { BlockLivePreview } from '../BlockLivePreview';

import { ProfileSettingsTabSkeleton } from './ProfileSettingsTabSkeleton';



type ProfileSettingsSheetPanelsProps = {

    tab: ProfileSettingsTab;

    draft: ProfilePageCustomization;

    containerKind: ContainerKindTab;

    setContainerKind: (kind: ContainerKindTab) => void;

    textBlocks: ProfileCustomBlock[];

    imageBlocks: ProfileCustomBlock[];

    expandedBlockId: string | null;

    setExpandedBlockId: React.Dispatch<React.SetStateAction<string | null>>;

    uploadingBlockId: string | null;

    uploadingCanvasBlockId: string | null;

    onDraftChange: (updater: (prev: ProfilePageCustomization) => ProfilePageCustomization) => void;

    onAddBlock: (kind: 'text' | 'image') => void;

    onUpdateBlock: (id: string, patch: Partial<ProfileCustomBlock>) => void;

    onRemoveBlock: (id: string) => void;

    onPickBlockImage: (blockId: string) => void;

    onUploadCanvasBg: (blockId: string) => void;

    onClearBlockImage?: (blockId: string) => void;

    onClearCanvasBg?: (blockId: string) => void;

    saving?: boolean;

};



export function ProfileSettingsSheetPanels({

    tab,

    draft,

    containerKind,

    setContainerKind,

    textBlocks,

    imageBlocks,

    expandedBlockId,

    setExpandedBlockId,

    uploadingBlockId,

    uploadingCanvasBlockId,

    onDraftChange,

    onAddBlock,

    onUpdateBlock,

    onRemoveBlock,

    onPickBlockImage,

    onUploadCanvasBg,

    onClearBlockImage,

    onClearCanvasBg,

    saving = false,

}: ProfileSettingsSheetPanelsProps) {

    const [panelReady, setPanelReady] = useState(() => isProfileStudioMainTabResolved(tab));

    const [panelError, setPanelError] = useState(false);

    const [loadAttempt, setLoadAttempt] = useState(0);



    useLayoutEffect(() => {

        const sibling: ProfileSettingsTab = tab === 'appearance' ? 'containers' : 'appearance';

        prefetchProfileStudioMainTab(sibling);

    }, [tab]);



    useLayoutEffect(() => {

        if (isProfileStudioMainTabResolved(tab)) {

            setPanelReady(true);

            setPanelError(false);

            return;

        }



        let cancelled = false;

        setPanelReady(false);

        setPanelError(false);



        void loadProfileStudioMainTab(tab)

            .then(() => {

                if (!cancelled) {

                    setPanelReady(true);

                    setPanelError(false);

                }

            })

            .catch(() => {

                if (!cancelled) setPanelError(true);

            });



        return () => {

            cancelled = true;

        };

    }, [tab, loadAttempt]);



    const expandedContainerBlock = useMemo(() => {

        if (tab !== 'containers' || !expandedBlockId) return null;

        const pool = containerKind === 'text' ? textBlocks : imageBlocks;

        return pool.find((b) => b.id === expandedBlockId) ?? null;

    }, [tab, expandedBlockId, containerKind, textBlocks, imageBlocks]);



    const AppearanceTab = getCachedProfileSettingsAppearanceTab();

    const ContainersTab = getCachedProfileSettingsContainersTab();

    const mainTabResolved = panelReady && isProfileStudioMainTabResolved(tab);



    const activePanel = useMemo(() => {

        if (!mainTabResolved) return null;



        if (tab === 'appearance' && AppearanceTab) {

            return (

                <AppearanceTab

                    draft={draft}

                    onDraftChange={onDraftChange}

                    disabled={saving}

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

                    onClearBlockImage={onClearBlockImage}

                    onClearCanvasBg={onClearCanvasBg}

                    saving={saving}

                />

            );

        }

        return null;

    }, [

        mainTabResolved,

        tab,

        AppearanceTab,

        ContainersTab,

        draft,

        onDraftChange,

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

        onClearBlockImage,

        onClearCanvasBg,

        saving,

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

                    {mainTabResolved ? (

                        activePanel

                    ) : panelError ? (

                        <div

                            className="flex flex-col items-center justify-center gap-3 py-10 text-center"

                            data-testid="profile-settings-tabs-error"

                            role="alert"

                        >

                            <p className="text-sm text-white/65">تعذّر تحميل أقسام الاستوديو</p>

                            <button

                                type="button"

                                data-testid="profile-settings-tabs-retry"

                                className="min-h-[44px] px-4 rounded-xl border border-[#E6C673]/35 text-sm font-bold text-[#E6C673] touch-manipulation"

                                onClick={() => setLoadAttempt((n) => n + 1)}

                            >

                                إعادة المحاولة

                            </button>

                        </div>

                    ) : (

                        <ProfileSettingsTabSkeleton />

                    )}

                </div>

            </div>

        </div>

    );

}

