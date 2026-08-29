import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import type { CloseProfileSettingsOptions } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioSettings';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useProfileSettingsSheetChrome } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetChrome';
import { useProfileSettingsFocusTrap } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsFocusTrap';
import { useProfileSettingsSheetActions } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetActions';
import { ProfileSettingsSheetTabBar } from './settings/ProfileSettingsSheetTabBar';
import { ProfileSettingsSheetHeader } from './settings/ProfileSettingsSheetHeader';
import { ProfileSettingsSheetPanels } from './settings/ProfileSettingsSheetPanels';
import { ProfileSettingsSheetFooter } from './settings/ProfileSettingsSheetFooter';
import { ProfileSettingsSheetFileInputs } from './settings/ProfileSettingsSheetFileInputs';
import { useProfileCanvasBackgroundEditorChunk } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCanvasBackgroundEditorChunk';

import '@/app/components/lawyer/RoyalLawyerProfile/profileSettingsFx.css';

type ProfileSettingsSheetProps = {
    open: boolean;
    onClose: (options?: CloseProfileSettingsOptions) => void;
    onRegisterDiscard?: (fn: (() => void) | null) => void;
    customization: ProfilePageCustomization;
    userId: string;
    onSave: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
    onDraftChange?: (draft: ProfilePageCustomization) => void;
    saving?: boolean;
};

export function ProfileSettingsSheet({
    open,
    onClose,
    onRegisterDiscard,
    customization,
    userId,
    onSave,
    onDraftChange,
    saving = false,
}: ProfileSettingsSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const { reduceMotion, keyboardInset, backdropTransition, sheetTransition } =
        useProfileSettingsSheetChrome(open);
    useBodyScrollLock(open);

    const {
        state,
        tab,
        draft,
        sheetBusy,
        ignoreBackdropCloseUntilRef,
        guardedPatchDraft,
        guardedUpdateBlock,
        guardedAddBlock,
        closeStudio,
        handleSave,
        handleRemoveBlock,
        handleTabChange,
        onTabKeyDown,
    } = useProfileSettingsSheetActions({
        open,
        onClose,
        onRegisterDiscard,
        customization,
        userId,
        onSave,
        onDraftChange,
        saving,
    });

    const canvasEditorOpen = Boolean(state.canvasBgEditor);
    const {
        ready: canvasEditorReady,
        ProfileCanvasBackgroundEditor,
    } = useProfileCanvasBackgroundEditorChunk(canvasEditorOpen);

    const { onKeyDownCapture } = useProfileSettingsFocusTrap(open, sheetRef, () => closeStudio(), {
        closeEnabled: !sheetBusy && !canvasEditorOpen,
        trapTab: !canvasEditorOpen,
    });

    const sheetLayer = (
        <AnimatePresence>
            {open ? (
                <>
                    <motion.div
                        key="profile-settings-backdrop"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        transition={backdropTransition}
                        className="fixed inset-0 z-[96] bg-black/65"
                        onPointerDown={(event) => {
                            if (Date.now() < ignoreBackdropCloseUntilRef.current) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }}
                        onClick={(event) => {
                            if (Date.now() < ignoreBackdropCloseUntilRef.current) {
                                event.preventDefault();
                                event.stopPropagation();
                                return;
                            }
                            if (canvasEditorOpen) return;
                            closeStudio();
                        }}
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
                        onPointerDown={(event) => {
                            event.stopPropagation();
                            /* تبديل شريحة يغيّر ارتفاع الورقة — الـ click التالي قد يقع على الخلفية */
                            ignoreBackdropCloseUntilRef.current = Date.now() + 420;
                        }}
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            marginBottom: keyboardInset > 0 ? keyboardInset : undefined,
                            ...(keyboardInset > 0
                                ? {
                                      maxHeight: `min(85dvh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 15vh - ${keyboardInset}px))`,
                                  }
                                : null),
                        }}
                        className="fixed inset-x-0 bottom-0 z-[97] w-full max-w-[min(100%,32.5rem)] mx-auto max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-15vh))] rounded-t-[28px] border flex flex-col overflow-hidden overscroll-none ps-[max(0px,env(safe-area-inset-left))] pe-[max(0px,env(safe-area-inset-right))]"
                        role="dialog"
                        aria-modal="true"
                        aria-label="استوديو الصفحة"
                        dir="rtl"
                    >
                        <div className="relative z-[1] flex flex-col min-h-0 h-full">
                            <ProfileSettingsSheetHeader onClose={closeStudio} />
                            <ProfileSettingsSheetTabBar
                                activeTab={tab}
                                onTabChange={handleTabChange}
                                onTabKeyDown={onTabKeyDown}
                            />
                            <ProfileSettingsSheetPanels
                                tab={tab}
                                draft={draft}
                                containerKind={state.containerKind}
                                setContainerKind={state.setContainerKind}
                                textBlocks={state.textBlocks}
                                imageBlocks={state.imageBlocks}
                                expandedBlockId={state.expandedBlockId}
                                setExpandedBlockId={state.setExpandedBlockId}
                                uploadingBlockId={state.uploadingBlockId}
                                uploadingCanvasBlockId={state.uploadingCanvasBlockId}
                                onDraftChange={guardedPatchDraft}
                                onAddBlock={guardedAddBlock}
                                onUpdateBlock={guardedUpdateBlock}
                                onRemoveBlock={handleRemoveBlock}
                                onPickBlockImage={state.triggerBlockImage}
                                onUploadCanvasBg={state.triggerCanvasBg}
                                onClearBlockImage={state.clearBlockImage}
                                onClearCanvasBg={state.clearCanvasBackground}
                                saving={sheetBusy}
                            />
                            <ProfileSettingsSheetFooter saving={sheetBusy} onSave={() => void handleSave()} />
                            <ProfileSettingsSheetFileInputs
                                fileRef={state.fileRef}
                                canvasFileRef={state.canvasFileRef}
                                onBlockImageSelected={state.onBlockImageSelected}
                                onCanvasBgSelected={state.onCanvasBgSelected}
                            />
                            {ProfileCanvasBackgroundEditor ? (
                                <ProfileCanvasBackgroundEditor
                                    open={canvasEditorOpen && canvasEditorReady}
                                    file={state.canvasBgEditor?.file ?? null}
                                    onCancel={state.cancelCanvasBgEditor}
                                    onConfirm={state.confirmCanvasBgEditor}
                                />
                            ) : null}
                        </div>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>
    );

    return typeof document !== 'undefined' ? createPortal(sheetLayer, document.body) : sheetLayer;
}
