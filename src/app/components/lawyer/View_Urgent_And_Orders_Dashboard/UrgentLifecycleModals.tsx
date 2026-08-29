import React from 'react';
import {
    URGENT_DOSSIER_BTN_GHOST,
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_DIALOG_OVERLAY,
    URGENT_DOSSIER_DIALOG_PANEL,
    URGENT_DOSSIER_INPUT,
} from '../Dashboard_Active_Order_File/layout/urgentDossierUi';
import type {
    UrgentPermanentDeleteModalState,
    UrgentTrashModalState,
} from './hooks/useUrgentLifecycleModals';
import { UrgentOverlayDialog } from './UrgentOverlayDialog';

type UrgentLifecycleModalsProps = {
    trashModal: UrgentTrashModalState;
    onTrashReasonChange: (reason: string) => void;
    onCloseTrash: () => void;
    onConfirmTrash: () => void;
    permanentDeleteModal: UrgentPermanentDeleteModalState;
    onClosePermanentDelete: () => void;
    onConfirmPermanentDelete: () => void;
};

export function UrgentLifecycleModals({
    trashModal,
    onTrashReasonChange,
    onCloseTrash,
    onConfirmTrash,
    permanentDeleteModal,
    onClosePermanentDelete,
    onConfirmPermanentDelete,
}: UrgentLifecycleModalsProps) {
    return (
        <>
            <UrgentOverlayDialog
                open={trashModal.isOpen}
                onClose={onCloseTrash}
                overlayClassName={`${URGENT_DOSSIER_DIALOG_OVERLAY} z-[120]`}
                panelClassName={URGENT_DOSSIER_DIALOG_PANEL}
            >
                <div className="text-white font-extrabold text-sm">نقل إلى سلة المهملات</div>
                <div className="text-white/60 text-xs mt-1 leading-relaxed">
                    لن يتم حذف الملف نهائياً، ويمكن استعادته لاحقاً.
                </div>
                <div className="mt-4">
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">
                        سبب الحذف (اختياري)
                    </label>
                    <textarea
                        value={trashModal.reason}
                        onChange={(e) => onTrashReasonChange(e.target.value)}
                        rows={3}
                        className={`${URGENT_DOSSIER_INPUT} resize-y min-h-[80px] py-2`}
                    />
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCloseTrash}
                        className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[44px] py-2 text-xs`}
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmTrash}
                        className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[44px] py-2 text-xs`}
                    >
                        نقل إلى سلة المهملات
                    </button>
                </div>
            </UrgentOverlayDialog>

            <UrgentOverlayDialog
                open={permanentDeleteModal.isOpen}
                onClose={onClosePermanentDelete}
                overlayClassName={`${URGENT_DOSSIER_DIALOG_OVERLAY} z-[120]`}
                panelClassName={URGENT_DOSSIER_DIALOG_PANEL}
            >
                <div className="text-white font-extrabold text-sm">حذف نهائي</div>
                <div className="text-white/60 text-xs mt-1 leading-relaxed">
                    سيتم حذف الملف نهائياً من سلة المهملات ولا يمكن استعادته بعد ذلك.
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClosePermanentDelete}
                        className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[44px] py-2 text-xs`}
                    >
                        إغلاق
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmPermanentDelete}
                        disabled={permanentDeleteModal.countdown > 0}
                        className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[44px] py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {permanentDeleteModal.countdown > 0
                            ? `انتظر ${permanentDeleteModal.countdown} ثواني`
                            : 'حذف نهائي'}
                    </button>
                </div>
            </UrgentOverlayDialog>
        </>
    );
}
