import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
    ProfileCustomBlock,
    ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import type { CloseProfileSettingsOptions } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioSettings';
import { restoreRemovedCustomBlock } from '@/app/services/profile/restoreRemovedCustomBlock';
import {
    useProfileSettingsSheetState,
    type ProfileSettingsTab,
} from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import { PROFILE_SETTINGS_TAB_IDS } from '../components/settings/profileSettingsTabIds';
import { profileMediaPathsOnlyIn } from '@/app/services/profile/profileMediaPaths';
import { removeProfileMediaPaths } from '@/app/services/profileMediaService';
import { SmartToast } from '@/app/components/ui/SmartToast';

type Args = {
    open: boolean;
    onClose: (options?: CloseProfileSettingsOptions) => void;
    onRegisterDiscard?: (fn: (() => void) | null) => void;
    customization: ProfilePageCustomization;
    userId: string;
    onSave: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
    onDraftChange?: (draft: ProfilePageCustomization) => void;
    saving?: boolean;
};

export function useProfileSettingsSheetActions({
    open,
    onClose,
    onRegisterDiscard,
    customization,
    userId,
    onSave,
    onDraftChange,
    saving = false,
}: Args) {
    const ignoreBackdropCloseUntilRef = useRef(0);
    const draftRef = useRef(customization);
    const customizationRef = useRef(customization);

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

    useEffect(() => {
        if (!open) return;
        ignoreBackdropCloseUntilRef.current = Date.now() + 700;
    }, [open]);

    const guardedPatchDraft = useCallback(
        (updater: (prev: ProfilePageCustomization) => ProfilePageCustomization) => {
            if (sheetBusy || draftMutateLockRef.current) return;
            ignoreBackdropCloseUntilRef.current = Date.now() + 420;
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

    const closeStudio = useCallback(
        (options?: CloseProfileSettingsOptions) => {
            onClose(options);
        },
        [onClose],
    );

    const guardedUpdateBlock = useCallback(
        (id: string, patch: Partial<ProfileCustomBlock>) => {
            ignoreBackdropCloseUntilRef.current = Date.now() + 420;
            state.updateBlock(id, patch);
        },
        [state.updateBlock],
    );

    const guardedAddBlock = useCallback(
        (kind: 'text' | 'image') => {
            ignoreBackdropCloseUntilRef.current = Date.now() + 420;
            state.addBlock(kind);
        },
        [state.addBlock],
    );

    const handleTabChange = useCallback(
        (next: ProfileSettingsTab) => {
            /* امنع إغلاق الاستوديو من click-through للخلفية بعد لمس التبويب
             * (تبديل التبويب يغيّر ارتفاع الورقة → الشريط يتحرك → الـ click يقع على الخلفية) */
            ignoreBackdropCloseUntilRef.current = Date.now() + 420;
            setTab(next);
        },
        [setTab],
    );

    const handleSave = useCallback(() => {
        if (sheetBusy) return;
        const snapshot = draft;
        onRegisterDiscard?.(null);
        /* أغلق أولاً — isSavingRef يمنع الإغلاق بعد بدء الحفظ غير الصامت */
        onClose({ soft: true });
        void onSave(snapshot);
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

    return {
        state,
        tab,
        draft,
        sheetBusy,
        draftLocked,
        ignoreBackdropCloseUntilRef,
        guardedPatchDraft,
        guardedUpdateBlock,
        guardedAddBlock,
        closeStudio,
        handleSave,
        handleRemoveBlock,
        handleTabChange,
        onTabKeyDown,
    };
}
