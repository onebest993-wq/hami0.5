import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CriminalComplainant, CriminalDefendant, StatementHighlightColor } from '../../criminalStore';
import type { AddTrialDepositionInput, TrialDeposition, TrialDepositionGiverType } from '../../trialDepositionsEngine';
import type { TrialSession } from '../../trialSessionsEngine';
import { todayIsoDate } from '../../trialSessionsEngine';
import { isPartyDeceased } from '../../partyContextFilter';
import { StatementHighlightedContent } from '../StatementHighlightedContent';
import {
    sanitizeContentHighlights,
    STATEMENT_HIGHLIGHT_COLORS,
} from '../../statementContentHighlights';
import { STATEMENT_GIVER_TYPE_OPTIONS } from './CriminalStatementModal';

type PersonOption = CriminalComplainant | CriminalDefendant;

function isJuvenileParty(p: PersonOption): boolean {
    return p.isJuvenile === true;
}

function formatPartyOptionLabel(p: PersonOption): string {
    const name = String(p.fullName ?? '').trim() || '—';
    return isJuvenileParty(p) ? `${name} — حدث` : name;
}

function resolveGiverNameLabel(giverType: TrialDepositionGiverType | '', isJuvenilePartySelected = false): string {
    if (giverType === 'complainant') {
        return isJuvenilePartySelected ? 'المشتكي (حدث)' : 'المشتكي';
    }
    if (giverType === 'defendant') {
        return isJuvenilePartySelected ? 'المتهم (حدث)' : 'المتهم';
    }
    if (giverType === 'witness') return 'الشاهد';
    if (giverType === 'informant') return 'المخبر';
    return 'المُدلي';
}

function giverTypeOptionLabel(
    value: TrialDepositionGiverType,
    defendants: PersonOption[],
    complainants: PersonOption[],
): string {
    const base = STATEMENT_GIVER_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
    if (value === 'defendant' && defendants.some((d) => d.isJuvenile === true)) {
        return `${base} — حدث`;
    }
    if (value === 'complainant' && complainants.some((c) => c.isJuvenile === true)) {
        return `${base} — حدث`;
    }
    return base;
}

export type TrialDepositionModalProps = {
    isOpen: boolean;
    initialDeposition: TrialDeposition | null;
    sessions: TrialSession[];
    complainants: PersonOption[];
    defendants: PersonOption[];
    onClose: () => void;
    onCreate: (input: AddTrialDepositionInput) => void;
    onUpdate: (depositionId: string, patch: Partial<TrialDeposition>) => void;
    onError: (message: string) => void;
};

export const TrialDepositionModal = ({
    isOpen,
    initialDeposition,
    sessions,
    complainants,
    defendants,
    onClose,
    onCreate,
    onUpdate,
    onError,
}: TrialDepositionModalProps) => {
    const editingId = initialDeposition?.id ?? null;
    const contentRef = useRef<HTMLTextAreaElement>(null);

    const [date, setDate] = useState('');
    const [giverType, setGiverType] = useState<TrialDepositionGiverType | ''>('');
    const [partyId, setPartyId] = useState('');
    const [personName, setPersonName] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [content, setContent] = useState('');
    const [contentHighlights, setContentHighlights] = useState<TrialDeposition['contentHighlights']>([]);
    const [highlightHint, setHighlightHint] = useState('');

    const isWitnessGiver = giverType === 'witness';
    const isPartyPickerGiver = giverType === 'complainant' || giverType === 'defendant';

    const partyOptionsForGiver = useMemo(() => {
        if (giverType === 'complainant') {
            return complainants.filter((c) => !isPartyDeceased(c));
        }
        if (giverType === 'defendant') {
            return defendants.filter((d) => !isPartyDeceased(d));
        }
        return [];
    }, [complainants, defendants, giverType]);

    const singlePartyOption =
        isPartyPickerGiver && !editingId && partyOptionsForGiver.length === 1
            ? partyOptionsForGiver[0]
            : null;

    const selectedParty = useMemo(() => {
        if (!partyId) return undefined;
        return partyOptionsForGiver.find((p) => p.id === partyId);
    }, [partyId, partyOptionsForGiver]);

    const giverNameLabel = resolveGiverNameLabel(
        giverType,
        selectedParty ? isJuvenileParty(selectedParty) : singlePartyOption ? isJuvenileParty(singlePartyOption) : false,
    );

    useEffect(() => {
        if (!isOpen || editingId || !isPartyPickerGiver) return;
        if (partyOptionsForGiver.length === 1) {
            setPartyId(partyOptionsForGiver[0]!.id);
            return;
        }
        if (partyId && !partyOptionsForGiver.some((p) => p.id === partyId)) {
            setPartyId('');
        }
    }, [isOpen, editingId, isPartyPickerGiver, partyOptionsForGiver, giverType, partyId]);

    useEffect(() => {
        if (!isOpen) return;
        if (initialDeposition) {
            const c = String(initialDeposition.content ?? '').trim();
            setDate(String(initialDeposition.date ?? '').trim());
            setGiverType(initialDeposition.giverType ?? 'witness');
            setPartyId('');
            setPersonName(String(initialDeposition.witnessName ?? '').trim());
            setSessionId(String(initialDeposition.sessionId ?? '').trim());
            setContent(c);
            setContentHighlights(sanitizeContentHighlights(initialDeposition.contentHighlights, c.length));
            return;
        }
        setDate(todayIsoDate());
        setGiverType('witness');
        setPartyId('');
        setPersonName('');
        setSessionId('');
        setContent('');
        setContentHighlights([]);
    }, [initialDeposition, isOpen]);

    const applyHighlight = (color: StatementHighlightColor) => {
        const el = contentRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (end <= start) {
            setHighlightHint('حدّد كلمة أو سطراً في نص الإفادة أولاً.');
            return;
        }
        const next = sanitizeContentHighlights(
            [...(contentHighlights ?? []), { start, end, color }],
            content.length,
        );
        setContentHighlights(next);
        setHighlightHint('✓ تم تمييز المقطع.');
        setTimeout(() => setHighlightHint(''), 2500);
    };

    const resolvedPersonName = useMemo(() => {
        if (editingId) return personName.trim();
        if (isPartyPickerGiver && partyId) {
            return (
                partyOptionsForGiver.find((p) => p.id === partyId)?.fullName ??
                complainants.find((c) => c.id === partyId)?.fullName ??
                defendants.find((d) => d.id === partyId)?.fullName ??
                ''
            ).trim();
        }
        return personName.trim();
    }, [
        complainants,
        defendants,
        editingId,
        isPartyPickerGiver,
        partyId,
        partyOptionsForGiver,
        personName,
    ]);

    const canSave = useMemo(() => {
        if (!date.trim() || !giverType || !content.trim()) return false;
        return Boolean(resolvedPersonName);
    }, [content, date, giverType, resolvedPersonName]);

    const handleSave = () => {
        if (!canSave || !giverType) {
            onError('أكمل صفة المُدلي واسمه وتاريخ الإفادة ونص الأقوال.');
            return;
        }
        const cleanContent = content.trim();
        const highlights = sanitizeContentHighlights(contentHighlights, cleanContent.length);
        const payload: AddTrialDepositionInput = {
            date: date.trim(),
            giverType,
            witnessName: resolvedPersonName,
            witnessDetails:
                isWitnessGiver && editingId
                    ? String(initialDeposition?.witnessDetails ?? '').trim() || undefined
                    : undefined,
            sessionId: sessionId.trim() || undefined,
            content: cleanContent,
            contentHighlights: highlights.length ? highlights : undefined,
            comparisons: initialDeposition?.comparisons,
            crossExamination: initialDeposition?.crossExamination,
        };
        if (editingId) {
            onUpdate(editingId, payload);
        } else {
            onCreate(payload);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[236] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <div className="text-white font-black text-sm">
                        {editingId ? 'تعديل إفادة محكمة الموضوع' : 'إضافة إلى سجل الإفادات — محكمة الموضوع'}
                    </div>
                    <button type="button" onClick={onClose} className="text-white/60 text-xs font-bold">
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-white/60 text-xs mb-1">تاريخ الإفادة</label>
                            <input
                                type="date"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-white/60 text-xs mb-1">ربط بجلسة (اختياري)</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                value={sessionId}
                                onChange={(e) => setSessionId(e.target.value)}
                            >
                                <option value="">—</option>
                                {sessions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        جلسة {s.sessionNumber} · {s.date}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-white/60 text-xs mb-1">صفة المُدلي</label>
                        <select
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                            value={giverType}
                            onChange={(e) => {
                                const v = e.target.value as TrialDepositionGiverType | '';
                                setGiverType(v);
                                setPartyId('');
                                setPersonName('');
                            }}
                        >
                            <option value="">— اختر —</option>
                            {STATEMENT_GIVER_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {giverTypeOptionLabel(opt.value, defendants, complainants)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isPartyPickerGiver && !editingId ? (
                        singlePartyOption ? (
                            <div className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2.5 flex items-center justify-between gap-2">
                                <span className="text-white/50 text-xs font-bold">{giverNameLabel}</span>
                                <span className="text-sm font-black text-white">
                                    {formatPartyOptionLabel(singlePartyOption)}
                                </span>
                            </div>
                        ) : partyOptionsForGiver.length > 1 ? (
                            <div>
                                <label className="block text-white/60 text-xs mb-1">{giverNameLabel}</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                    value={partyId}
                                    onChange={(e) => setPartyId(e.target.value)}
                                >
                                    <option value="">— اختر من الأطراف —</option>
                                    {partyOptionsForGiver.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {formatPartyOptionLabel(p)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null
                    ) : (
                        <div>
                            <label className="block text-white/60 text-xs mb-1">{giverNameLabel}</label>
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-black"
                                value={personName}
                                onChange={(e) => setPersonName(e.target.value)}
                                placeholder="الاسم"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-white/70 text-xs mb-1">نص الإفادة في المحكمة</label>
                        <textarea
                            ref={contentRef}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[140px] resize-none"
                            value={content}
                            onChange={(e) => {
                                const v = e.target.value;
                                setContent(v);
                                setContentHighlights((prev) => sanitizeContentHighlights(prev, v.length));
                            }}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-white/55 text-[10px] font-black">توضيح:</span>
                            {STATEMENT_HIGHLIGHT_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => applyHighlight(c.value)}
                                    className="rounded-lg border border-slate-600/70 bg-slate-800/80 px-2.5 py-1 text-[10px] font-black text-white/85 hover:bg-slate-700/80 transition"
                                    title={c.label}
                                >
                                    {c.label}
                                </button>
                            ))}
                            {(contentHighlights?.length ?? 0) > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setContentHighlights([])}
                                    className="rounded-lg border border-slate-600/50 px-2 py-1 text-[10px] font-bold text-white/50 hover:text-white/70"
                                >
                                    مسح التمييز
                                </button>
                            ) : null}
                        </div>
                        {highlightHint ? (
                            <p className="mt-1 text-[10px] font-bold text-[#E6C673]/90">{highlightHint}</p>
                        ) : (
                            <p className="mt-1 text-[10px] font-bold text-white/40">
                                حدّد مقطعاً في النص ثم اضغط لون التمييز.
                            </p>
                        )}
                        {content.trim() && (contentHighlights?.length ?? 0) > 0 ? (
                            <div className="mt-2 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed">
                                <StatementHighlightedContent content={content} highlights={contentHighlights} />
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/70"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="rounded-xl bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black disabled:opacity-40"
                    >
                        حفظ الإفادة
                    </button>
                </div>
            </div>
        </div>
    );
};
