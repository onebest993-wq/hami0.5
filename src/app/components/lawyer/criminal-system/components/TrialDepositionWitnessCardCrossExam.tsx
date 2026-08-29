import React from 'react';
import type { TrialDepositionCrossExam } from '../trialDepositionsEngine';

export type TrialDepositionWitnessCardCrossExamProps = {
    crossExamTitle: string;
    crossExam: TrialDepositionCrossExam[];
    crossOpen: boolean;
    onToggleOpen: (open: boolean) => void;
    liveResponsePlaceholder: string;
    readOnly?: boolean;
    newQuestion: string;
    onNewQuestionChange: (value: string) => void;
    onPatchCrossExam: (questionId: string, patch: Partial<TrialDepositionCrossExam>) => void;
    onRemoveCrossQuestion: (questionId: string) => void;
    onAddCrossQuestion: () => void;
};

export function TrialDepositionWitnessCardCrossExam({
    crossExamTitle,
    crossExam,
    crossOpen,
    onToggleOpen,
    liveResponsePlaceholder,
    readOnly,
    newQuestion,
    onNewQuestionChange,
    onPatchCrossExam,
    onRemoveCrossQuestion,
    onAddCrossQuestion,
}: TrialDepositionWitnessCardCrossExamProps) {
    return (
        <details
            open={crossOpen}
            onToggle={(e) => onToggleOpen(e.currentTarget.open)}
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
                                    onChange={(e) => onPatchCrossExam(q.id, { isAsked: e.target.checked })}
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
                                    onClick={() => onRemoveCrossQuestion(q.id)}
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
                            onChange={(e) => onPatchCrossExam(q.id, { liveResponse: e.target.value })}
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
                            onChange={(e) => onNewQuestionChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddCrossQuestion();
                                }
                            }}
                            placeholder="صياغة سؤال تكتيكي..."
                            className="flex-1 min-w-[180px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/45"
                        />
                        <button
                            type="button"
                            onClick={onAddCrossQuestion}
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
    );
}
