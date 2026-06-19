import React from 'react';
import type { Decision } from '../types';
import type { DecisionsDispatcherHubProps } from '../engine/decisionsEngineTypes';

export type DecisionCardExecutorPanelProps = {
    decision: Decision;
    dispatcherHub?: DecisionsDispatcherHubProps;
    isCassated: boolean;
    hubNoteById: Record<string, string>;
    setHubNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleExecutorResolveById: (id: string, resolution: 'approved' | 'rejected') => void;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    btnPrimaryFlex: string;
    btnSecondaryFlex: string;
    selectedAction: 'approved' | 'rejected' | null;
    setSelectedAction: (v: 'approved' | 'rejected' | null) => void;
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
    selectedAction,
    setSelectedAction,
    showReasoning,
    setShowReasoning,
}: DecisionCardExecutorPanelProps) {
                {requestNeedsExecutorOutcome(decision) && dispatcherHub && (
                    <div className="space-y-2">
                        {isCassated ? (
                            <p className="text-[10px] text-red-400/80 text-right leading-relaxed">
                                لا يمكن اتخاذ إجراء على قرار منقوض
                            </p>
                        ) : null}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                disabled={isCassated}
                                onClick={() => {
                                    if (isCassated) return;
                                    if (showReasoning && selectedAction === 'approved') {
                                        handleExecutorResolveById(decision.id, 'approved');
                                        setShowReasoning(false);
                                        setSelectedAction(null);
                                    } else if (showReasoning) {
                                        setSelectedAction('approved');
                                    } else {
                                        handleExecutorResolveById(decision.id, 'approved');
                                    }
                                }}
                                className={btnPrimaryFlex}
                                style={showReasoning && selectedAction === 'approved' ? { minWidth: 'auto' } : undefined}
                            >
                                {showReasoning && selectedAction === 'approved' ? 'إرسال مع التسبيب' : 'موافقة'}
                            </button>
                            <button
                                type="button"
                                disabled={isCassated}
                                onClick={() => {
                                    if (isCassated) return;
                                    if (showReasoning && selectedAction === 'rejected') {
                                        handleExecutorResolveById(decision.id, 'rejected');
                                        setShowReasoning(false);
                                        setSelectedAction(null);
                                    } else if (showReasoning) {
                                        setSelectedAction('rejected');
                                    } else {
                                        handleExecutorResolveById(decision.id, 'rejected');
                                    }
                                }}
                                className={btnSecondaryFlex}
                                style={showReasoning && selectedAction === 'rejected' ? { minWidth: 'auto' } : undefined}
                            >
                                {showReasoning && selectedAction === 'rejected' ? 'إرسال مع التسبيب' : 'رفض المنفذ'}
                            </button>
                            <label
                                onClick={() => {
                                    setShowReasoning(!showReasoning);
                                    if (!showReasoning) setSelectedAction(null);
                                }}
                                className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-400 select-none shrink-0"
                            >
                                <span
                                    className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded border transition-all ${
                                        showReasoning
                                            ? 'bg-purple-500/30 border-purple-400'
                                            : 'border-white/20 bg-transparent'
                                    }`}
                                >
                                    {showReasoning && (
                                        <svg className="w-2.5 h-2.5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </span>
                                تسبيب
                            </label>
                        </div>
                        <div
                            className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                selectedAction ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                            }`}
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
                                    className="w-full min-h-[60px] max-h-[20vh] resize-y rounded-lg border border-white/10 bg-slate-950/40 p-2 text-right text-[11px] text-gray-100 outline-none focus:border-purple-500/40 transition-all"
                                    placeholder="نص قرار المنفذ..."
                                />
                            )}
                        </div>
                    </div>
                )}
                {requestNeedsExecutorOutcome(decision) && !dispatcherHub && (
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
                                onClick={() => {
                                    if (isCassated) return;
                                    handleExecutorResolveById(decision.id, 'approved');
                                }}
                                className={btnPrimaryFlex}
                            >
                                قبول المنفذ
                            </button>
                            <button
                                type="button"
                                disabled={isCassated}
                                onClick={() => {
                                    if (isCassated) return;
                                    handleExecutorResolveById(decision.id, 'rejected');
                                }}
                                className={btnSecondaryFlex}
                            >
                                رفض المنفذ
                            </button>
                        </div>
                    </div>
                )}
}
