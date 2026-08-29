import React from 'react';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { heirRowHasAnyText, makeHeirRowId } from '../helpers';
import type { HeirDetailRow } from '../helpers';
import { EXEC_MODAL_TOUCH_TARGET } from '../executionModalMobileShell';
import type { PartyEditDraft } from './PartyEditModal.types';

export function PartyEditModalHeirsEditor({
    partyEditDraft,
    setPartyEditDraft,
    partyEditHeirDeleteConfirmIdx,
    setPartyEditHeirDeleteConfirmIdx,
    togglePartyEditHeirClient,
    removeHeirFromPartyEditDraftAtIndex,
}: {
    partyEditDraft: PartyEditDraft;
    setPartyEditDraft: React.Dispatch<React.SetStateAction<PartyEditDraft | null>>;
    partyEditHeirDeleteConfirmIdx: number | null;
    setPartyEditHeirDeleteConfirmIdx: (idx: number | null) => void;
    togglePartyEditHeirClient: (heirIdx: number) => void;
    removeHeirFromPartyEditDraftAtIndex: (idx: number) => void;
}) {
    if (!partyEditDraft.includeHeirsInForm || partyEditDraft.heirs.length === 0) return null;
    return (
        <>
            <div className="mb-1 flex items-center justify-between">
                <label className="block text-[10px] text-slate-500">أسماء الورثة</label>
            </div>
            <div className="space-y-1.5">
                {partyEditDraft.heirs.map((heir: HeirDetailRow, heirIdx: number) => {
                    const canDeleteHeirRow =
                        partyEditDraft.heirs.length > 1 || heirRowHasAnyText(heir);
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
                                        className={`rounded-lg border px-2 py-1 text-[9px] font-extrabold transition ${EXEC_MODAL_TOUCH_TARGET} ${
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
                                            heir.isClient ? 'إلغاء علامة الموكل' : 'علامة الموكل'
                                        }
                                    >
                                        {heir.isClient ? '★ موكلي' : 'موكلي'}
                                    </button>
                                    {canDeleteHeirRow ? (
                                        <button
                                            type="button"
                                            onClick={() => setPartyEditHeirDeleteConfirmIdx(heirIdx)}
                                            className={`rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-950/40 hover:text-rose-300 ${EXEC_MODAL_TOUCH_TARGET}`}
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
                                            className={`rounded-lg bg-rose-700/85 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-rose-600/90 ${EXEC_MODAL_TOUCH_TARGET}`}
                                            onClick={() =>
                                                removeHeirFromPartyEditDraftAtIndex(heirIdx)
                                            }
                                        >
                                            تأكيد الحذف
                                        </button>
                                        <button
                                            type="button"
                                            className={`rounded-lg border border-slate-500/60 px-3 py-1.5 text-[10px] font-bold text-slate-200 hover:bg-slate-800/80 ${EXEC_MODAL_TOUCH_TARGET}`}
                                            onClick={() => setPartyEditHeirDeleteConfirmIdx(null)}
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
    );
}
