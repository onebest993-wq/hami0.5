import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import {
    computeTaklifDeadlineYmd,
    daysRemainingUntilDeadline,
    isAssignmentDeadlinePassed,
} from '@/app/utils/employeeSummonsAssignment';
import type { EmployeeSummonsAssignmentState } from '@/app/types/execution';
import { EmployeeAssignmentCoerciveFollowupBlock } from '@/app/components/lawyer/execution/EmployeeAssignmentCoerciveFollowupBlock';
import { SummonsInlineDateField } from '@/app/components/lawyer/execution/SummonsInlineDateField';

export interface SummonsHubTaklifPanelProps {
    employeeAssignmentFeature?: {
        enabled: boolean;
        state: EmployeeSummonsAssignmentState | null | undefined;
        onConfirm: (p: { purpose: string; notifyDate: string; durationDays: number }) => void;
        onAttend: () => void;
        onDeclareAbsent: () => void;
        onTerminate: () => void;
        onRequestInvestigation: () => void;
        onRegisterArrestOrder: () => void;
        onRequestForcedBring: () => void;
        forcedBringPending?: boolean;
        forcedBringApprovedAwaitingOutcome?: boolean;
        forcedBringRejected?: boolean;
        onWarrantDebtorBrought: () => void;
        onWarrantTerminate: () => void;
    };
    empPhase: EmployeeSummonsAssignmentState['phase'];
    empAssign: EmployeeSummonsAssignmentState | null | undefined;
    empEffectiveDeadlineYmd: string;
    taklifPurpose: string;
    setTaklifPurpose: (v: string) => void;
    taklifDate: string;
    setTaklifDate: (v: string) => void;
    taklifDurationDays: number;
    setTaklifDurationDays: React.Dispatch<React.SetStateAction<number>>;
    taklifFormError: string;
    dateError: string;
    hubMainTab: 'tabligh' | 'taklif' | 'nashr' | 'guarantor';
    summonsTodayYmdMax: string;
    handleTaklifConfirm: () => void;
    onClose: () => void;
    validateDate: (inputDate: string) => { ok: boolean; error?: string };
}

export const SummonsHubTaklifPanel: React.FC<SummonsHubTaklifPanelProps> = ({
    employeeAssignmentFeature,
    empPhase,
    empAssign,
    empEffectiveDeadlineYmd,
    taklifPurpose,
    setTaklifPurpose,
    taklifDate,
    setTaklifDate,
    taklifDurationDays,
    setTaklifDurationDays,
    taklifFormError,
    dateError,
    hubMainTab,
    summonsTodayYmdMax,
    handleTaklifConfirm,
    onClose,
    validateDate,
}) => (
    (employeeAssignmentFeature && employeeAssignmentFeature.enabled ? (
    <motion.div
        key="taklif"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
    >
        {empPhase === 'none' && (
            <>
        <div>
            <label
                htmlFor="execution-taklif-purpose"
                className="block text-gray-300 text-sm font-semibold mb-2 text-right"
            >
                        الغاية من التكليف
            </label>
            <textarea
                        id="execution-taklif-purpose"
                        value={taklifPurpose}
                        onChange={(e) => setTaklifPurpose(e.target.value)}
                        className="w-full bg-slate-800/50 border border-amber-500/25 rounded-xl px-4 py-2.5 text-white text-right resize-none"
                rows={3}
            />
        </div>
                <SummonsInlineDateField
                    id="execution-taklif-notice-date"
                    label="تاريخ التبليغ بالتكليف"
                    value={taklifDate}
                    max={summonsTodayYmdMax}
                    accent="amber"
                    onChange={setTaklifDate}
                />
                <div className="rounded-xl border border-slate-600/40 bg-slate-900/40 p-3">
                    <p className="text-slate-300 text-xs font-semibold mb-2 text-right">
                        مدة التكليف (بالأيام)
                    </p>
                    <div className="flex flex-row-reverse items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={() =>
                                setTaklifDurationDays((d) => Math.min(30, Math.max(1, d + 1)))
                            }
                            className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold text-lg hover:bg-slate-600"
                        >
                            +
                        </button>
                        <span className="min-w-[2.5rem] text-center text-xl font-black tabular-nums text-white">
                            {taklifDurationDays}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setTaklifDurationDays((d) => Math.max(1, d - 1))
                            }
                            className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold text-lg hover:bg-slate-600"
                        >
                            −
                        </button>
                    </div>
                </div>
                {(() => {
                    const ymd = String(taklifDate || '').trim();
                    if (!ymd) return null;
                    if (!validateDate(ymd).ok) return null;
                    const expiry = computeTaklifDeadlineYmd(ymd, taklifDurationDays);
                    return (
                        <p className="text-sky-200/90 text-[11px] font-semibold text-right">
                            المهلة تنتهي بتاريخ: <span className="font-mono">{expiry}</span>
                        </p>
                    );
                })()}
                {(taklifFormError || dateError) && hubMainTab === 'taklif' ? (
                    <p className="text-red-400 text-xs text-right">
                        {taklifFormError || dateError}
                    </p>
                ) : null}
                <button
                    type="button"
                    onClick={handleTaklifConfirm}
                    className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold py-3 rounded-xl"
                >
                    تأكيد التكليف بالحضور
                </button>
            </>
        )}

        {empPhase === 'active' && (
            <>
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 p-3 text-right space-y-1">
                    <p className="text-cyan-100 text-xs font-bold">
                        تكليف سارٍ
                        {empEffectiveDeadlineYmd ? (
                            <>
                                {' '}
                                — حتى{' '}
                                <span className="font-mono tabular-nums">
                                    {empEffectiveDeadlineYmd}
                                </span>
                            </>
                        ) : null}
                    </p>
                    {empEffectiveDeadlineYmd ? (
                        !isAssignmentDeadlinePassed(empEffectiveDeadlineYmd) ? (
                            <p className="text-cyan-200/80 text-[11px]">
                                متبقٍ تقويمياً:{' '}
                                <span className="font-mono font-bold">
                                    {daysRemainingUntilDeadline(empEffectiveDeadlineYmd)}
                                </span>{' '}
                                يوماً
                            </p>
                        ) : null
                    ) : null}
                </div>
                {empEffectiveDeadlineYmd &&
                !isAssignmentDeadlinePassed(empEffectiveDeadlineYmd) ? (
                    <button
                        type="button"
                        onClick={() => {
                            employeeAssignmentFeature.onAttend();
                            onClose();
                        }}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} />
                        تم حضور المكلف
                    </button>
                ) : empEffectiveDeadlineYmd ? (
                    <button
                        type="button"
                        onClick={() => employeeAssignmentFeature.onDeclareAbsent()}
                        className="w-full bg-gradient-to-r from-rose-700 to-rose-600 text-white font-bold py-3 rounded-xl"
                    >
                        انتهاء مدة التكليف
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => {
                        employeeAssignmentFeature.onTerminate();
                        onClose();
                    }}
                    className="w-full border border-slate-500/50 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
                >
                    إنهاء التكليف
                </button>
            </>
        )}

        {empAssign &&
            (empPhase === 'absent_declared' ||
                empPhase === 'investigation_pending' ||
                empPhase === 'warrant_ui') && (
                <>
                    <EmployeeAssignmentCoerciveFollowupBlock
                        assignment={empAssign}
                        onRequestInvestigation={() =>
                            employeeAssignmentFeature.onRequestInvestigation()
                        }
                        onRegisterArrestOrder={() =>
                            employeeAssignmentFeature.onRegisterArrestOrder()
                        }
                        onRequestForcedBring={() =>
                            employeeAssignmentFeature.onRequestForcedBring()
                        }
                        forcedBringPending={
                            employeeAssignmentFeature.forcedBringPending ?? false
                        }
                        forcedBringApprovedAwaitingOutcome={
                            employeeAssignmentFeature.forcedBringApprovedAwaitingOutcome ??
                            false
                        }
                        forcedBringRejected={
                            employeeAssignmentFeature.forcedBringRejected ?? false
                        }
                        onWarrantDebtorBrought={() =>
                            employeeAssignmentFeature.onWarrantDebtorBrought()
                        }
                        onWarrantTerminate={() =>
                            employeeAssignmentFeature.onWarrantTerminate()
                        }
                        onTerminateAssignment={() =>
                            employeeAssignmentFeature.onTerminate()
                        }
                    />
                    {empPhase === 'investigation_pending' ? (
        <button
                            type="button"
                            onClick={() => {
                                employeeAssignmentFeature.onTerminate();
                                onClose();
                            }}
                            className="w-full border border-slate-500/50 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
        >
                            إنهاء التكليف
        </button>
                    ) : null}
                </>
            )}
    </motion.div>
    ) : (
    <motion.div
        key="taklif"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
    >
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-right" dir="rtl">
            <p className="text-white text-sm font-bold">التكليف بالحضور</p>
            <p className="mt-1 text-[11px] text-slate-400">غير متاح لهذه الإضبارة حالياً.</p>
        </div>
    </motion.div>
    ))
);
