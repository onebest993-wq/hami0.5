import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { restoreRemovedCustomBlock } from '@/app/services/profile/restoreRemovedCustomBlock';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useProfileSettingsSheetState, type ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import { useProfileSettingsSheetChrome } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetChrome';
import { useProfileSettingsFocusTrap } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsFocusTrap';
import { PROFILE_SETTINGS_TAB_IDS } from './settings/profileSettingsTabIds';
import { ProfileSettingsSheetTabBar } from './settings/ProfileSettingsSheetTabBar';
import { ProfileSettingsSheetHeader } from './settings/ProfileSettingsSheetHeader';
import { ProfileSettingsSheetPanels } from './settings/ProfileSettingsSheetPanels';
import { ProfileSettingsSheetFooter } from './settings/ProfileSettingsSheetFooter';
import { ProfileSettingsSheetFileInputs } from './settings/ProfileSettingsSheetFileInputs';
import { profileMediaPathsOnlyIn } from '@/app/services/profile/profileMediaPaths';
import { removeProfileMediaPaths } from '@/app/services/profileMediaService';
import { SmartToast } from '@/app/components/ui/SmartToast';

import '@/app/components/lawyer/RoyalLawyerProfile/profileSettingsFx.css';

type ProfileSettingsSheetProps = {
    open: boolean;
    onClose: () => void;
    onRegisterDiscard?: (fn: (() => void) | null) => void;
    customization: ProfilePageCustomization;
    userId: string;
    onSave: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
    onDraftChange?: (draft: ProfilePageCustomization) => void;
    saving?: boolean;
    onExitComplete?: () => void;
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
    onExitComplete,
}: ProfileSettingsSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const ignoreBackdropCloseUntilRef = useRef(0);
    const draftRef = useRef(customization);
    const customizationRef = useRef(customization);
    const { reduceMotion, keyboardInset, backdropTransition, sheetTransition } =
        useProfileSettingsSheetChrome();
    useBodyScrollLock(open);

    /** يمنع تعديل المسودة أثناء حذف صامت قبل أن يصل prop الحفظ للواجهة */
    const draftMutateLockRef = useRef(false);
    const [draftLocked, setDraftLocked] = useState(false);
    const sheetBusy = saving || draftLocked;
    const state = useProfileSettingsSheetState(open, customization, userId, onDraftChange, {
        isOwnProfile: true,
        saving: sheetBusy,
    });
    const { tab, setTab, draft, patchDraft } = state;
    draftRef.current = draft;
    customizationRef.current = customization;

    const guardedPatchDraft = useCallback(
        (updater: (prev: ProfilePageCustomization) => ProfilePageCustomization) => {
            if (sheetBusy || draftMutateLockRef.current) return;
            patchDraft(updater);
        },
        [patchDraft, sheetBusy],
    );

    useEffect(() => {
        if (!onRegisterDiscard) return;
        if (!open) {
            onRegisterDiscard(null);
            return;
        }
        onRegisterDiscard(() => {
            const orphanedUploads = profileMediaPathsOnlyIn(draftRef.current, customizationRef.current);
            if (orphanedUploads.length > 0) {
                void removeProfileMediaPaths(orphanedUploads);
            }
        });
        return () => onRegisterDiscard(null);
    }, [open, onRegisterDiscard]);

    const closeStudio = useCallback(() => {
        onClose();
    }, [onClose]);

    const { onKeyDownCapture } = useProfileSettingsFocusTrap(open, sheetRef, closeStudio, {
        closeEnabled: !sheetBusy,
    });

    const handleTabChange = useCallback(
        (next: ProfileSettingsTab) => {
            /* امنع إغلاق الاستوديو من click-through للخلفية بعد لمس التبويب
             * (تبديل التبويب يغيّر ارتفاع الورقة → الشريط يتحرك → الـ click يقع على الخلفية) */
            ignoreBackdropCloseUntilRef.current = Date.now() + 420;
            setTab(next);
        },
        [setTab],
    );

    const handleSave = useCallback(async () => {
        if (sheetBusy) return;
        const snapshot = draft;
        const saved = await onSave(snapshot);
        if (!saved) return;
        /* بعد الحفظ الناجح: لا تحذف وسائط المسودة */
        onRegisterDiscard?.(null);
        /* onClose (= closeSettings) يتولى flushSync + تحرير التمرير — لا تغليف مزدوج */
        onClose();
    }, [onClose, onSave, draft, sheetBusy, onRegisterDiscard]);

    const handleRemoveBlock = useCallback(
        async (id: string) => {
            if (sheetBusy || draftMutateLockRef.current) return;
            const previousDraft = draft;
            const existsCommitted = customization.customBlocks.some((block) => block.id === id);
            draftMutateLockRef.current = true;
            setDraftLocked(true);
            state.removeBlock(id);
            if (!existsCommitted) {
                draftMutateLockRef.current = false;
                setDraftLocked(false);
                SmartToast.success('تم حذف الحاوية');
                return;
            }
            /*
             * احفظ المسودة بعد الحذف (لا baseline القديمة) لتفادي سباق مع حفظ كامل
             * يكتب مظهراً/خصوصية قديمة فوق جلسة أحدث.
             */
            const next: ProfilePageCustomization = {
                ...previousDraft,
                customBlocks: previousDraft.customBlocks.filter((block) => block.id !== id),
            };
            draftRef.current = next;
            try {
                const saved = await onSave(next, { silent: true });
                if (!saved) {
                    state.setDraft((current) => restoreRemovedCustomBlock(current, previousDraft, id));
                    SmartToast.error('تعذر حذف الحاوية — أُعيدت للمسودة');
                    return;
                }
                SmartToast.success('تم حذف الحاوية');
            } finally {
                draftMutateLockRef.current = false;
                setDraftLocked(false);
            }
        },
        [draft, customization, onSave, state, sheetBusy],
    );

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
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            marginBottom: keyboardInset > 0 ? keyboardInset : undefined,
                            ...(keyboardInset > 0
                                ? {
                                      maxHeight: `min(85dvh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 15vh - ${keyboardInset}px))`,
                                  }
                                : null),
                        }}
                        className="fixed inset-x-0 bottom-0 z-[97] max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-15vh))] rounded-t-[28px] border flex flex-col overflow-hidden overscroll-none"
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
                                onAddBlock={state.addBlock}
                                onUpdateBlock={state.updateBlock}
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
                        </div>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>
    );

    return typeof document !== 'undefined' ? createPortal(sheetLayer, document.body) : sheetLayer;
}
