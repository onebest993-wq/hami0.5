import React, { useEffect, useState } from 'react';
import { TRIAL_EVENT_CATEGORIES, type TrialEventCategory } from '@/app/types/criminal';
import type { TimelineEvent } from '../../criminalStore';
import { isTimelineNextDateInvalid } from '../../criminalStageUtils';

export type TrialCourtEventModalProps = {
    open: boolean;
    caseId: string;
    onClose: () => void;
    addTimelineEvent: (caseId: string, event: TimelineEvent) => void;
    onError: () => void;
};

const createId = () =>
    globalThis.crypto && 'randomUUID' in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const isTrialCategory = (v: string): v is TrialEventCategory =>
    (TRIAL_EVENT_CATEGORIES as readonly string[]).includes(v);

export const TrialCourtEventModal = ({ open, caseId, onClose, addTimelineEvent, onError }: TrialCourtEventModalProps) => {
    const [category, setCategory] = useState<TrialEventCategory | ''>('');
    const [eventDate, setEventDate] = useState('');
    const [sessionNumber, setSessionNumber] = useState('');
    const [judgeOrPanelName, setJudgeOrPanelName] = useState('');
    const [postponementReason, setPostponementReason] = useState('');
    const [nextSessionRequests, setNextSessionRequests] = useState('');
    const [description, setDescription] = useState('');
    const [nextDate, setNextDate] = useState('');

    useEffect(() => {
        if (!open) return;
        setCategory('');
        setEventDate(new Date().toISOString().slice(0, 10));
        setSessionNumber('');
        setJudgeOrPanelName('');
        setPostponementReason('');
        setNextSessionRequests('');
        setDescription('');
        setNextDate('');
    }, [open]);

    if (!open) return null;

    const needsPostponement = category === 'تأجيل لتدقيق';
    const isSession = category === 'جلسة مرافعة';

    const handleSubmit = () => {
        const date = eventDate.trim();
        const cat = category;
        if (!cat || !date) return;
        if (isTimelineNextDateInvalid(date, nextDate.trim())) return;

        const parts: string[] = [];
        if (sessionNumber.trim()) parts.push(`رقم الجلسة: ${sessionNumber.trim()}`);
        if (judgeOrPanelName.trim()) parts.push(`القاضي/الهيئة: ${judgeOrPanelName.trim()}`);
        if (postponementReason.trim()) parts.push(`سبب التأجيل: ${postponementReason.trim()}`);
        if (nextSessionRequests.trim()) parts.push(`طلبات الجلسة القادمة: ${nextSessionRequests.trim()}`);
        if (description.trim()) parts.push(description.trim());

        const event: TimelineEvent = {
            id: createId(),
            date,
            type: isSession || cat === 'استماع لشهود المحكمة' ? 'court_session' : 'decision',
            category: cat,
            title: cat,
            description: parts.join('\n') || cat,
            nextDate: nextDate.trim() || undefined,
            sessionNumber: sessionNumber.trim() || undefined,
            judgeOrPanelName: judgeOrPanelName.trim() || undefined,
            nextSessionRequests: nextSessionRequests.trim() || undefined,
            postponementReason: needsPostponement ? postponementReason.trim() || undefined : undefined,
        };

        try {
            addTimelineEvent(caseId, event);
            onClose();
        } catch {
            onError();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                    <div className="text-white font-black text-sm">إضافة جلسة / قرار محكمة</div>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-sm font-bold">
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-white/70 text-xs mb-1">نوع الإجراء</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={category}
                            onChange={(e) => setCategory(isTrialCategory(e.target.value) ? e.target.value : '')}
                        >
                            <option value="">اختر...</option>
                            {TRIAL_EVENT_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-white/70 text-xs mb-1">تاريخ الإجراء</label>
                        <input
                            type="date"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-white/70 text-xs mb-1">رقم الجلسة</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={sessionNumber}
                            onChange={(e) => setSessionNumber(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-white/70 text-xs mb-1">اسم القاضي / الهيئة</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={judgeOrPanelName}
                            onChange={(e) => setJudgeOrPanelName(e.target.value)}
                        />
                    </div>

                    {needsPostponement ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1">سبب التأجيل</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[72px] resize-none"
                                value={postponementReason}
                                onChange={(e) => setPostponementReason(e.target.value)}
                            />
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-white/70 text-xs mb-1">طلبات الجلسة القادمة</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[72px] resize-none"
                            value={nextSessionRequests}
                            onChange={(e) => setNextSessionRequests(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-white/70 text-xs mb-1">تفاصيل إضافية</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[90px] resize-none"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-white/70 text-xs mb-1">موعد الجلسة / الإجراء القادم</label>
                        <input
                            type="date"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={nextDate}
                            onChange={(e) => setNextDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-black text-white/80"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="rounded-lg bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110"
                    >
                        حفظ
                    </button>
                </div>
            </div>
        </div>
    );
};
