import React from 'react';
import {
    URGENT_DOSSIER_BTN_GHOST,
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_DIALOG_OVERLAY,
    URGENT_DOSSIER_DIALOG_PANEL,
    URGENT_DOSSIER_SECTION_TITLE,
} from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';

export type ArchivePortalConfirmDialogProps = {
    open: boolean;
    title: React.ReactNode;
    titleId: string;
    testId?: string;
    children: React.ReactNode;
    cancelLabel?: string;
    confirmLabel: string;
    confirmTestId?: string;
    onCancel: () => void;
    onConfirm: () => void;
    confirmClassName?: string;
};

export function ArchivePortalConfirmDialog({
    open,
    title,
    titleId,
    testId,
    children,
    cancelLabel = 'إلغاء',
    confirmLabel,
    confirmTestId,
    onCancel,
    onConfirm,
    confirmClassName,
}: ArchivePortalConfirmDialogProps) {
    if (!open) return null;

    return (
        <div className={URGENT_DOSSIER_DIALOG_OVERLAY} onClick={onCancel} role="presentation">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                data-testid={testId}
                className={URGENT_DOSSIER_DIALOG_PANEL}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <div
                    id={titleId}
                    className={`${URGENT_DOSSIER_SECTION_TITLE} flex flex-row-reverse items-center justify-end gap-2`}
                >
                    {title}
                </div>
                <div className="mt-2 space-y-2 text-white/75 text-sm leading-relaxed">{children}</div>
                <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel();
                        }}
                        className={URGENT_DOSSIER_BTN_GHOST}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        data-testid={confirmTestId}
                        onClick={(e) => {
                            e.stopPropagation();
                            onConfirm();
                        }}
                        className={confirmClassName ?? URGENT_DOSSIER_BTN_PRIMARY}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
