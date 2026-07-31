import React, { memo, useRef } from 'react';
import { createPortal } from 'react-dom';

export type ProfileEditBarProps = {
    isEditing: boolean;
    saving: boolean;
    /** رفع صورة قيد التنفيذ — لا حفظ حتى ينتهي أو يُلغى */
    uploading?: boolean;
    savingSettings: boolean;
    onCancel: () => void;
    onSave: () => void;
    /** false عند تبويب مخفي — لا تبقَ الشريط فوق الرئيسية */
    screenActive?: boolean;
};

/**
 * شريط حفظ/إلغاء — portal على body + تفعيل pointerdown
 * (داخل overflow/motion كان يُفقد اللمس على Android WebView).
 */
export const ProfileEditBar = memo(function ProfileEditBar({
    isEditing,
    saving,
    uploading = false,
    savingSettings: _savingSettings,
    onCancel,
    onSave,
    screenActive = true,
}: ProfileEditBarProps) {
    const saveArmedRef = useRef(false);
    const cancelArmedRef = useRef(false);
    const saveBusyRef = useRef(false);
    const saveBlocked = saving || uploading;

    if (!isEditing || !screenActive || typeof document === 'undefined') {
        return null;
    }

    const runSave = () => {
        if (saveBlocked || saveBusyRef.current) return;
        saveBusyRef.current = true;
        try {
            onSave();
        } finally {
            window.setTimeout(() => {
                saveBusyRef.current = false;
            }, 400);
        }
    };

    const runCancel = () => {
        if (saving) return;
        onCancel();
    };

    return createPortal(
        <div
            data-testid="lawyer-profile-edit-bar"
            data-profile-edit-bar=""
            className="fixed inset-x-0 z-[220] flex justify-center pointer-events-none px-3"
            style={{
                bottom: 'max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
            }}
        >
            <div
                data-profile-edit-bar-shell
                className="pointer-events-auto w-full max-w-md flex items-center gap-2 p-1.5 rounded-full border border-white/12 bg-[#0A0F1C]/92 shadow-[0_10px_36px_rgba(0,0,0,0.55)]"
            >
                <button
                    type="button"
                    data-testid="lawyer-profile-edit-cancel"
                    disabled={saving}
                    className="flex-1 py-3 rounded-full text-[13px] font-bold text-white/70 hover:text-white hover:bg-white/[0.05] min-h-[44px] touch-manipulation active:scale-[0.98]"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    onPointerDown={(event) => {
                        if (event.button !== 0 || saving) return;
                        cancelArmedRef.current = true;
                        runCancel();
                    }}
                    onPointerCancel={() => {
                        cancelArmedRef.current = false;
                    }}
                    onClick={(event) => {
                        if (cancelArmedRef.current) {
                            cancelArmedRef.current = false;
                            event.preventDefault();
                            return;
                        }
                        runCancel();
                    }}
                >
                    إلغاء
                </button>
                <button
                    type="button"
                    data-testid="lawyer-profile-edit-save"
                    disabled={saveBlocked}
                    aria-busy={saveBlocked || undefined}
                    className="flex-[1.35] py-3 rounded-full hami-profile-accent-btn-solid text-[13px] font-bold flex items-center justify-center gap-2 min-h-[44px] touch-manipulation active:scale-[0.98] shadow-none"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    onPointerDown={(event) => {
                        if (event.button !== 0 || saveBlocked) return;
                        saveArmedRef.current = true;
                        runSave();
                    }}
                    onPointerCancel={() => {
                        saveArmedRef.current = false;
                    }}
                    onClick={(event) => {
                        if (saveArmedRef.current) {
                            saveArmedRef.current = false;
                            event.preventDefault();
                            return;
                        }
                        runSave();
                    }}
                >
                    {saving || uploading ? (
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : null}
                    حفظ
                </button>
            </div>
        </div>,
        document.body,
    );
});
