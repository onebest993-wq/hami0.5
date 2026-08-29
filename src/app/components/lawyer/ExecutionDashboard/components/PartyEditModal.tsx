import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { getCreditorHeirSubstitutionRequestStatus, getDebtorHeirSubstitutionRequestStatus } from '@/app/utils/executorSeizureDecisionQueue';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_EDIT_PANEL_CLASS,
    EXEC_MODAL_EDIT_PRIMARY_BTN_CLASS,
} from '../executionModalMobileShell';
import { PartyEditModalHeirsEditor } from './PartyEditModalHeirsEditor';
import type { PartyEditDraft, PartyEditModalProps } from './PartyEditModal.types';

export type { PartyEditDraft, PartyEditModalProps };

export const PartyEditModal: React.FC<PartyEditModalProps> = ({
    editPartyTarget,
    setEditPartyTarget,
    partyEditDraft,
    setPartyEditDraft,
    partyEditHeirDeleteConfirmIdx,
    setPartyEditHeirDeleteConfirmIdx,
    savePartyEditDraft,
    togglePartyEditHeirClient,
    removeHeirFromPartyEditDraftAtIndex,
    decisionsStorageExecutionId,
}) => {
    if (!editPartyTarget || !partyEditDraft) return null;

    const modal = (
    <div
        className={`fixed inset-0 z-[12000] flex items-center justify-center bg-black/70 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
        dir="rtl"
        onClick={() => {
            setEditPartyTarget(null);
            setPartyEditDraft(null);
        }}
        role="presentation"
    >
        <div
            className={EXEC_MODAL_EDIT_PANEL_CLASS}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
        >
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                    {partyEditDraft.heirsOnlyEdit
                        ? 'تعديل بيانات الورثة'
                        : `تعديل ${editPartyTarget.kind === 'creditor' ? 'الدائن' : 'المدين'}`}
                </h3>
                <button
                    type="button"
                    onClick={() => {
                        setEditPartyTarget(null);
                        setPartyEditDraft(null);
                    }}
                    className={EXEC_MODAL_CLOSE_BTN_CLASS}
                    aria-label="إغلاق"
                >
                    <X size={20} />
                </button>
            </div>
            <div className="space-y-3 text-right">
                {!partyEditDraft.heirsOnlyEdit ? (
                    <>
                        <div>
                            <label className="mb-1 block text-[10px] text-slate-500">الاسم</label>
                            <input
                                type="text"
                                value={partyEditDraft.name}
                                onChange={(e) =>
                                    setPartyEditDraft((d: PartyEditDraft | null) => (d ? { ...d, name: e.target.value } : d))
                                }
                                disabled={partyEditDraft.lockBaseInfo}
                                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] text-slate-500">العنوان</label>
                            <textarea
                                value={partyEditDraft.address}
                                onChange={(e) =>
                                    setPartyEditDraft((d: PartyEditDraft | null) => (d ? { ...d, address: e.target.value } : d))
                                }
                                disabled={partyEditDraft.lockBaseInfo}
                                rows={2}
                                className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                            />
                        </div>
                    </>
                ) : null}
                {partyEditDraft.lockBaseInfo && !partyEditDraft.heirsOnlyEdit ? (
                    <p className="text-[10px] text-amber-300/90">
                        {editPartyTarget.kind === 'creditor'
                            ? getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'approved'
                                ? 'بيانات المتوفى (الاسم/العنوان) مقفلة. يمكن تعديل بيانات الورثة المعتمدة من المنفذ فقط.'
                                : 'بيانات المتوفى مقفلة. تفاصيل الورثة تظهر هنا فقط بعد موافقة المنفذ العدل على طلب الإحلال.'
                            : getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'approved'
                                ? 'بيانات المتوفى (الاسم/العنوان) مقفلة. يمكن تعديل بيانات الورثة المعتمدة من المنفذ فقط.'
                                : 'بيانات المتوفى مقفلة. تفاصيل الورثة تظهر هنا فقط بعد موافقة المنفذ العدل على طلب الإحلال.'}
                    </p>
                ) : partyEditDraft.heirsOnlyEdit ? (
                    <p className="text-[10px] text-amber-300/90">
                        يمكنك تعديل أسماء وبيانات الورثة المسجّلين فقط؛ بيانات المتوفى مقفلة.
                    </p>
                ) : null}
                <div>
                    <PartyEditModalHeirsEditor
                        partyEditDraft={partyEditDraft}
                        setPartyEditDraft={setPartyEditDraft}
                        partyEditHeirDeleteConfirmIdx={partyEditHeirDeleteConfirmIdx}
                        setPartyEditHeirDeleteConfirmIdx={setPartyEditHeirDeleteConfirmIdx}
                        togglePartyEditHeirClient={togglePartyEditHeirClient}
                        removeHeirFromPartyEditDraftAtIndex={removeHeirFromPartyEditDraftAtIndex}
                    />
                </div>
                <button
                    type="button"
                    onClick={savePartyEditDraft}
                    className={`${EXEC_MODAL_EDIT_PRIMARY_BTN_CLASS} bg-emerald-800/80 text-white hover:bg-emerald-700/90`}
                >
                    حفظ
                </button>
            </div>
        </div>
    </div>
    );

    return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
};
