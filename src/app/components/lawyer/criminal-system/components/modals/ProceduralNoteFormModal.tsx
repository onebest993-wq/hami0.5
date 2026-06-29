import React, { useEffect, useRef, useState } from 'react';
import type { ProceduralNoteItem } from '../../proceduralContainersEngine';
import { ProceduralContextLinkField } from '../ProceduralContextLinkField';
import { normalizeProceduralContextValue, type ProceduralContextValue } from '../../proceduralItemLink';
import { formatTagsInput, parseTagsInput, type ProceduralPlacementContext } from '../../proceduralContainersEngine';
import { ProceduralPlacementBreadcrumb } from '../ProceduralPlacementBreadcrumb';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';

export type ProceduralNoteFormModalProps = {
    caseId: string;
    open: boolean;
    placement?: ProceduralPlacementContext | null;
    initial?: ProceduralNoteItem | null;
    onClose: () => void;
    onSubmit: (payload: Omit<ProceduralNoteItem, 'type' | 'id'> & { id?: string }) => void;
};

export const ProceduralNoteFormModal = ({
    caseId,
    open,
    placement,
    initial,
    onClose,
    onSubmit,
}: ProceduralNoteFormModalProps) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
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
        setTitle(String(initial?.title ?? '').trim());
        setBody(String(initial?.body ?? '').trim());
        setTagsText(formatTagsInput(initial?.tags));
        setCtx(normalizeProceduralContextValue(initial?.link, initial?.contextRef, initial?.contextNote));
    }, [open, initial]);

    if (!open) return null;

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.procedural}>
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm">{initial?.id ? 'تعديل ملاحظة' : 'ملاحظة جديدة'}</div>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-sm font-bold">
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <ProceduralPlacementBreadcrumb placement={placement} />
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">عنوان الملاحظة *</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="اكتب عنواناً..."
                        />
                    </div>
                    <ProceduralContextLinkField caseId={caseId} value={ctx} onChange={setCtx} />
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
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">التفاصيل (اختياري)</label>
                        <textarea
                            className="w-full min-h-[5rem] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="نص الملاحظة..."
                        />
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
                            disabled={!title.trim()}
                            onClick={() =>
                                onSubmit({
                                    id: initial?.id,
                                    title: title.trim(),
                                    body: body.trim() || undefined,
                                    link: ctx.link,
                                    contextNote: ctx.contextNote,
                                    tags: parseTagsInput(tagsText),
                                    contextRef: undefined,
                                })
                            }
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
