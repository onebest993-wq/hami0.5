import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useProfileSettingsSheetState, type ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import { useProfileSettingsSheetChrome } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetChrome';
import { useProfileSettingsFocusTrap } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsFocusTrap';
import {
    PROFILE_SETTINGS_TAB_IDS,
    ProfileSettingsSheetTabBar,
} from './settings/ProfileSettingsSheetTabBar';
import { ProfileSettingsSheetHeader } from './settings/ProfileSettingsSheetHeader';
import { ProfileSettingsSheetPanels } from './settings/ProfileSettingsSheetPanels';
import { ProfileSettingsSheetFooter } from './settings/ProfileSettingsSheetFooter';
import { ProfileSettingsSheetFileInputs } from './settings/ProfileSettingsSheetFileInputs';
import { prefetchProfileSettingsStudioTabs } from '@/app/utils/lazyComponents';

import '@/app/components/lawyer/RoyalLawyerProfile/profileSettingsFx.css';

type ProfileSettingsSheetProps = {
    open: boolean;
    onClose: () => void;
    customization: ProfilePageCustomization;
    actions: ProfileAction[];
    userId: string;
    onSave: (next: ProfilePageCustomization) => Promise<boolean>;
    onDraftChange?: (draft: ProfilePageCustomization) => void;
    saving?: boolean;
    onExitComplete?: () => void;
};

export function ProfileSettingsSheet({
    open,
    onClose,
    customization,
    actions,
    userId,
    onSave,
    onDraftChange,
    saving = false,
    onExitComplete,
}: ProfileSettingsSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const { reduceMotion, keyboardInset, backdropTransition, sheetTransition } =
        useProfileSettingsSheetChrome();
    const { onKeyDownCapture } = useProfileSettingsFocusTrap(open, sheetRef, onClose);
    useBodyScrollLock(open);

    const state = useProfileSettingsSheetState(open, customization, userId, onDraftChange);
    const { tab, setTab, draft, patchDraft, toggleContactVisibility } = state;

    useEffect(() => {
        if (!open) return;
        prefetchProfileSettingsStudioTabs();
        void import('./TextBlockStudioEditor');
        void import('./ImageBlockStudioEditor');
    }, [open]);

    const handleTabChange = useCallback(
        (next: ProfileSettingsTab) => {
            setTab(next);
        },
        [setTab],
    );

    const handleSave = useCallback(async () => {
        if (saving) return;
        const ok = await onSave(draft);
        if (ok) onClose();
    }, [onClose, onSave, draft, saving]);

    const onTabKeyDown = (event: React.KeyboardEvent) => {
        const idx = PROFILE_SETTINGS_TAB_IDS.indexOf(tab);
        if (idx < 0) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const delta = event.key === 'ArrowLeft' ? 1 : -1;
            const next = PROFILE_SETTINGS_TAB_IDS[(idx + delta + PROFILE_SETTINGS_TAB_IDS.length) % PROFILE_SETTINGS_TAB_IDS.length]!;
            handleTabChange(next);
            document.getElementById(`profile-settings-tab-${next}`)?.focus();
        }
    };

    const sheetLayer = (
        <AnimatePresence onExitComplete={onExitComplete}>
            {open ? (
                <>
                    <motion.div
                        key="profile-settings-backdrop"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        transition={backdropTransition}
                        className="fixed inset-0 z-[96] bg-black/65"
                        onClick={onClose}
                        aria-hidden
                    />
                    <motion.div
                        key="profile-settings-sheet"
                        ref={sheetRef}
                        initial={reduceMotion ? false : { y: '100%' }}
                        animate={{ y: 0 }}
                        exit={reduceMotion ? undefined : { y: '100%' }}
                        transition={sheetTransition}
                        data-profile-settings-sheet
                        data-testid="profile-settings-sheet"
                        onKeyDownCapture={onKeyDownCapture}
                        style={{ marginBottom: keyboardInset > 0 ? keyboardInset : undefined }}
                        className="fixed inset-x-0 bottom-0 z-[97] max-h-[min(86dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] rounded-t-[28px] border flex flex-col overflow-hidden overscroll-none"
                        role="dialog"
                        aria-modal="true"
                        aria-label="استوديو الصفحة"
                        dir="rtl"
                    >
                        <div className="relative z-[1] flex flex-col min-h-0 h-full">
                            <ProfileSettingsSheetHeader onClose={onClose} />
                            <ProfileSettingsSheetTabBar
                                activeTab={tab}
                                onTabChange={handleTabChange}
                                onTabKeyDown={onTabKeyDown}
                            />
                            <ProfileSettingsSheetPanels
                                tab={tab}
                                draft={draft}
                                actions={actions}
                                randomDisabled={state.randomDisabled}
                                randomCooldownSec={state.randomCooldownSec}
                                containerKind={state.containerKind}
                                setContainerKind={state.setContainerKind}
                                textBlocks={state.textBlocks}
                                imageBlocks={state.imageBlocks}
                                expandedBlockId={state.expandedBlockId}
                                setExpandedBlockId={state.setExpandedBlockId}
                                uploadingBlockId={state.uploadingBlockId}
                                uploadingCanvasBlockId={state.uploadingCanvasBlockId}
                                onDraftChange={patchDraft}
                                onToggleContactVisibility={toggleContactVisibility}
                                onRandomAppearance={state.handleRandomAppearance}
                                onAddBlock={state.addBlock}
                                onUpdateBlock={state.updateBlock}
                                onRemoveBlock={state.removeBlock}
                                onPickBlockImage={state.triggerBlockImage}
                                onUploadCanvasBg={state.triggerCanvasBg}
                            />
                            <ProfileSettingsSheetFooter saving={saving} onSave={() => void handleSave()} />
                            <ProfileSettingsSheetFileInputs
                                fileRef={state.fileRef}
                                canvasFileRef={state.canvasFileRef}
                                onBlockImageSelected={state.onBlockImageSelected}
                                onCanvasBgSelected={state.onCanvasBgSelected}
                            />
                        </div>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>
    );

    return typeof document !== 'undefined' ? createPortal(sheetLayer, document.body) : sheetLayer;
}
