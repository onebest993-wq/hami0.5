import React from 'react';
import { createPortal } from 'react-dom';
import { Archive, Trash2 } from 'lucide-react';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import type { LooseArchiveFile } from '../types';

export type ArchivePortalTrashDialogsProps = {
    type: string;
    trashConfirmTarget: LooseArchiveFile | null;
    setTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    archiveConfirmTarget: LooseArchiveFile | null;
    setArchiveConfirmTarget: (f: LooseArchiveFile | null) => void;
    onArchiveExecution?: (id: string | number) => void;
    lawsuitTrashConfirmTarget: LooseArchiveFile | null;
    setLawsuitTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    criminalDeleteTarget: { id: string; title: string } | null;
    setCriminalDeleteTarget: (t: { id: string; title: string } | null) => void;
    permanentDeleteOpen: boolean;
    setPermanentDeleteOpen: (v: boolean) => void;
    confirmPermanentDelete: () => void;
    permanentIdsRef: React.MutableRefObject<Array<string | number>>;
    onMoveExecutionToTrash?: (id: string | number) => void;
    onMoveLawsuitToTrash?: (id: string | number) => void;
    onDeleteCriminalCase?: (id: string) => void;
};

export function ArchivePortalTrashDialogs({
    type,
    trashConfirmTarget,
    setTrashConfirmTarget,
    archiveConfirmTarget,
    setArchiveConfirmTarget,
    onArchiveExecution,
    lawsuitTrashConfirmTarget,
    setLawsuitTrashConfirmTarget,
    criminalDeleteTarget,
    setCriminalDeleteTarget,
    permanentDeleteOpen,
    setPermanentDeleteOpen,
    confirmPermanentDelete,
    permanentIdsRef,
    onMoveExecutionToTrash,
    onMoveLawsuitToTrash,
    onDeleteCriminalCase,
}: ArchivePortalTrashDialogsProps) {
    const hasLayer =
        (type === 'executions' && trashConfirmTarget && onMoveExecutionToTrash) ||
        (type === 'executions' && archiveConfirmTarget && onArchiveExecution) ||
        (type === 'lawsuits' && lawsuitTrashConfirmTarget && onMoveLawsuitToTrash) ||
        (criminalDeleteTarget && onDeleteCriminalCase) ||
        permanentDeleteOpen;

    if (!hasLayer || typeof document === 'undefined') return null;

    const layer = (
            <>
                        {type === 'executions' && trashConfirmTarget && onMoveExecutionToTrash && (
                            <div
                                className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
                                onClick={() => setTrashConfirmTarget(null)}
                                role="presentation"
                            >
                                <div
                                    role="dialog"
                                    aria-modal="true"
                                    data-testid="execution-trash-confirm-dialog"
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#0A0F1C] border border-[#E6C673]/30 rounded-2xl p-6 max-w-md w-full text-right shadow-2xl"
                                >
                                    <h3 className="text-[#E6C673] font-bold text-lg mb-3">تأكيد النقل إلى سلة المهملات</h3>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-2">
                                        سيتم نقل الإضبارة إلى سلة المهملات. تبقى هناك 30 يوماً ويمكنك استرجاعها خلالها؛ بعدها تُحذف
                                        نهائياً تلقائياً من هذا الجهاز.
                                    </p>
                                    <p className="text-amber-200/90 text-xs mb-6">
                                        رقم الإضبارة:{' '}
                                        <span className="font-mono">
                                            {trashConfirmTarget.fileNumber || trashConfirmTarget.caseNo || '—'}
                                        </span>
                                    </p>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setTrashConfirmTarget(null)}
                                            className="py-2.5 px-4 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5"
                                        >
                                            إلغاء
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="execution-trash-confirm-submit"
                                            onClick={() => {
                                                onMoveExecutionToTrash(trashConfirmTarget.id);
                                                setTrashConfirmTarget(null);
                                            }}
                                            className="py-2.5 px-4 rounded-xl bg-rose-700/90 text-white font-bold hover:bg-rose-600"
                                        >
                                            تأكيد النقل إلى السلة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {type === 'executions' && archiveConfirmTarget && onArchiveExecution && (
                            <div
                                className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
                                onClick={() => setArchiveConfirmTarget(null)}
                                role="presentation"
                            >
                                <div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="execution-archive-confirm-title"
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#0A0F1C] border border-amber-500/35 rounded-2xl p-6 max-w-md w-full text-right shadow-2xl"
                                    data-testid="execution-archive-confirm-dialog"
                                >
                                    <h3
                                        id="execution-archive-confirm-title"
                                        className="text-amber-200 font-bold text-lg mb-3 flex flex-row-reverse items-center justify-end gap-2"
                                    >
                                        <Archive size={20} />
                                        تأكيد الأرشفة
                                    </h3>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-2">
                                        ستُنقل الإضبارة إلى مخزن الأرشيف وتختفي من القائمة النشطة. يمكنك
                                        استرجاعها لاحقاً من تبويب «مخزن الأرشيف».
                                    </p>
                                    <p className="text-amber-200/90 text-xs mb-6">
                                        رقم الإضبارة:{' '}
                                        <span className="font-mono">
                                            {archiveConfirmTarget.fileNumber ||
                                                archiveConfirmTarget.caseNo ||
                                                '—'}
                                        </span>
                                    </p>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setArchiveConfirmTarget(null)}
                                            className="py-2.5 px-4 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5"
                                        >
                                            إلغاء
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="execution-archive-confirm-submit"
                                            onClick={() => {
                                                onArchiveExecution(archiveConfirmTarget.id);
                                                setArchiveConfirmTarget(null);
                                            }}
                                            className="py-2.5 px-4 rounded-xl bg-amber-700/90 text-white font-bold hover:bg-amber-600"
                                        >
                                            تأكيد الأرشفة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
            
                        {type === 'lawsuits' && lawsuitTrashConfirmTarget && onMoveLawsuitToTrash && (
                            <div
                                className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
                                onClick={() => setLawsuitTrashConfirmTarget(null)}
                                role="presentation"
                            >
                                <div
                                    role="dialog"
                                    aria-modal="true"
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#0A0F1C] border border-[#E6C673]/30 rounded-2xl p-6 max-w-md w-full text-right shadow-2xl"
                                >
                                    <h3 className="text-[#E6C673] font-bold text-lg mb-3">تأكيد النقل إلى سلة المهملات</h3>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-2">
                                        سيتم نقل إضبارة الدعوى إلى سلة المهملات. تبقى هناك 30 يوماً ويمكنك استرجاعها خلالها؛ بعدها
                                        تُحذف نهائياً تلقائياً.
                                    </p>
                                    <p className="text-amber-200/90 text-xs mb-6">
                                        رقم الإضبارة:{' '}
                                        <span className="font-mono">
                                            {lawsuitTrashConfirmTarget.caseNo || lawsuitTrashConfirmTarget.caseNumber || '—'}
                                        </span>
                                    </p>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setLawsuitTrashConfirmTarget(null)}
                                            className="py-2.5 px-4 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5"
                                        >
                                            إلغاء
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onMoveLawsuitToTrash(lawsuitTrashConfirmTarget.id);
                                                setLawsuitTrashConfirmTarget(null);
                                            }}
                                            className="py-2.5 px-4 rounded-xl bg-rose-700/90 text-white font-bold hover:bg-rose-600"
                                        >
                                            تأكيد النقل إلى السلة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
            
                        {criminalDeleteTarget && onDeleteCriminalCase ? (
                            <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                                <div className="bg-[#0A0F1C] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full text-right">
                                    <h3 className="text-rose-200 font-bold text-lg mb-2">تأكيد حذف الإضبارة الجزائية</h3>
                                    <p className="text-white/60 text-xs mb-4 truncate">{criminalDeleteTarget.title}</p>
                                    <p className="text-slate-300 text-sm mb-6">
                                        سيتم حذف الإضبارة وكل بياناتها المرتبطة نهائياً من هذا الجهاز.
                                    </p>
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setCriminalDeleteTarget(null)}
                                            className="py-2 px-4 rounded-xl border border-white/15 text-slate-300"
                                        >
                                            إلغاء
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onDeleteCriminalCase(criminalDeleteTarget.id);
                                                unpinWorkspaceItem(criminalDeleteTarget.id, 'criminal');
                                                setCriminalDeleteTarget(null);
                                            }}
                                            className="py-2 px-4 rounded-xl bg-rose-600 text-white font-bold"
                                        >
                                            حذف نهائي
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
            
                        {(type === 'executions' || type === 'lawsuits') && permanentDeleteOpen && (
                            <div
                                className="fixed inset-0 z-[210] bg-black/85 flex items-center justify-center p-4"
                                onClick={() => setPermanentDeleteOpen(false)}
                                role="presentation"
                            >
                                <div
                                    role="dialog"
                                    aria-modal="true"
                                    data-testid="execution-permanent-delete-dialog"
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#0A0F1C] border border-rose-500/35 rounded-2xl p-6 max-w-md w-full text-right shadow-2xl"
                                >
                                    <h3 className="text-rose-200 font-bold text-lg mb-3 flex flex-row-reverse items-center justify-end gap-2">
                                        <Trash2 size={20} />
                                        تأكيد الحذف النهائي
                                    </h3>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                                        سيتم حذف {permanentIdsRef.current.length}{' '}
                                        {type === 'lawsuits' ? 'إضبارة دعوى' : 'إضبارة تنفيذ'} نهائياً من
                                        هذا الجهاز. لا يمكن التراجع بعد التأكيد.
                                    </p>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setPermanentDeleteOpen(false)}
                                            className="py-2.5 px-4 rounded-xl border border-white/20 text-slate-200 hover:bg-white/5"
                                        >
                                            إلغاء والاحتفاظ في السلة
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="execution-permanent-delete-confirm"
                                            onClick={confirmPermanentDelete}
                                            className="py-2.5 px-4 rounded-xl bg-rose-700/90 text-white font-bold hover:bg-rose-600"
                                        >
                                            حذف نهائي الآن
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
            </>
    );

    return createPortal(layer, document.body);
}
