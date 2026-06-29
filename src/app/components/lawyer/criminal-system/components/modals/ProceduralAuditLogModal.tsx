import React from 'react';
import type { ProceduralCanvasAuditEntry } from '../../proceduralSandboxToolkit';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';

export type ProceduralAuditLogModalProps = {
    open: boolean;
    entries: ProceduralCanvasAuditEntry[];
    onClose: () => void;
};

export const ProceduralAuditLogModal = ({ open, entries, onClose }: ProceduralAuditLogModalProps) => {
    if (!open) return null;

    const sorted = [...entries].reverse();

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.procedural}>
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden max-h-[85vh] flex flex-col">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3 shrink-0">
                    <div className="text-white font-black text-sm">سجل اللوحة</div>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-sm font-bold">
                        إغلاق
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-2">
                    {sorted.length === 0 ? (
                        <div className="text-white/50 text-xs font-bold text-center py-8">لا توجد حركات مسجّلة بعد.</div>
                    ) : (
                        sorted.map((e) => (
                            <div
                                key={e.id}
                                className="rounded-lg border border-slate-600/50 bg-slate-800/40 px-3 py-2"
                            >
                                <div className="text-white text-xs font-bold whitespace-normal break-words">
                                    {e.summary}
                                </div>
                                <div className="text-white/40 text-[10px] font-black mt-1" dir="ltr">
                                    {new Date(e.at).toLocaleString('ar-IQ')}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </CriminalModalPortal>
    );
};
