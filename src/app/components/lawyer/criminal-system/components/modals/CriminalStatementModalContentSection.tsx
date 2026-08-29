import type { RefObject } from 'react';
import type { Statement, StatementHighlightColor } from '../../criminalStore';
import { StatementHighlightedContent } from '../StatementHighlightedContent';
import {
    sanitizeContentHighlights,
    STATEMENT_HIGHLIGHT_COLORS,
} from '../../statementContentHighlights';

export type CriminalStatementModalContentSectionProps = {
    contentRef: RefObject<HTMLTextAreaElement | null>;
    statementContent: string;
    setStatementContent: (value: string) => void;
    setContentHighlights: (
        value:
            | Statement['contentHighlights']
            | ((prev: Statement['contentHighlights']) => Statement['contentHighlights']),
    ) => void;
    contentHighlights: Statement['contentHighlights'];
    applyHighlight: (color: StatementHighlightColor) => void;
    highlightHint: string;
    showLawyerNotes: boolean;
    statementNotes: string;
    setStatementNotes: (value: string) => void;
};

export function CriminalStatementModalContentSection({
    contentRef,
    statementContent,
    setStatementContent,
    setContentHighlights,
    contentHighlights,
    applyHighlight,
    highlightHint,
    showLawyerNotes,
    statementNotes,
    setStatementNotes,
}: CriminalStatementModalContentSectionProps) {
    return (
        <>
            <div>
                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">ملخص الإفادة / الأقوال</label>
                <textarea
                    ref={contentRef}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[140px] resize-none disabled:opacity-60"
                    value={statementContent}
                    onChange={(e) => {
                        const v = e.target.value;
                        setStatementContent(v);
                        setContentHighlights((prev) =>
                            sanitizeContentHighlights(prev, v.length),
                        );
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
                {statementContent.trim() && (contentHighlights?.length ?? 0) > 0 ? (
                    <div className="mt-2 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed">
                        <StatementHighlightedContent
                            content={statementContent}
                            highlights={contentHighlights}
                        />
                    </div>
                ) : null}
            </div>

            {showLawyerNotes ? (
                <div>
                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                        ملاحظات المحامي
                    </label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[90px] resize-none"
                        value={statementNotes}
                        onChange={(e) => setStatementNotes(e.target.value)}
                        placeholder="ملاحظات داخلية على الإفادة"
                    />
                </div>
            ) : null}
        </>
    );
}
