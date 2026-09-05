import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { fileHasSpecificDeliveryClaim } from '@/app/utils/executionDossierHeaderFields';
import type { ExecutionFile } from '@/app/types/execution';
import { useOverlayBackdropArm } from '@/app/hooks/useOverlayBackdropArm';
import { useOverlayEscapeDismiss } from '@/app/hooks/useOverlayEscapeDismiss';
import { EXEC_MODAL_Z } from '../executionDashboardConstants';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_OVERLAY_HEADER,
    EXEC_OVERLAY_PRIMARY_BTN,
    EXEC_OVERLAY_TITLE,
} from '../executionModalMobileShell';
import { mergeIncomingDossierMetaDraft } from '../helpers/dossierMetaPartyNames';
import { normalizeDossierMetaFileParts } from '../helpers/dossierMetaValidation';
import { DossierMetaEditSectionFields } from './DossierMetaEditSectionFields';

export interface DossierMetaEditSectionProps {
    showEditDossierMetaModal: boolean;
    dossierMetaDraft: Record<string, string> | null;
    isEvictionExecutionModule: boolean;
    setShowEditDossierMetaModal: (show: boolean) => void;
    setDossierMetaDraft: (
        draft:
            | Record<string, string>
            | null
            | ((prev: Record<string, string> | null) => Record<string, string> | null),
    ) => void;
    /** يقبل المسودة الحيّة من الواجهة حتى لا يُحفظ snapshot قديم */
    saveDossierMetaDraft: (draftOverride?: Record<string, string>) => void;
}

function seedLiveDraft(draft: Record<string, string>): Record<string, string> {
    return normalizeDossierMetaFileParts(draft);
}

export const DossierMetaEditSection: React.FC<DossierMetaEditSectionProps> = ({
    showEditDossierMetaModal,
    dossierMetaDraft,
    isEvictionExecutionModule,
    setShowEditDossierMetaModal,
    setDossierMetaDraft,
    saveDossierMetaDraft,
}) => {
    const open = Boolean(showEditDossierMetaModal && dossierMetaDraft);
    const backdropArmed = useOverlayBackdropArm(open);
    const [liveDraft, setLiveDraft] = useState<Record<string, string>>(() =>
        dossierMetaDraft ? seedLiveDraft(dossierMetaDraft) : {},
    );

    useEffect(() => {
        if (!dossierMetaDraft) return;
        setLiveDraft((current) =>
            mergeIncomingDossierMetaDraft(current, seedLiveDraft(dossierMetaDraft)),
        );
    }, [dossierMetaDraft]);

    const pushDraft = useCallback(
        (
            update:
                | Record<string, string>
                | null
                | ((prev: Record<string, string> | null) => Record<string, string> | null),
        ) => {
            // لا نستدعِ setDossierMetaDraft داخل updater — يُنتج تحذير React في الكونسول
            setLiveDraft((current) => {
                const next =
                    typeof update === 'function' ? update(current) : update;
                return next ?? current;
            });
        },
        [],
    );

    const close = useCallback(() => {
        setShowEditDossierMetaModal(false);
        setDossierMetaDraft(null);
    }, [setDossierMetaDraft, setShowEditDossierMetaModal]);

    useOverlayEscapeDismiss(open, close);

    if (!open || !dossierMetaDraft) return null;

    const isSpecificDeliveryClaim = fileHasSpecificDeliveryClaim({
        claimType: liveDraft.claimType,
    } as ExecutionFile);

    const modal = (
        <div
            className={`fixed inset-0 flex items-end justify-center bg-black/62 p-0 sm:items-center sm:p-3 ${EXEC_MODAL_BACKDROP_SAFE_PAD}${backdropArmed ? '' : ' pointer-events-none'}`}
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
            dir="rtl"
            data-testid="execution-dossier-meta-edit"
            onClick={() => {
                if (!backdropArmed) return;
                close();
            }}
            role="presentation"
        >
            <div
                className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0A0F1C] sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dossier-meta-edit-title"
            >
                <div className={EXEC_OVERLAY_HEADER}>
                    <div className="min-w-0 text-right">
                        <p className="text-[10px] font-medium text-slate-500">الإضبارة التنفيذية</p>
                        <h3 id="dossier-meta-edit-title" className={`mt-0.5 ${EXEC_OVERLAY_TITLE}`}>
                            {isEvictionExecutionModule
                                ? 'تعديل بيانات الإضبارة والتخلية'
                                : 'تعديل بيانات الإضبارة'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق"
                    >
                        <X size={20} aria-hidden />
                    </button>
                </div>

                <DossierMetaEditSectionFields
                    dossierMetaDraft={liveDraft}
                    isEvictionExecutionModule={isEvictionExecutionModule}
                    isSpecificDeliveryClaim={isSpecificDeliveryClaim}
                    setDossierMetaDraft={pushDraft}
                />

                <div className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={() => {
                            setDossierMetaDraft(liveDraft);
                            saveDossierMetaDraft(liveDraft);
                        }}
                        className={`${EXEC_OVERLAY_PRIMARY_BTN} w-full`}
                    >
                        حفظ في ملف الإضبارة
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
};
