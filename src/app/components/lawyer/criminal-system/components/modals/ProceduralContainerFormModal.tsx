import React, { useEffect, useRef, useState } from 'react';
import {
    CONTAINER_COLOR_PRESETS,
    CONTAINER_ICON_PRESETS,
    normalizeColor,
    normalizeIcon,
} from '../../proceduralContainersEngine';

export type ProceduralContainerFormPayload = { title: string; color: string; icon: string };

export type ProceduralContainerFormModalProps = {
    open: boolean;
    initial?: ProceduralContainerFormPayload;
    title: string;
    onClose: () => void;
    onSubmit: (payload: ProceduralContainerFormPayload) => void;
};

export const ProceduralContainerFormModal = ({
    open,
    initial,
    title,
    onClose,
    onSubmit,
}: ProceduralContainerFormModalProps) => {
    const [containerTitle, setContainerTitle] = useState('');
    const [color, setColor] = useState(CONTAINER_COLOR_PRESETS[0]);
    const [icon, setIcon] = useState(CONTAINER_ICON_PRESETS[0]);

    /**
     * نَتَّبع هَوية فَتح المودال (بدلاً من هَوية كائن `initial`) — تَهيئة الحقول
     * تَحدث مرة واحدة عند الانفتاح فقط، وإلا فإن أي تَجديد لـ `initial` كَكائن جَديد
     * في الأب (بسبب أي re-render من المتجر/المؤقتات/…) كان يُعيد ضَبط الحقول ويَمسح
     * النَّص المَكتوب ويُرجع الأيقونة إلى البداية.
     */
    const lastInitializedOpenRef = useRef(false);
    useEffect(() => {
        if (!open) {
            lastInitializedOpenRef.current = false;
            return;
        }
        if (lastInitializedOpenRef.current) return;
        lastInitializedOpenRef.current = true;
        setContainerTitle(String(initial?.title ?? '').trim());
        setColor(normalizeColor(initial?.color ?? CONTAINER_COLOR_PRESETS[0]));
        setIcon(normalizeIcon(initial?.icon ?? CONTAINER_ICON_PRESETS[0]));
    }, [open, initial]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[222] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm">{title}</div>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-sm font-bold">
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">اسم الحاوية *</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={containerTitle}
                            onChange={(e) => setContainerTitle(e.target.value)}
                            placeholder="اكتب اسم المرحلة..."
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-2">الأيقونة</label>
                        <div className="flex flex-wrap gap-2">
                            {CONTAINER_ICON_PRESETS.map((ic) => (
                                <button
                                    key={ic}
                                    type="button"
                                    onClick={() => setIcon(ic)}
                                    className={`h-9 w-9 rounded-lg border-2 text-lg transition ${
                                        icon === ic ? 'border-white scale-110' : 'border-slate-600/80'
                                    }`}
                                >
                                    {ic}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-2">لون التمييز</label>
                        <div className="flex flex-wrap gap-2">
                            {CONTAINER_COLOR_PRESETS.map((c) => (
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
                            disabled={!containerTitle.trim()}
                            onClick={() =>
                                onSubmit({
                                    title: containerTitle.trim(),
                                    color: normalizeColor(color),
                                    icon: normalizeIcon(icon),
                                })
                            }
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black disabled:opacity-40"
                        >
                            حفظ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
