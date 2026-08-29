import React, { memo, useRef } from 'react';
import { ArrowRight } from '@/app/components/ui/icons/ArrowRight';
import { X } from '@/app/components/ui/icons/X';
import { useArmedPointerAction } from '../hooks/useArmedPointerAction';
import { isPrimaryDragPointer } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

type ProfileBackButtonProps = {
    onBack: () => void;
    /** غطاء الفتح: pointerdown قبل زوال الطبقة. الشجرة الحية: click */
    armOnPointerDown?: boolean;
};

/**
 * زر رجوع — في طرف الكروم المقابل لصورة الهوية (RTL: يسار) حتى لا يتضارب مع صف الاسم.
 */
function ProfileBackButton({ onBack, armOnPointerDown = false }: ProfileBackButtonProps) {
    const fireBack = () => {
        onBack();
    };
    const backPointer = useArmedPointerAction(fireBack, { armOnPointerDown });

    return (
        <button
            type="button"
            onClick={backPointer.onClick}
            onPointerDown={backPointer.onPointerDown}
            onPointerCancel={backPointer.onPointerCancel}
            aria-label="العودة للرئيسية"
            data-testid="lawyer-profile-back"
            className="hami-profile-chrome-back-btn flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#0A0F1C]/88 border border-white/12 shadow-[0_4px_12px_rgba(0,0,0,0.22)] touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
            <ArrowRight size={18} className="hami-profile-accent-text" aria-hidden />
        </button>
    );
}

type ProfileChromeHeaderProps = {
    showBack?: boolean;
    onBack?: () => void;
    armBackOnPointerDown?: boolean;
    isEditing?: boolean;
    saving?: boolean;
    uploading?: boolean;
    screenActive?: boolean;
    onCancelEdit?: () => void;
    onSaveEdit?: () => void;
};

/**
 * صف كروم علوي داخل شجرة التخطيط — فوق الهيرو مباشرة (لا portal، لا fixed يتداخل مع الصورة).
 * يطبّق safe-area عبر CSS على الجذر + padding هذا الصف.
 */
export const ProfileChromeHeader = memo(function ProfileChromeHeader({
    showBack = false,
    onBack,
    armBackOnPointerDown = false,
    isEditing = false,
    saving = false,
    uploading = false,
    screenActive = true,
    onCancelEdit,
    onSaveEdit,
}: ProfileChromeHeaderProps) {
    const saveArmedRef = useRef(false);
    const cancelArmedRef = useRef(false);
    const saveBusyRef = useRef(false);
    const saveBlocked = saving || uploading;
    const showEditChrome = isEditing && screenActive && onCancelEdit && onSaveEdit;

    if (!showBack && !showEditChrome) {
        return null;
    }

    const runSave = () => {
        if (saveBlocked || saveBusyRef.current || !onSaveEdit) return;
        saveBusyRef.current = true;
        try {
            onSaveEdit();
        } finally {
            window.setTimeout(() => {
                saveBusyRef.current = false;
            }, 400);
        }
    };

    const runCancel = () => {
        if (saving || !onCancelEdit) return;
        onCancelEdit();
    };

    return (
        <header
            data-profile-chrome-header
            data-testid="lawyer-profile-chrome-header"
            className="hami-profile-chrome-header"
            dir="rtl"
        >
            <div className="hami-profile-chrome-header__slot hami-profile-chrome-header__slot--start" />
            <div
                className="hami-profile-chrome-header__slot hami-profile-chrome-header__slot--end"
                data-testid="lawyer-profile-chrome-end"
            >
                {showEditChrome ? (
                    <div
                        data-testid="lawyer-profile-edit-bar"
                        data-profile-edit-bar=""
                        className="hami-profile-edit-chrome"
                        role="toolbar"
                        aria-label="إجراءات التحرير"
                    >
                        <button
                            type="button"
                            data-testid="lawyer-profile-edit-cancel"
                            disabled={saving}
                            className="hami-profile-edit-chrome__btn hami-profile-edit-chrome__btn--cancel"
                            aria-label="إلغاء التعديل"
                            onPointerDown={(event) => {
                                if (!isPrimaryDragPointer(event) || saving) return;
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
                                if (!isPrimaryDragPointer(event) || saveBlocked) return;
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
                ) : null}
                {/* أثناء التحرير: «إلغاء» هو مخرج الصفحة — إخفاء الرجوع يمنع لمساً خاطئاً بجانب حفظ */}
                {!showEditChrome && showBack && onBack ? (
                    <ProfileBackButton onBack={onBack} armOnPointerDown={armBackOnPointerDown} />
                ) : null}
            </div>
        </header>
    );
});
