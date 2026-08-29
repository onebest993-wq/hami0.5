import React from 'react';
import type { Statement } from '../criminalStore';
import { StatementHighlightedContent } from './StatementHighlightedContent';

export type TrialDepositionFloatBtnState = {
    top: number;
    left: number;
    text: string;
};

export type TrialDepositionWitnessCardContentProps = {
    depositionId: string;
    content: string;
    contentHighlights?: Statement['contentHighlights'];
    contentRef: React.RefObject<HTMLDivElement | null>;
    floatBtn: TrialDepositionFloatBtnState | null;
    readOnly?: boolean;
    onContentMouseUp: () => void;
    onOpenLinkPicker: (trialExcerpt?: string) => void;
    showLinkButton: boolean;
};

export function TrialDepositionWitnessCardContent({
    depositionId,
    content,
    contentHighlights,
    contentRef,
    floatBtn,
    readOnly,
    onContentMouseUp,
    onOpenLinkPicker,
    showLinkButton,
}: TrialDepositionWitnessCardContentProps) {
    return (
        <>
            <div className="relative">
                <div
                    ref={contentRef}
                    role="presentation"
                    onMouseUp={onContentMouseUp}
                    className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-3 text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed select-text cursor-text"
                >
                    <StatementHighlightedContent content={content} highlights={contentHighlights} />
                </div>

                {floatBtn && !readOnly ? (
                    <button
                        id={`td-compare-float-${depositionId}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onOpenLinkPicker(floatBtn.text)}
                        style={{
                            position: 'fixed',
                            top: floatBtn.top,
                            left: floatBtn.left,
                            transform: 'translateX(-50%)',
                            zIndex: 240,
                        }}
                        className="rounded-full border border-orange-500/50 bg-orange-950/90 px-3 py-1.5 text-[10px] font-black text-orange-100 shadow-lg shadow-black/25 hover:bg-orange-900/90 transition whitespace-nowrap"
                    >
                        🔗 ربط مقطع بإفادة
                    </button>
                ) : null}
            </div>

            {!readOnly && showLinkButton ? (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => onOpenLinkPicker()}
                        className="rounded-lg border border-orange-500/45 bg-orange-950/30 px-3 py-1.5 text-[10px] font-black text-orange-100 hover:bg-orange-900/40 transition"
                    >
                        🔗 ربط إفادة
                    </button>
                </div>
            ) : null}
        </>
    );
}
