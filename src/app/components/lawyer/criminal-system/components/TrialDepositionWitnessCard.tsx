import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Statement } from '../criminalStore';
import type {
    TrialDeposition,
    TrialDepositionComparison,
    TrialDepositionCrossExam,
    UpdateTrialDepositionPatch,
} from '../trialDepositionsEngine';
import { createTrialDepositionId } from '../trialDepositionsEngine';
import {
    buildLinkableStatementEntries,
    linkedEntryContent,
    linkedEntryDate,
    linkedEntryGiverType,
    linkedEntryHighlights,
    linkedEntryPersonName,
    phaseLabelForEntry,
    resolveComparisonLinkedEntry,
    resolveComparisonTrialExcerpt,
    type LinkableStatementEntry,
} from '../statementLinking';
import {
    statementGiverRoleLabel,
    statementGiverRoleStyle,
    trialDepositionCardShellClass,
} from '../statementGiverDisplay';
import { StatementHighlightedContent } from './StatementHighlightedContent';

export type TrialDepositionWitnessCardProps = {
    deposition: TrialDeposition;
    investigationStatements?: Statement[];
    trialStatements?: Statement[];
    allTrialDepositions?: TrialDeposition[];
    readOnly?: boolean;
    onUpdate: (patch: UpdateTrialDepositionPatch) => void;
    onEdit?: () => void;
    onDelete?: () => void;
};

type FloatBtnState = {
    top: number;
    left: number;
    text: string;
};

type LinkPickerState = {
    trialExcerpt?: string;
};

function StatementReplica({
    phase,
    personName,
    date,
    roleLabel,
    roleStyle,
    content,
    highlights,
    compact,
    isInvestigation,
}: {
    phase: string;
    personName: string;
    date: string;
    roleLabel: string;
    roleStyle: string;
    content: string;
    highlights?: Statement['contentHighlights'];
    compact?: boolean;
    isInvestigation: boolean;
}) {
    return (
        <StatementReplicaShell isInvestigation={isInvestigation}>
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-black ${
                        isInvestigation
                            ? 'border-slate-600/50 bg-slate-800/80 text-white/65'
                            : 'border-[#E6C673]/40 bg-[#E6C673]/10 text-[#E6C673]'
                    }`}
                >
                    [{phase}]
                </span>
                <span className="text-white/90 text-xs font-black whitespace-normal break-words">{personName}</span>
                <span className="text-white/45 text-[10px] font-bold" dir="ltr">
                    {date}
                </span>
                <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-black whitespace-normal break-words ${roleStyle}`}
                >
                    {roleLabel}
                </span>
            </div>
            <div
                className={`text-white/85 whitespace-pre-wrap break-words leading-relaxed ${
                    compact ? 'text-xs line-clamp-4' : 'text-sm'
                }`}
            >
                {highlights?.length ? (
                    <StatementHighlightedContent content={content} highlights={highlights} />
                ) : (
                    content
                )}
            </div>
        </StatementReplicaShell>
    );
}

function StatementReplicaShell({
    isInvestigation,
    children,
}: {
    isInvestigation: boolean;
    children: React.ReactNode;
}) {
    return (
        <div
            className={`rounded-xl border p-3 space-y-2 ${
                isInvestigation
                    ? 'border-slate-700/60 bg-slate-900/50'
                    : 'border-[#E6C673]/35 bg-[#E6C673]/5'
            }`}
        >
            {children}
        </div>
    );
}

function LinkedStatementReplica({
    entry,
    compact,
}: {
    entry: LinkableStatementEntry;
    compact?: boolean;
}) {
    const giverType = linkedEntryGiverType(entry);
    return (
        <StatementReplica
            phase={phaseLabelForEntry(entry)}
            personName={linkedEntryPersonName(entry)}
            date={linkedEntryDate(entry)}
            roleLabel={statementGiverRoleLabel(giverType)}
            roleStyle={statementGiverRoleStyle(giverType)}
            content={linkedEntryContent(entry)}
            highlights={linkedEntryHighlights(entry)}
            compact={compact}
            isInvestigation={entry.phase === 'investigation'}
        />
    );
}

function CurrentDepositionColumn({
    deposition,
    excerpt,
}: {
    deposition: TrialDeposition;
    excerpt: string;
}) {
    const giverType = deposition.giverType ?? 'witness';
    const showHighlights = excerpt === deposition.content;
    return (
        <StatementReplica
            phase="محكمة الموضوع — الإفادة الحالية"
            personName={deposition.witnessName}
            date={deposition.date}
            roleLabel={statementGiverRoleLabel(giverType)}
            roleStyle={statementGiverRoleStyle(giverType)}
            content={excerpt}
            highlights={showHighlights ? deposition.contentHighlights : undefined}
            isInvestigation={false}
        />
    );
}

function SavedComparisonBlock({
    deposition,
    row,
    linkableEntries,
    readOnly,
    onRemove,
}: {
    deposition: TrialDeposition;
    row: TrialDepositionComparison;
    linkableEntries: LinkableStatementEntry[];
    readOnly?: boolean;
    onRemove: () => void;
}) {
    const linked = resolveComparisonLinkedEntry(row, linkableEntries);
    const trialSide = resolveComparisonTrialExcerpt(deposition, row);

    return (
        <div className="rounded-xl border border-orange-500/40 bg-slate-950/50 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-orange-200/90 text-[11px] font-black">⚖️ مقارنة مربوطة — المادة 178</span>
                {!readOnly ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="mr-auto rounded-md border border-red-500/35 px-2 py-0.5 text-[10px] font-black text-red-300/80 hover:bg-red-950/30"
                    >
                        إلغاء الربط
                    </button>
                ) : null}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CurrentDepositionColumn deposition={deposition} excerpt={trialSide} />
                {linked ? (
                    <LinkedStatementReplica entry={linked} />
                ) : row.investigationText ? (
                    <StatementReplica
                        phase="التحقيق — أرشيف قديم"
                        personName="—"
                        date="—"
                        roleLabel="—"
                        roleStyle="border-slate-600/50 text-white/55"
                        content={row.investigationText}
                        isInvestigation
                    />
                ) : (
                    <MissingLinkNotice />
                )}
            </div>
        </div>
    );
}

function MissingLinkNotice() {
    return (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-red-200/80 text-xs font-bold">
            الإفادة المربوطة غير موجودة (حُذفت أو نُقلت)
        </div>
    );
}

function CardHeaderNameRow({
    giverType,
    witnessName,
    date,
    roleLabel,
    roleStyle,
}: {
    giverType: string;
    witnessName: string;
    date: string;
    roleLabel: string;
    roleStyle: string;
}) {
    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={
                        giverType === 'witness'
                            ? 'text-violet-200 font-black text-base whitespace-normal break-words'
                            : 'text-white font-black text-sm whitespace-normal break-words'
                    }
                >
                    {witnessName}
                </span>
                <span className="text-white/45 text-xs font-bold" dir="ltr">
                    {date}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words ${roleStyle}`}
                >
                    {roleLabel}
                </span>
                <span className="rounded-full border border-[#E6C673]/35 bg-[#E6C673]/10 px-2.5 py-1 text-[10px] font-black text-[#E6C673]/90">
                    محكمة الموضوع
                </span>
            </div>
        </>
    );
}

export const TrialDepositionWitnessCard = ({
    deposition,
    investigationStatements = [],
    trialStatements = [],
    allTrialDepositions = [],
    readOnly,
    onUpdate,
    onEdit,
    onDelete,
}: TrialDepositionWitnessCardProps) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [floatBtn, setFloatBtn] = useState<FloatBtnState | null>(null);
    const [linkPicker, setLinkPicker] = useState<LinkPickerState | null>(null);
    const [newQuestion, setNewQuestion] = useState('');
    const [crossOpen, setCrossOpen] = useState(true);

    const comparisons = deposition.comparisons ?? [];
    const crossExam = deposition.crossExamination ?? [];
    const giverType = deposition.giverType ?? 'witness';
    const roleLabel = statementGiverRoleLabel(giverType);
    const roleStyle = statementGiverRoleStyle(giverType);

    const linkableEntries = useMemo(
        () =>
            buildLinkableStatementEntries({
                investigationStatements,
                trialStatements,
                trialDepositions: allTrialDepositions,
                excludeDepositionId: deposition.id,
            }),
        [allTrialDepositions, deposition.id, investigationStatements, trialStatements],
    );

    const linkedIds = useMemo(
        () =>
            new Set(
                comparisons
                    .filter((c) => c.linkedKind && c.linkedId)
                    .map((c) => `${c.linkedKind}:${c.linkedId}`),
            ),
        [comparisons],
    );

    const dismissFloat = useCallback(() => setFloatBtn(null), []);

    useEffect(() => {
        if (readOnly) return;
        const onDocMouseDown = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (!floatBtn || !target) return;
            const btn = document.getElementById(`td-compare-float-${deposition.id}`);
            if (btn?.contains(target)) return;
            if (contentRef.current?.contains(target)) return;
            dismissFloat();
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [deposition.id, dismissFloat, floatBtn, readOnly]);

    const handleContentMouseUp = () => {
        if (readOnly) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !contentRef.current) {
            setFloatBtn(null);
            return;
        }
        const anchor = sel.anchorNode;
        const focus = sel.focusNode;
        if (
            !anchor ||
            !focus ||
            !contentRef.current.contains(anchor) ||
            !contentRef.current.contains(focus)
        ) {
            setFloatBtn(null);
            return;
        }
        const text = sel.toString().trim();
        if (!text) {
            setFloatBtn(null);
            return;
        }
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setFloatBtn({
            top: Math.max(8, rect.top - 40),
            left: rect.left + rect.width / 2,
            text,
        });
    };

    const openLinkPicker = (trialExcerpt?: string) => {
        setLinkPicker({ trialExcerpt: trialExcerpt?.trim() || undefined });
        setFloatBtn(null);
        window.getSelection()?.removeAllRanges();
    };

    const saveLink = (entry: LinkableStatementEntry) => {
        const linkedKind = entry.kind === 'statement' ? 'statement' : 'trial_deposition';
        const linkedId = entry.record.id;
        const key = `${linkedKind}:${linkedId}`;
        if (linkedIds.has(key) && !linkPicker?.trialExcerpt) {
            setLinkPicker(null);
            return;
        }
        const next: TrialDepositionComparison = {
            id: createTrialDepositionId(),
            trialExcerpt: linkPicker?.trialExcerpt,
            linkedKind,
            linkedId,
        };
        onUpdate({ comparisons: [...comparisons, next] });
        setLinkPicker(null);
    };

    const removeComparison = (comparisonId: string) => {
        onUpdate({ comparisons: comparisons.filter((c) => c.id !== comparisonId) });
    };

    const patchCrossExam = (questionId: string, patch: Partial<TrialDepositionCrossExam>) => {
        const next = crossExam.map((q) => (q.id === questionId ? { ...q, ...patch } : q));
        onUpdate({ crossExamination: next });
    };

    const addCrossQuestion = () => {
        const q = newQuestion.trim();
        if (!q) return;
        onUpdate({
            crossExamination: [
                ...crossExam,
                { id: createTrialDepositionId(), question: q, isAsked: false },
            ],
        });
        setNewQuestion('');
    };

    const removeCrossQuestion = (questionId: string) => {
        onUpdate({ crossExamination: crossExam.filter((q) => q.id !== questionId) });
    };

    const pickerEntries = useMemo(() => {
        const name = deposition.witnessName.trim().toLowerCase();
        const same = name
            ? linkableEntries.filter((e) => linkedEntryPersonName(e).toLowerCase() === name)
            : [];
        const sameIds = new Set(same.map((e) => `${e.kind}:${e.record.id}`));
        const rest = linkableEntries.filter((e) => !sameIds.has(`${e.kind}:${e.record.id}`));
        return [...same, ...rest];
    }, [deposition.witnessName, linkableEntries]);

    const showCrossExam = giverType === 'witness' || giverType === 'defendant';
    const crossExamTitle =
        giverType === 'defendant' ? '🎯 استجواب المشكو منه' : '🎯 خطة استجواب ومناقشة الشاهد';
    const liveResponsePlaceholder =
        giverType === 'defendant' ? 'الإجابة الحية للمشكو منه...' : 'الإجابة الحية للشاهد...';

    return (
        <div className={trialDepositionCardShellClass(giverType)}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                    <CardHeaderNameRow
                        giverType={giverType}
                        witnessName={deposition.witnessName}
                        date={deposition.date}
                        roleLabel={roleLabel}
                        roleStyle={roleStyle}
                    />
                </div>
                {!readOnly ? (
                    <div className="flex flex-wrap gap-2 shrink-0">
                        {onEdit ? (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="rounded-lg border border-slate-600/60 px-2.5 py-1 text-[10px] font-black text-white/70 hover:text-[#E6C673]"
                            >
                                تعديل
                            </button>
                        ) : null}
                        {onDelete ? (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="rounded-lg border border-red-500/35 px-2.5 py-1 text-[10px] font-black text-red-300/80 hover:bg-red-950/30"
                            >
                                حذف
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {giverType === 'witness' && deposition.witnessDetails?.trim() ? (
                <div className="text-violet-200/90 text-xs font-bold whitespace-normal break-words">
                    {deposition.witnessDetails.trim()}
                </div>
            ) : null}

            <div className="relative">
                <div
                    ref={contentRef}
                    role="presentation"
                    onMouseUp={handleContentMouseUp}
                    className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-3 text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed select-text cursor-text"
                >
                    <StatementHighlightedContent
                        content={deposition.content}
                        highlights={deposition.contentHighlights}
                    />
                </div>

                {floatBtn && !readOnly ? (
                    <button
                        id={`td-compare-float-${deposition.id}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openLinkPicker(floatBtn.text)}
                        style={{
                            position: 'fixed',
                            top: floatBtn.top,
                            left: floatBtn.left,
                            transform: 'translateX(-50%)',
                            zIndex: 240,
                        }}
                        className="rounded-full border border-orange-500/50 bg-orange-950/90 px-3 py-1.5 text-[10px] font-black text-orange-100 shadow-lg shadow-black/40 hover:bg-orange-900/90 transition whitespace-nowrap"
                    >
                        🔗 ربط مقطع بإفادة
                    </button>
                ) : null}
            </div>

            {!readOnly && linkableEntries.length > 0 ? (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => openLinkPicker()}
                        className="rounded-lg border border-orange-500/45 bg-orange-950/30 px-3 py-1.5 text-[10px] font-black text-orange-100 hover:bg-orange-900/40 transition"
                    >
                        🔗 ربط إفادة
                    </button>
                </div>
            ) : null}

            {linkPicker && !readOnly ? (
                <div className="rounded-xl border border-orange-500/45 bg-slate-950/60 p-3 space-y-3">
                    <div className="text-orange-200/90 text-[11px] font-black">
                        {linkPicker.trialExcerpt
                            ? 'اختر الإفادة المراد ربط المقطع بها'
                            : 'اختر إفادة موجودة للمقارنة'}
                    </div>
                    {linkPicker.trialExcerpt ? (
                        <div className="rounded-lg border border-[#E6C673]/35 bg-[#E6C673]/5 px-3 py-2 text-xs text-white/85 whitespace-pre-wrap break-words">
                            <span className="text-[#E6C673]/90 font-black text-[10px] block mb-1">المقطع المحدّد:</span>
                            {linkPicker.trialExcerpt}
                        </div>
                    ) : null}
                    {pickerEntries.length === 0 ? (
                        <p className="text-white/40 text-[10px] font-bold">لا توجد إفادات أخرى مسجّلة للربط.</p>
                    ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto overscroll-contain">
                            {pickerEntries.map((entry) => {
                                const key = `${entry.kind}:${entry.record.id}`;
                                const alreadyLinked = linkedIds.has(key) && !linkPicker.trialExcerpt;
                                return (
                                    <div
                                        key={key}
                                        className="rounded-xl border border-slate-700/55 bg-slate-900/45 p-3 space-y-2"
                                    >
                                        <LinkedStatementReplica entry={entry} compact />
                                        <button
                                            type="button"
                                            disabled={alreadyLinked}
                                            onClick={() => saveLink(entry)}
                                            className="rounded-md border border-orange-500/40 px-2.5 py-1 text-[10px] font-black text-orange-100 hover:bg-orange-950/30 transition disabled:opacity-40 disabled:pointer-events-none"
                                        >
                                            {alreadyLinked ? 'مربوطة مسبقاً' : '🔗 ربط للمقارنة'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setLinkPicker(null)}
                            className="rounded-lg border border-slate-600/60 px-3 py-1.5 text-[10px] font-black text-white/60"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            ) : null}

            {comparisons.length > 0 ? (
                <div className="space-y-3">
                    {comparisons.map((row) => (
                        <SavedComparisonBlock
                            key={row.id}
                            deposition={deposition}
                            row={row}
                            linkableEntries={linkableEntries}
                            readOnly={readOnly}
                            onRemove={() => removeComparison(row.id)}
                        />
                    ))}
                </div>
            ) : null}

            {showCrossExam ? (
            <details
                open={crossOpen}
                onToggle={(e) => setCrossOpen(e.currentTarget.open)}
                className="rounded-xl border border-slate-700/60 bg-slate-900/35 overflow-hidden"
            >
                <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-2 bg-slate-800/45 border-b border-slate-700/40 [&::-webkit-details-marker]:hidden">
                    <span className="text-white font-black text-sm">{crossExamTitle}</span>
                    <span className="text-white/40 text-[10px] font-bold">{crossExam.length} سؤال</span>
                </summary>
                <div className="p-4 space-y-3">
                    {crossExam.map((q) => (
                        <div
                            key={q.id}
                            className={`rounded-xl border border-slate-700/55 bg-slate-950/40 p-3 space-y-2 transition ${
                                q.isAsked ? 'opacity-50' : ''
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                <label className="flex items-center gap-2 shrink-0 pt-0.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-[#E6C673]"
                                        checked={q.isAsked}
                                        disabled={readOnly}
                                        onChange={(e) => patchCrossExam(q.id, { isAsked: e.target.checked })}
                                    />
                                    <span className="text-[10px] font-black text-white/55">تم الطرح</span>
                                </label>
                                <p
                                    className={`flex-1 text-sm font-bold text-white/90 whitespace-normal break-words ${
                                        q.isAsked ? 'line-through decoration-white/25' : ''
                                    }`}
                                >
                                    {q.question}
                                </p>
                                {!readOnly ? (
                                    <button
                                        type="button"
                                        onClick={() => removeCrossQuestion(q.id)}
                                        className="text-[10px] font-bold text-red-300/70 hover:text-red-200 shrink-0"
                                    >
                                        ✕
                                    </button>
                                ) : null}
                            </div>
                            <input
                                type="text"
                                disabled={readOnly}
                                placeholder={liveResponsePlaceholder}
                                value={q.liveResponse ?? ''}
                                onChange={(e) => patchCrossExam(q.id, { liveResponse: e.target.value })}
                                className={`w-full rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-sm text-white/85 outline-none focus:border-[#E6C673]/45 ${
                                    q.isAsked ? 'italic text-white/75' : ''
                                }`}
                            />
                        </div>
                    ))}

                    {!readOnly ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                            <input
                                type="text"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addCrossQuestion();
                                    }
                                }}
                                placeholder="صياغة سؤال تكتيكي..."
                                className="flex-1 min-w-[180px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/45"
                            />
                            <button
                                type="button"
                                onClick={addCrossQuestion}
                                className="rounded-xl border border-[#E6C673]/45 bg-[#E6C673]/12 px-3 py-2 text-[11px] font-black text-[#E6C673]"
                            >
                                ➕ إضافة سؤال تكتيكي
                            </button>
                        </div>
                    ) : crossExam.length === 0 ? (
                        <p className="text-white/40 text-xs font-bold text-center py-2">لا توجد أسئلة مسجّلة.</p>
                    ) : null}
                </div>
            </details>
            ) : null}
        </div>
    );
};
