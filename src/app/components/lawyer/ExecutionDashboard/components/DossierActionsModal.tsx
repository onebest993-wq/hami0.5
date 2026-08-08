import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import {
    DossierActionFormFields,
    DossierActionFormFooter,
    useDossierActionForm,
} from './DossierActionForm';
import { Forward, Shuffle, FileText, RefreshCw, MessageSquare } from '@/app/components/ui/lucideIcons';

export type DossierActionType = 'delegation' | 'unify' | 'transfer' | 'renew' | 'inaba_correspondence';

const ACTION_META: Record<DossierActionType, { label: string; icon: React.ReactNode }> = {
    delegation: { label: 'طلب الإنابة التنفيذية', icon: <Forward size={16} /> },
    unify: { label: 'طلب توحيد الأضابير', icon: <Shuffle size={16} /> },
    transfer: { label: 'طلب نقل الإضبارة', icon: <FileText size={16} /> },
    renew: { label: 'طلب تجديد الإضبارة', icon: <RefreshCw size={16} /> },
    inaba_correspondence: { label: 'طلب مخاطبة الإنابة', icon: <MessageSquare size={16} /> },
};

export interface DossierActionPayload {
    actionType: DossierActionType;
    delegationTargetDirectorate?: string;
    delegationPurpose?: string;
    unificationTargetType?: 'own' | 'colleague';
    unificationTargetId?: string;
    unificationColleagueToken?: string;
    unificationTargetMeta?: { directorate?: string; fileNumber?: string; fileYear?: string };
    transferTargetDirectorate?: string;
    transferReason?: string;
    renewalReason?: string;
    inabaCorrespondenceSubFileId?: string;
    inabaCorrespondenceDirectorate?: string;
    inabaCorrespondenceSubject?: string;
}

interface DossierActionsModalProps {
    open: boolean;
    actionType: DossierActionType | null;
    onClose: () => void;
    onConfirm: (payload: DossierActionPayload) => void;
    saving?: boolean;
    currentFileId?: string;
    inabaTargets?: { id: string; directorate: string }[];
}

const DossierActionsModalBody: React.FC<
    Omit<DossierActionsModalProps, 'open'> & { actionType: DossierActionType }
> = ({ actionType, onClose, onConfirm, saving, currentFileId, inabaTargets }) => {
    const meta = ACTION_META[actionType];
    const form = useDossierActionForm(actionType, true, currentFileId, inabaTargets);

    const handleConfirm = () => {
        onConfirm(form.buildPayload());
        form.resetFields();
        onClose();
    };

    return (
        <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0A0F1C] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dossier-action-modal-title"
        >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                        {meta.icon}
                        <span id="dossier-action-modal-title" className="text-[13px] font-bold text-amber-200">
                            {meta.label}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5">
                    <DossierActionFormFields actionType={actionType} form={form} inabaTargets={inabaTargets} />
                    <DossierActionFormFooter
                        saving={saving}
                        disabled={form.isConfirmDisabled}
                        onCancel={onClose}
                        onConfirm={handleConfirm}
                    />
                </div>
        </div>
    );
};

export const DossierActionsModal: React.FC<DossierActionsModalProps> = ({
    open,
    actionType,
    onClose,
    onConfirm,
    saving,
    currentFileId,
    inabaTargets,
}) => {
    if (!open || !actionType) return null;

    const layer = (
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: EXEC_MODAL_Z.nestedOverUnified }}
            role="presentation"
            onClick={onClose}
        >
            <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <DossierActionsModalBody
                    actionType={actionType}
                    onClose={onClose}
                    onConfirm={onConfirm}
                    saving={saving}
                    currentFileId={currentFileId}
                    inabaTargets={inabaTargets}
                />
            </div>
        </div>
    );

    if (typeof document === 'undefined') return layer;
    return createPortal(layer, document.body);
};
