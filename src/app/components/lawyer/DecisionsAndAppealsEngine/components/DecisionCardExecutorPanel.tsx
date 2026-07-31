import React from 'react';
import type { Decision } from '../types';
import type { DecisionsDispatcherHubProps } from '../engine/decisionsEngineTypes';

import type { ExecutorResolveOptions } from '../hooks/useDecisionsAppealsExecutorResolve';

export type DecisionCardExecutorPanelProps = {
    decision: Decision;
    dispatcherHub?: DecisionsDispatcherHubProps;
    isCassated: boolean;
    hubNoteById: Record<string, string>;
    setHubNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleExecutorResolveById: (
        id: string,
        resolution: 'approved' | 'rejected',
        options?: ExecutorResolveOptions,
    ) => void;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    btnPrimaryFlex: string;
    btnSecondaryFlex: string;
    showReasoning: boolean;
    setShowReasoning: (v: boolean) => void;
};

export function DecisionCardExecutorPanel({
    decision,
    dispatcherHub,
    isCassated,
    hubNoteById,
    setHubNoteById,
    handleExecutorResolveById,
    requestNeedsExecutorOutcome,
    btnPrimaryFlex,
    btnSecondaryFlex,
    showReasoning,
    setShowReasoning,
}: DecisionCardExecutorPanelProps) {
    const resolveWithOptionalNote = (resolution: 'approved' | 'rejected') => {
        if (isCassated) return;
        const note = String(hubNoteById[decision.id] ?? '').trim();
        handleExecutorResolveById(decision.id, resolution, {
            executorNote: note,
            requireReasoning: showReasoning,
        });
        setShowReasoning(false);
    };

    return (
        <>
            {requestNeedsExecutorOutcome(decision) && dispatcherHub ? (
                <div className="space-y-2">
                    {isCassated ? (
                        <p className="text-[10px] text-red-400/80 text-right leading-relaxed">
                            لا يمكن اتخاذ إجراء على قرار منقوض
                        </p>
                    ) : null}

                    <button
                        type="button"
                        disabled={isCassated}
                        aria-pressed={showReasoning}
                        onClick={() => setShowReasoning(!showReasoning)}
                        className={`w-full min-h-[44px] rounded-xl border px-3 py-2.5 text-[11px] font-bold transition-all touch-manipulation ${
                            showReasoning
                                ? 'border-purple-400/40 bg-purple-500/15 text-purple-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                                : 'border-white/12 bg-white/[0.04] text-slate-300 hover:border-purple-400/25 hover:bg-purple-500/10 hover:text-purple-100'
                        }`}
                    >
                        {showReasoning ? 'إخفاء حقل التسبيب' : 'تسبيب المنفذ'}
                    </button>

                    <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            showReasoning ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                        aria-hidden={!showReasoning}
                    >
                        {isCassated ? (
                            <p className="w-full rounded-lg border border-white/10 bg-slate-950/40 p-2 text-right text-[11px] text-gray-400 leading-relaxed">
                                {hubNoteById[decision.id] ?? ''}
                            </p>
                        ) : (
                            <textarea
                                value={hubNoteById[decision.id] ?? ''}
                                onChange={(e) =>
                                    setHubNoteById((p) => ({ ...p, [decision.id]: e.target.value }))
                                }
                                className="w-full min-h-[72px] max-h-[20vh] resize-y rounded-lg border border-purple-500/25 bg-slate-950/40 p-2.5 text-right text-[11px] text-gray-100 outline-none focus:border-purple-500/45 transition-all"
                                placeholder="اكتب تسبيب قرار المنفذ هنا، ثم اختر الموافقة أو الرفض…"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            disabled={isCassated}
                            onClick={() => resolveWithOptionalNote('approved')}
                            className={btnPrimaryFlex}
                        >
                            {showReasoning ? 'موافقة مع التسبيب' : 'موافقة'}
                        </button>
                        <button
                            type="button"
                            disabled={isCassated}
                            onClick={() => resolveWithOptionalNote('rejected')}
                            className={btnSecondaryFlex}
                        >
                            {showReasoning ? 'رفض مع التسبيب' : 'رفض المنفذ'}
                        </button>
                    </div>
                </div>
            ) : null}
            {requestNeedsExecutorOutcome(decision) && !dispatcherHub ? (
                <div className="space-y-2">
                    {isCassated ? (
                        <p className="text-[10px] text-red-400/80 text-right leading-relaxed">
                            لا يمكن اتخاذ إجراء على قرار منقوض
                        </p>
                    ) : null}
                    <div className="flex flex-row-reverse flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={isCassated}
                            onClick={() => resolveWithOptionalNote('approved')}
                            className={btnPrimaryFlex}
                        >
                            قبول المنفذ
                        </button>
                        <button
                            type="button"
                            disabled={isCassated}
                            onClick={() => resolveWithOptionalNote('rejected')}
                            className={btnSecondaryFlex}
                        >
                            رفض المنفذ
                        </button>
                    </div>
                </div>
            ) : null}
        </>
    );
}
