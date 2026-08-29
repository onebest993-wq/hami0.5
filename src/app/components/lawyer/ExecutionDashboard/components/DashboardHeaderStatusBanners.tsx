import { motion } from '@/app/motion/overlayMotionRuntime';
import type { ElementType } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

export function DashboardHeaderStatusBanners({
    statuteStatus,
    isAlimonyClaim,
    executionPaused,
    handleResumeExecution,
    stayOfExecutionActive,
    executionData,
    handleLiftStayOfExecution,
    XCircle,
}: {
    statuteStatus: {
        daysRemaining: number;
        yearsRemaining: number;
        isCritical: boolean;
        isExpired: boolean;
    } | null;
    isAlimonyClaim: boolean;
    executionPaused: boolean;
    handleResumeExecution: () => void;
    stayOfExecutionActive: boolean;
    executionData: ExecutionFile;
    handleLiftStayOfExecution: () => void;
    XCircle: ElementType;
}) {
    return (
        <>
            {statuteStatus && statuteStatus.isExpired && !isAlimonyClaim && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mx-3 mt-2 rounded-lg border border-rose-500/35 bg-rose-950/20 p-3"
                >
                    <div className="mb-1.5 flex items-center justify-end gap-2">
                        <h3 className="text-sm font-bold text-rose-300">سقطت قوة التنفيذ</h3>
                        <XCircle size={18} className="text-rose-400" />
                    </div>
                    <p className="mb-1 text-right text-sm text-white/85">
                        مضى أكثر من 7 سنوات على آخر إجراء - الإضبارة فقدت قوتها التنفيذية
                    </p>
                    <p className="text-right text-xs text-slate-400">
                        استشر المحكمة لتحديد الخيارات القانونية المتاحة
                    </p>
                </motion.div>
            )}

            {executionPaused && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mx-3 mt-2 rounded-lg border border-amber-500/30 bg-amber-950/15 p-3"
                >
                    <p className="text-center text-sm font-bold text-amber-200/95">
                        الإضبارة موقوفة للمراجعة
                    </p>
                    <p className="mt-1.5 text-center text-xs text-slate-400">
                        تم إيقاف جميع المهل الزمنية والإجراءات الجبرية
                    </p>
                    <button
                        type="button"
                        onClick={handleResumeExecution}
                        className="mt-2.5 w-full min-h-[44px] rounded-lg border border-emerald-500/30 bg-transparent py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-950/40 touch-manipulation"
                    >
                        استئناف التنفيذ
                    </button>
                </motion.div>
            )}

            {stayOfExecutionActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="sticky top-0 z-30 mx-3 mt-2 rounded-lg border border-yellow-500/28 bg-amber-950/25 p-2.5"
                >
                    <div className="flex flex-col gap-1.5 text-right">
                        <p className="text-center text-[11px] font-bold text-yellow-200">تفاصيل الاستئخار</p>
                        {executionData?.stay_of_execution?.court_name && (
                            <p className="text-[9px] leading-snug text-slate-400">
                                {executionData.stay_of_execution.court_name}
                                {executionData.stay_of_execution.decision_number
                                    ? ` — ${executionData.stay_of_execution.decision_number}`
                                    : ''}
                                {executionData.stay_of_execution.next_hearing_date
                                    ? ` — جلسة: ${executionData.stay_of_execution.next_hearing_date}`
                                    : ''}
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={handleLiftStayOfExecution}
                            className="w-full min-h-[44px] rounded-lg border border-emerald-500/28 bg-transparent py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-950/35 touch-manipulation"
                        >
                            رفع الاستئخار
                        </button>
                    </div>
                </motion.div>
            )}
        </>
    );
}
