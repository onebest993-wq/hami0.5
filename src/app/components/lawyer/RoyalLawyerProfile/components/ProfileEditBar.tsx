import React, { memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';

export type ProfileEditBarProps = {
    isEditing: boolean;
    saving: boolean;
    uploading?: boolean;
    savingSettings: boolean;
    onCancel: () => void;
    onSave: () => void;
    screenActive?: boolean;
};

/**
 * شريط تحرير علوي — يتموضع مقابل زر الرجوع (لا يغطي المعرض/الصور في الأسفل).
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
            className="hami-profile-edit-chrome-host"
            dir="rtl"
        >
            <div data-profile-edit-bar-shell className="hami-profile-edit-chrome" role="toolbar" aria-label="إجراءات التحرير">
                <button
                    type="button"
                    data-testid="lawyer-profile-edit-cancel"
                    disabled={saving}
                    className="hami-profile-edit-chrome__btn hami-profile-edit-chrome__btn--cancel"
                    aria-label="إلغاء التعديل"
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
                    <X size={16} strokeWidth={2.25} aria-hidden />
                    <span>إلغاء</span>
                </button>
                <button
                    type="button"
                    data-testid="lawyer-profile-edit-save"
                    disabled={saveBlocked}
                    aria-busy={saveBlocked || undefined}
                    aria-label="حفظ التعديلات"
                    className="hami-profile-edit-chrome__btn hami-profile-edit-chrome__btn--save"
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
                        <span className="hami-profile-edit-chrome__spinner" aria-hidden />
                    ) : null}
                    <span>حفظ</span>
                </button>
            </div>
        </div>,
        document.body,
    );
});
