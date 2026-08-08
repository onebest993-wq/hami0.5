import React from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from '@/app/components/ui/lucideIcons';
import { getCreditorHeirSubstitutionRequestStatus, getDebtorHeirSubstitutionRequestStatus } from '@/app/utils/executorSeizureDecisionQueue';
import { heirRowHasAnyText, makeHeirRowId } from '../helpers';
import type { HeirDetailRow } from '../helpers';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_EDIT_PANEL_CLASS,
    EXEC_MODAL_EDIT_PRIMARY_BTN_CLASS,
} from '../executionModalMobileShell';

export interface PartyEditDraft {
    name: string;
    phone: string;
    address: string;
    heirs: HeirDetailRow[];
    lockBaseInfo: boolean;
    includeHeirsInForm?: boolean;
    heirsOnlyEdit?: boolean;
}

export interface PartyEditModalProps {
    editPartyTarget: { kind: 'creditor' | 'debtor'; index: number };
    setEditPartyTarget: (target: { kind: 'creditor' | 'debtor'; index: number } | null) => void;
    partyEditDraft: PartyEditDraft;
    setPartyEditDraft: React.Dispatch<React.SetStateAction<PartyEditDraft | null>>;
    partyEditHeirDeleteConfirmIdx: number | null;
    setPartyEditHeirDeleteConfirmIdx: (idx: number | null) => void;
    savePartyEditDraft: () => void;
    togglePartyEditHeirClient: (heirIdx: number) => void;
    removeHeirFromPartyEditDraftAtIndex: (idx: number) => void;
    decisionsStorageExecutionId: string;
}

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
        className={`fixed inset-0 z-[12000] flex items-center justify-center bg-black/80 backdrop-blur-sm ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
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
                                    setPartyEditDraft((d) => (d ? { ...d, name: e.target.value } : d))
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
                                    setPartyEditDraft((d) => (d ? { ...d, address: e.target.value } : d))
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
                    {partyEditDraft.includeHeirsInForm && partyEditDraft.heirs.length > 0 ? (
                        <>
                            <div className="mb-1 flex items-center justify-between">
                                <label className="block text-[10px] text-slate-500">
                                    أسماء الورثة
                                </label>
                            </div>
                            <div className="space-y-1.5">
                                {partyEditDraft.heirs.map((heir, heirIdx) => {
                                    const canDeleteHeirRow =
                                        partyEditDraft.heirs.length > 1 ||
                                        heirRowHasAnyText(heir);
                                    return (
                                        <div
                                            key={heir.rowId || heirIdx}
                                            className="grid grid-cols-1 gap-1.5 rounded-lg border border-white/10 bg-slate-900/35 p-2"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-semibold text-slate-400">
                                                    وارث {heirIdx + 1}
                                                </span>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePartyEditHeirClient(heirIdx)}
                                                        className={`rounded-lg border px-2 py-1 text-[9px] font-extrabold transition ${
                                                            heir.isClient
                                                                ? 'border-[#E6C673]/55 bg-[#E6C673]/15 text-[#E6C673]'
                                                                : 'border-white/15 bg-slate-950/40 text-slate-400 hover:border-[#E6C673]/35 hover:text-[#E6C673]/90'
                                                        }`}
                                                        title={
                                                            heir.isClient
                                                                ? 'إلغاء وكالة الموكل عن هذا الوارث'
                                                                : 'تعيين هذا الوارث موكلًا (★)'
                                                        }
                                                        aria-pressed={Boolean(heir.isClient)}
                                                        aria-label={
                                                            heir.isClient
                                                                ? 'إلغاء علامة الموكل'
                                                                : 'علامة الموكل'
                                                        }
                                                    >
                                                        {heir.isClient ? '★ موكلي' : 'موكلي'}
                                                    </button>
                                                    {canDeleteHeirRow ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setPartyEditHeirDeleteConfirmIdx(heirIdx)
                                                            }
                                                            className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-950/40 hover:text-rose-300"
                                                            title="حذف الوريث"
                                                            aria-label="حذف الوريث"
                                                        >
                                                            <Trash2 size={16} strokeWidth={2} />
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                            {partyEditHeirDeleteConfirmIdx === heirIdx ? (
                                                <div className="rounded-lg border border-rose-500/35 bg-rose-950/25 p-2 text-[10px] leading-relaxed text-rose-100">
                                                    <p>
                                                        تحذير: حذف هذا الوريث من القائمة بعد الضغط على
                                                        «حفظ» يعني أن أي تعديل جوهري على ذمة الورثة
                                                        المعتمدة يتطلّب تقديم طلب إحلال جديد إلى المنفذ
                                                        العدل.
                                                    </p>
                                                    <div className="mt-2 flex flex-row-reverse flex-wrap justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            className="rounded-lg bg-rose-700/85 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-rose-600/90"
                                                            onClick={() =>
                                                                removeHeirFromPartyEditDraftAtIndex(
                                                                    heirIdx
                                                                )
                                                            }
                                                        >
                                                            تأكيد الحذف
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rounded-lg border border-slate-500/60 px-3 py-1.5 text-[10px] font-bold text-slate-200 hover:bg-slate-800/80"
                                                            onClick={() =>
                                                                setPartyEditHeirDeleteConfirmIdx(null)
                                                            }
                                                        >
                                                            إلغاء
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}
                                            <input
                                                type="text"
                                                value={heir.name}
                                                onChange={(e) =>
                                                    setPartyEditDraft((d) => {
                                                        if (!d) return d;
                                                        const next = [...d.heirs];
                                                        if (next.length === 0) {
                                                            next.push({
                                                                rowId: makeHeirRowId(),
                                                                name: '',
                                                                phone: '',
                                                                address: '',
                                                                isClient: false,
                                                            });
                                                        }
                                                        next[heirIdx] = {
                                                            ...next[heirIdx],
                                                            name: e.target.value,
                                                        };
                                                        return { ...d, heirs: next };
                                                    })
                                                }
                                                placeholder="اسم الوارث..."
                                                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                                            />
                                            <input
                                                type="text"
                                                value={heir.phone}
                                                onChange={(e) =>
                                                    setPartyEditDraft((d) => {
                                                        if (!d) return d;
                                                        const next = [...d.heirs];
                                                        next[heirIdx] = {
                                                            ...next[heirIdx],
                                                            phone: e.target.value,
                                                        };
                                                        return { ...d, heirs: next };
                                                    })
                                                }
                                                placeholder="هاتف الوارث..."
                                                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                                            />
                                            <input
                                                type="text"
                                                value={heir.address}
                                                onChange={(e) =>
                                                    setPartyEditDraft((d) => {
                                                        if (!d) return d;
                                                        const next = [...d.heirs];
                                                        next[heirIdx] = {
                                                            ...next[heirIdx],
                                                            address: e.target.value,
                                                        };
                                                        return { ...d, heirs: next };
                                                    })
                                                }
                                                placeholder="عنوان الوارث..."
                                                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : null}
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
