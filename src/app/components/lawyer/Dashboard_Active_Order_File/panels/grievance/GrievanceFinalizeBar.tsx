import React from 'react';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';

export function GrievanceFinalizeBar(props: GrievanceLifecyclePanelProps) {
    const {
        caseData,
        clearGrievance,
        editGrievance,
        grievanceData,
        grievancePhase2FinalizeReady,
        handleGrievanceSubmit,
        isFinalized,
        setActiveLifecycleStep,
        setEditGrievance,
        showGrievanceFinalizeButton,
    } = props;

    if (!showGrievanceFinalizeButton) return null;

    return (
                                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                void clearGrievance(e);
                                                            }}
                                                            className="px-3 py-2 text-white/60 hover:text-white transition-colors font-bold"
                                                        >
                                                            إلغاء
                                                        </button>
                                                        {grievancePhase2FinalizeReady && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleGrievanceSubmit(e);
                                                                }}
                                                                disabled={isFinalized}
                                                                className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {grievanceData.outcome === 'expired'
                                                                    ? '🔒 حفظ وإنهاء الإضبارة'
                                                                    : '🔒 حفظ وإنهاء مرحلة التظلم'}
                                                            </button>
                                                        )}
                                                        {editGrievance && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditGrievance(false);
                                                                    setActiveLifecycleStep(null);
                                                                }}
                                                                className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                                            >
                                                                إغلاق
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const pending = caseData?.grievanceOutcome === 'filed' && !caseData?.grievanceDecision;
                                                                if (pending) return;
                                                                setActiveLifecycleStep(null);
                                                            }}
                                                            className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                                        >
                                                            طيّ
                                                        </button>
                                                    </div>
    );
}
