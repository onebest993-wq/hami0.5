// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { PROCEDURAL_PATH_COLOR_PRESETS, normalizePathColor } from '../../proceduralPathsEngine';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';

export type ProceduralPathFormPayload = { name: string; color: string };

export type ProceduralPathFormModalProps = {
    open: boolean;
    initial?: ProceduralPathFormPayload;
    title: string;
    onClose: () => void;
    onSubmit: (payload: ProceduralPathFormPayload) => void;
};

export const ProceduralPathFormModal = ({
    open,
    initial,
    title,
    onClose,
    onSubmit,
}: ProceduralPathFormModalProps) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState(PROCEDURAL_PATH_COLOR_PRESETS[0]);

    /**
     * نَتَّبع هَوية فَتح المودال — تَهيئة الحقول تَحدث مرة واحدة عند الانفتاح
     * فقط، حتى لا يَمحو re-render من الأب النَّص المَكتوب أو اللون المختار.
     */
    const lastInitializedOpenRef = useRef(false);
    useEffect(() => {
        if (!open) {
            lastInitializedOpenRef.current = false;
            return;
        }
        if (lastInitializedOpenRef.current) return;
        lastInitializedOpenRef.current = true;
        setName(String(initial?.name ?? '').trim());
        setColor(normalizePathColor(initial?.color ?? PROCEDURAL_PATH_COLOR_PRESETS[0]));
    }, [open, initial]);

    if (!open) return null;

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.procedural}>
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm">{title}</div>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-sm font-bold">
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">اسم المسار *</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="مثال: متابعة الطب العدلي"
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-2">لون التمييز</label>
                        <div className="flex flex-wrap gap-2">
                            {PROCEDURAL_PATH_COLOR_PRESETS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`h-8 w-8 rounded-lg border-2 transition ${
                                        color === c ? 'border-white scale-110' : 'border-slate-600/80'
                                    }`}
                                    style={{ backgroundColor: c }}
                                    aria-label={c}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/75"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            disabled={!name.trim()}
                            onClick={() => onSubmit({ name: name.trim(), color: normalizePathColor(color) })}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black disabled:opacity-40"
                        >
                            حفظ
                        </button>
                    </div>
                </div>
            </div>
        </CriminalModalPortal>
    );
};
