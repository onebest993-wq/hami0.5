import React from 'react';
import { motion } from 'motion/react';
import { PRE_DECISION_OUTCOME_NULLIFY } from '../constants/hearingOutcomes';
import type { LifecyclePanelProps } from './LifecyclePanelProps';
import { GrievanceLifecyclePanel } from '../panels/GrievanceLifecyclePanel';
import { CassationLifecyclePanel } from '../panels/CassationLifecyclePanel';
import { JudgeDecisionLifecyclePanel } from '../panels/JudgeDecisionLifecyclePanel';
import {
    pickCassationLifecyclePanelProps,
    pickGrievanceLifecyclePanelProps,
    pickJudgeDecisionLifecyclePanelProps,
} from '../panels/pickLifecyclePanelProps';

export type { LifecyclePanelProps } from './LifecyclePanelProps';

export function LifecyclePanel(props: LifecyclePanelProps) {
    const {
        guaranteeGateActive,
        isFinalityTerminatedRequest,
        isFinalized,
        latestOutcome,
        showCassationLifecycle,
        showGrievanceLifecycle,
    } = props;

    return (
        <>
            {guaranteeGateActive ? (
                <motion.div className="border border-amber-500/25 bg-amber-500/15 rounded-xl px-4 py-3">
                    <div className="text-white text-sm font-bold">
                        💡 قرار القاضي معلق: يرجى إيداع الكفالة الضامنة لفتح إجراءات التنفيذ والتبليغ
                    </div>
                </motion.div>
            ) : null}

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border border-white/10 rounded-2xl p-5 shadow-2xl"
            >
                <h3 className="text-white font-bold text-sm mb-5 text-center">سير الإجراءات القضائية</h3>

                <div className="space-y-4">
                    <JudgeDecisionLifecyclePanel {...pickJudgeDecisionLifecyclePanelProps(props)} />

                    {showGrievanceLifecycle ? (
                        <GrievanceLifecyclePanel {...pickGrievanceLifecyclePanelProps(props)} />
                    ) : null}

                    {showCassationLifecycle ? (
                        <CassationLifecyclePanel {...pickCassationLifecyclePanelProps(props)} />
                    ) : null}

                    {isFinalized ? (
                        <div className="space-y-3">
                            {isFinalityTerminatedRequest || latestOutcome === PRE_DECISION_OUTCOME_NULLIFY ? (
                                <div className="bg-red-900/50 text-red-200 p-4 rounded-md font-bold text-center border border-red-700">
                                    🚫 تم إبطال الطلب وغلق الإضبارة نهائياً
                                </div>
                            ) : (
                                <div className="border border-emerald-500/25 bg-emerald-500/10 rounded-xl px-4 py-4 text-emerald-100 font-extrabold text-center">
                                    ⚖️ اكتسب القرار الدرجة القطعية - تم إنهاء الإضبارة
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </motion.div>
        </>
    );
}
