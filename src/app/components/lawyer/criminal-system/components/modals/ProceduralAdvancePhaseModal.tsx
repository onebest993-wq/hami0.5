import React, { useEffect, useState } from 'react';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';

type ProceduralAdvancePhasePayload = { spawnChildTitle?: string };

export type ProceduralAdvancePhaseModalProps = {
    open: boolean;
    actionTitle: string;
    onClose: () => void;
    onSubmit: (payload: ProceduralAdvancePhasePayload) => void;
};

export const ProceduralAdvancePhaseModal = ({
    open,
    actionTitle,
    onClose,
    onSubmit,
}: ProceduralAdvancePhaseModalProps) => {
    const [spawnChildTitle, setSpawnChildTitle] = useState('');

    useEffect(() => {
        if (!open) return;
        setSpawnChildTitle('');
    }, [open]);

    if (!open) return null;

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.procedural}>
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="text-white font-black text-sm">نقل للحالة التالية</div>
                    <div className="text-white/55 text-[10px] font-bold mt-1">الإجراء: {actionTitle}</div>
                </div>
                <div className="p-4 space-y-3">
                    <p className="text-white/70 text-xs font-bold">
                        سيُعلَّم الإجراء كمنجز. يمكنك اختيارياً إنشاء حاوية فرعية للمرحلة التالية.
                    </p>
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">
                            اسم حاوية المرحلة التالية (اختياري)
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={spawnChildTitle}
                            onChange={(e) => setSpawnChildTitle(e.target.value)}
                            placeholder="اتركه فارغاً إن لم تُرد حاوية جديدة"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-sm font-black text-white/75 touch-manipulation"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                onSubmit({
                                    spawnChildTitle: spawnChildTitle.trim() || undefined,
                                })
                            }
                            className="min-h-[44px] px-4 rounded-xl bg-emerald-600/90 text-sm font-black text-white touch-manipulation"
                        >
                            تأكيد الانتقال
                        </button>
                    </div>
                </div>
            </div>
        </CriminalModalPortal>
    );
};
