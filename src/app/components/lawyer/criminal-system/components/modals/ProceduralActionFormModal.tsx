import React, { useEffect, useRef, useState } from 'react';
import { ModalIsoDateInput } from '../ModalIsoDateInput';
import { ProceduralContextLinkField } from '../ProceduralContextLinkField';
import { normalizeProceduralContextValue, type ProceduralContextValue } from '../../proceduralItemLink';
import {
    ACTION_STATUS_OPTIONS,
    formatTagsInput,
    parseTagsInput,
    type ProceduralActionItem,
    type ProceduralActionStatus,
    isActionStatus,
    type ProceduralPlacementContext,
} from '../../proceduralContainersEngine';
import { ProceduralPlacementBreadcrumb } from '../ProceduralPlacementBreadcrumb';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';

export type ProceduralActionFormModalProps = {
    caseId: string;
    open: boolean;
    placement?: ProceduralPlacementContext | null;
    initial?: ProceduralActionItem | null;
    onClose: () => void;
    onSubmit: (payload: Omit<ProceduralActionItem, 'type' | 'id'> & { id?: string }) => void;
};

export const ProceduralActionFormModal = ({
    caseId,
    open,
    placement,
    initial,
    onClose,
    onSubmit,
}: ProceduralActionFormModalProps) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [status, setStatus] = useState<ProceduralActionStatus>('in_progress');
    const [followUpDate, setFollowUpDate] = useState('');
    const [ctx, setCtx] = useState<ProceduralContextValue>({});
    const [tagsText, setTagsText] = useState('');

    /**
     * نَتَّبع هَوية فَتح المودال — تَهيئة الحقول تَحدث مرة واحدة عند الانفتاح
     * فقط، حتى لا يَمحو re-render من الأب النَّص المَكتوب أو الحقول الأخرى.
     */
    const lastInitializedOpenRef = useRef(false);
    useEffect(() => {
        if (!open) {
            lastInitializedOpenRef.current = false;
            return;
        }
        if (lastInitializedOpenRef.current) return;
        lastInitializedOpenRef.current = true;
        const st = initial?.status && isActionStatus(initial.status) ? initial.status : 'in_progress';
        setTitle(String(initial?.title ?? '').trim());
        setDate(String(initial?.date ?? '').trim() || new Date().toISOString().slice(0, 10));
        setStatus(st);
        setFollowUpDate(st === 'in_progress' ? String(initial?.followUpDate ?? '').trim() : '');
        setTagsText(formatTagsInput(initial?.tags));
        setCtx(normalizeProceduralContextValue(initial?.link, initial?.contextRef, initial?.contextNote));
    }, [open, initial]);

    if (!open) return null;

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.procedural}>
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm">
                        {initial?.id ? 'تعديل إجراء' : 'إجراء إداري جديد'}
                    </div>
                    <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] px-3 text-white/70 hover:text-white text-sm font-bold touch-manipulation">
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <ProceduralPlacementBreadcrumb placement={placement} />
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">عنوان الإجراء *</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="اكتب الإجراء بحرية..."
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">التاريخ *</label>
                        <ModalIsoDateInput value={date} onChange={setDate} />
                    </div>
                    <ProceduralContextLinkField caseId={caseId} value={ctx} onChange={setCtx} />
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">الحالة</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={status}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (!isActionStatus(v)) return;
                                setStatus(v);
                                if (v !== 'in_progress') setFollowUpDate('');
                            }}
                        >
                            {ACTION_STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} className="bg-slate-900">
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {status === 'in_progress' ? (
                        <div>
                            <label className="block text-white/70 text-xs font-black mb-1">
                                📅 تاريخ المراجعة القادمة (اختياري)
                            </label>
                            <ModalIsoDateInput value={followUpDate} onChange={setFollowUpDate} />
                        </div>
                    ) : null}
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">
                            🏷️ وسوم تكتيكية (افصل بينها بفاصلة — مثال: مستعجل، رشوة، خطير)
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={tagsText}
                            onChange={(e) => setTagsText(e.target.value)}
                            placeholder="مستعجل، خطير..."
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-sm font-black text-white/75 touch-manipulation"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            disabled={!title.trim() || !date.trim()}
                            onClick={() =>
                                onSubmit({
                                    id: initial?.id,
                                    title: title.trim(),
                                    date: date.trim(),
                                    status,
                                    followUpDate:
                                        status === 'in_progress' && followUpDate.trim()
                                            ? followUpDate.trim()
                                            : undefined,
                                    tags: parseTagsInput(tagsText),
                                    link: ctx.link,
                                    contextNote: ctx.contextNote,
                                    contextRef: undefined,
                                })
                            }
                            className="min-h-[44px] px-4 rounded-xl bg-[#E6C673] text-[#0B1021] text-sm font-black disabled:opacity-40 touch-manipulation hover:brightness-110 active:brightness-95 transition"
                        >
                            حفظ
                        </button>
                    </div>
                </div>
            </div>
        </CriminalModalPortal>
    );
};
