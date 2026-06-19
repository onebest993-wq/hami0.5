import React from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import type { LooseArchiveFile } from '../types';

export type ArchivePortalTrashDialogsProps = {
    type: string;
    trashConfirmTarget: LooseArchiveFile | null;
    setTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    lawsuitTrashConfirmTarget: LooseArchiveFile | null;
    setLawsuitTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    criminalDeleteTarget: { id: string; title: string } | null;
    setCriminalDeleteTarget: (t: { id: string; title: string } | null) => void;
    permanentDeleteOpen: boolean;
    setPermanentDeleteOpen: (v: boolean) => void;
    permanentCountdown: number;
    permanentIdsRef: React.MutableRefObject<Array<string | number>>;
    onMoveExecutionToTrash?: (id: string | number) => void;
    onMoveLawsuitToTrash?: (id: string | number) => void;
    onDeleteCriminalCase?: (id: string) => void;
};

export function ArchivePortalTrashDialogs({
    type,
    trashConfirmTarget,
    setTrashConfirmTarget,
    lawsuitTrashConfirmTarget,
    setLawsuitTrashConfirmTarget,
    criminalDeleteTarget,
    setCriminalDeleteTarget,
    permanentDeleteOpen,
    setPermanentDeleteOpen,
    permanentCountdown,
    permanentIdsRef,
    onMoveExecutionToTrash,
    onMoveLawsuitToTrash,
    onDeleteCriminalCase,
}: ArchivePortalTrashDialogsProps) {
    return (
        <>
                        {type === 'executions' && trashConfirmTarget && onMoveExecutionToTrash && (
                            <div
                                className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-4"
                                onClick={() => setTrashConfirmTarget(null)}
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
            
                        {type === 'lawsuits' && lawsuitTrashConfirmTarget && onMoveLawsuitToTrash && (
                            <motion.div
                                className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-4"
                                onClick={() => setLawsuitTrashConfirmTarget(null)}
                                role="presentation"
                            >
                                <motion.div
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
                                </motion.div>
                            </motion.div>
                        )}
            
                        {criminalDeleteTarget && onDeleteCriminalCase ? (
                            <div className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-4">
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
                            <div className="fixed inset-0 z-[140] bg-black/85 flex items-center justify-center p-4">
                                <div className="bg-[#0A0F1C] border border-rose-500/35 rounded-2xl p-6 max-w-md w-full text-right shadow-2xl">
                                    <h3 className="text-rose-200 font-bold text-lg mb-3 flex flex-row-reverse items-center justify-end gap-2">
                                        <Trash2 size={20} />
                                        حذف نهائي
                                    </h3>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                        سيتم حذف {permanentIdsRef.current.length}{' '}
                                        {type === 'lawsuits' ? 'إضبارة دعوى' : 'إضبارة'} نهائياً من هذا الجهاز بعد انتهاء العد
                                        التنازلي (10 ثوانٍ). لا يمكن التراجع بعد اكتماله.
                                    </p>
                                    <p className="text-4xl font-black text-center text-rose-300 tabular-nums mb-6">
                                        {permanentCountdown}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setPermanentDeleteOpen(false)}
                                        className="w-full py-2.5 rounded-xl border border-white/20 text-slate-200 hover:bg-white/5"
                                    >
                                        إلغاء والاحتفاظ في السلة
                                    </button>
                                </div>
                            </div>
                        )}
        </>
    );
}
