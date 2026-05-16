/**
 * آلة حالات تسلسلية: تبليغ المدين الكاسب لاستحصال الأتعاب والمصاريف (تخلية فقط).
 * زر «تم حضور المدين» يعيد الضبط الكامل للمسار ويوقف الإكراه المعلّق — وفق المواصفة.
 */

import React, { useEffect, useState } from 'react';
import { isGracePeriodExpired } from '@/app/utils/executionStateMachine';
import {
    EARNER_FEE_BRANCH_B_STEPS,
    type EarnerFeeSmAction,
    type EvictionEarnerFeeCollectionSM,
} from '@/app/utils/evictionEarnerFeeCollectionMachine';

export interface EvictionEarnerFeeCollectionFlowProps {
    hasInitialExecutionNotice: boolean;
    /** موافقة منفذ العدل على طلب الاستحصال من الوعاء الموحّد */
    collectionApproved: boolean;
    sm: EvictionEarnerFeeCollectionSM;
    manualGraceCalendarExtra: boolean;
    onMachineAction: (action: EarnerFeeSmAction) => void;
    /** إعادة ضبط الآلة + إيقاف الإجراءات الإكراهية المعلّقة */
    resetNotificationCycle: () => void;
}

function stepShell(
    active: boolean,
    done: boolean,
    children: React.ReactNode
): React.ReactElement {
    return (
        <div
            className={`rounded-2xl border px-3 py-3 text-right transition-opacity ${
                active
                    ? 'border-[#E6C673]/35 bg-[#0A1122]/80 opacity-100'
                    : done
                      ? 'border-emerald-500/25 bg-emerald-950/15 opacity-100'
                      : 'border-white/10 bg-[#0A1122]/40 opacity-40 pointer-events-none'
            }`}
        >
            {children}
        </div>
    );
}

export const EvictionEarnerFeeCollectionFlow = React.memo(function EvictionEarnerFeeCollectionFlow({
    hasInitialExecutionNotice,
    collectionApproved,
    sm,
    manualGraceCalendarExtra,
    onMachineAction,
    resetNotificationCycle,
}: EvictionEarnerFeeCollectionFlowProps) {
    const [b1DateDraft, setB1DateDraft] = useState('');

    useEffect(() => {
        if (!sm.b1OrdinaryNoticeDate || sm.b1PeriodComplete || sm.feeCollectionPurpose !== 'coercive') return;
        const extra = manualGraceCalendarExtra ? 1 : 0;
        if (isGracePeriodExpired(sm.b1OrdinaryNoticeDate, new Date(), extra)) {
            onMachineAction({ type: 'B1_PERIOD_DONE' });
        }
    }, [
        sm.b1OrdinaryNoticeDate,
        sm.b1PeriodComplete,
        sm.feeCollectionPurpose,
        manualGraceCalendarExtra,
        onMachineAction,
    ]);

    const step1Done = hasInitialExecutionNotice;
    const step2Active = step1Done && collectionApproved;
    const coercive = sm.feeCollectionPurpose === 'coercive';
    const ordinaryDone = sm.feeCollectionPurpose === 'ordinary';

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center sm:justify-between">
                <p className="text-[#E6C673] text-xs font-bold text-right">
                    مسار استحصال الأتعاب والمصاريف — المدين الكاسب (تخلية)
                </p>
                <button
                    type="button"
                    onClick={resetNotificationCycle}
                    className="shrink-0 w-full sm:w-auto px-4 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/35 text-emerald-100 text-xs font-bold hover:bg-emerald-900/40 transition-colors"
                >
                    تم حضور المدين
                </button>
            </div>
            <p className="text-slate-500 text-[10px] text-right leading-relaxed">
                الزر أعلاه يقطع مسار الإكراه الحالي ويعيد آلية التبليغ لحالتها الأولية (إعادة ضبط الآلة).
            </p>

            {/* الخطوة 1 */}
            {stepShell(true, step1Done, (
                <div>
                    <p className="text-white font-bold text-sm">١ — مذكرة الإخبار بالتنفيذ</p>
                    <p className="text-slate-400 text-[11px] mt-1">
                        {step1Done
                            ? 'تم تسجيل أول إخبار/تبليغ بالتنفيذ.'
                            : 'سجّل الإخبار بالتنفيذ من «التبليغ والإحضار» أولاً.'}
                    </p>
                </div>
            ))}

            {/* الخطوة 2 */}
            {stepShell(step1Done, ordinaryDone || (coercive && sm.b4WarrantLogged), (
                <div className="space-y-2">
                    <p className="text-white font-bold text-sm">٢ — استحصال الأتعاب والمصاريف</p>
                    {!collectionApproved && (
                        <p className="text-amber-200/90 text-[11px]">
                            بانتظار موافقة منفذ العدل على طلب الاستحصال من الوعاء الموحّد.
                        </p>
                    )}
                    {collectionApproved && sm.feeCollectionPurpose === 'none' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => onMachineAction({ type: 'PICK_ORDINARY' })}
                                className="py-2.5 rounded-xl border border-sky-500/35 bg-sky-950/30 text-sky-100 text-xs font-bold"
                            >
                                تبليغ عادي
                            </button>
                            <button
                                type="button"
                                onClick={() => onMachineAction({ type: 'PICK_COERCIVE' })}
                                className="py-2.5 rounded-xl border border-rose-500/35 bg-rose-950/30 text-rose-100 text-xs font-bold"
                            >
                                إحضار جبري
                            </button>
                        </div>
                    )}
                    {ordinaryDone && (
                        <p className="text-emerald-200/90 text-[11px]">
                            اخترت التبليغ العادي — لا تُتابع خطوات الإكراه في هذه الآلة حتى إجراء
                            جديد.
                        </p>
                    )}
                </div>
            ))}

            {/* فرع B — خطوات متسلسلة */}
            {coercive && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                    <p className="text-slate-400 text-[10px] font-bold text-right">
                        مسار الإحضار الجبري (متسلسل)
                    </p>

                    {/* B1 */}
                    {stepShell(
                        coercive && !sm.b1PeriodComplete,
                        sm.b1PeriodComplete,
                        <div className="space-y-2">
                            <p className="text-white text-xs font-bold">
                                {EARNER_FEE_BRANCH_B_STEPS[0].label}
                            </p>
                            {!sm.b1OrdinaryNoticeDate ? (
                                <>
                                    <input
                                        type="date"
                                        value={b1DateDraft}
                                        onChange={(e) => setB1DateDraft(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-white text-sm font-mono"
                                        style={{ direction: 'ltr', textAlign: 'right' }}
                                    />
                                    <button
                                        type="button"
                                        disabled={!/^\d{4}-\d{2}-\d{2}$/.test(b1DateDraft)}
                                        onClick={() => {
                                            onMachineAction({ type: 'SET_B1_DATE', date: b1DateDraft });
                                        }}
                                        className="w-full py-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-100 text-xs font-bold disabled:opacity-40"
                                    >
                                        تسجيل التبليغ الاعتيادي
                                    </button>
                                </>
                            ) : (
                                <p className="text-slate-300 text-[11px]">
                                    تاريخ التبليغ: {sm.b1OrdinaryNoticeDate}
                                    {!sm.b1PeriodComplete && (
                                        <span className="block text-amber-200/80 mt-1">
                                            بانتظار انتهاء المهلة القانونية دون إعادة ضبط الآلة…
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                    )}

                    {/* B2 */}
                    {stepShell(
                        sm.b1PeriodComplete && !sm.b2ForcedMemoIssued,
                        sm.b2ForcedMemoIssued,
                        <div className="space-y-2">
                            <p className="text-white text-xs font-bold">
                                {EARNER_FEE_BRANCH_B_STEPS[1].label}
                            </p>
                            {sm.b2ForcedMemoIssued ? (
                                <p className="text-emerald-200/90 text-[11px]">
                                    تم تسجيل مذكرة الإحضار الجبري.
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onMachineAction({ type: 'B2_FORCED_MEMO' })}
                                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 text-white text-xs font-bold"
                                >
                                    تنفيذ الإحضار الجبري (مذكرة إحضار)
                                </button>
                            )}
                            <label className="flex flex-row-reverse items-center gap-2 text-slate-300 text-[11px] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sm.b2DebtorEvading}
                                    onChange={(e) =>
                                        onMachineAction({ type: 'B2_EVADING', value: e.target.checked })
                                    }
                                    className="rounded border-slate-500"
                                />
                                تخفى عن الأنظار
                            </label>
                        </div>
                    )}

                    {/* B3 */}
                    {stepShell(
                        sm.b2ForcedMemoIssued && sm.b2DebtorEvading && !sm.b3ProcessedConfirmed,
                        sm.b3ProcessedConfirmed,
                        <div className="space-y-2">
                            <p className="text-white text-xs font-bold">
                                {EARNER_FEE_BRANCH_B_STEPS[2].label}
                            </p>
                            {!sm.b3InvestigationRequested ? (
                                <button
                                    type="button"
                                    onClick={() => onMachineAction({ type: 'B3_REQUEST' })}
                                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-700 to-violet-600 text-white text-xs font-bold"
                                >
                                    طلب مفاتحة محكمة التحقيق لغرض إصدار مذكرة أمر قبض
                                </button>
                            ) : (
                                <>
                                    <p className="text-slate-400 text-[10px]">تم تسجيل الطلب في السجل.</p>
                                    <button
                                        type="button"
                                        onClick={() => onMachineAction({ type: 'B3_CONFIRM_PROCESSED' })}
                                        className="w-full py-2 rounded-xl border border-amber-500/40 bg-amber-950/30 text-amber-100 text-xs font-bold"
                                    >
                                        تأكيد معالجة الطلب لدى المحكمة
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* B4 */}
                    {stepShell(
                        sm.b3ProcessedConfirmed && !sm.b4WarrantLogged,
                        sm.b4WarrantLogged,
                        <div className="space-y-2">
                            <p className="text-white text-xs font-bold">
                                {EARNER_FEE_BRANCH_B_STEPS[3].label}
                            </p>
                            <button
                                type="button"
                                onClick={() => onMachineAction({ type: 'B4_WARRANT' })}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-800 to-red-700 text-white text-xs font-bold"
                            >
                                تسجيل صدور مذكرة أمر القبض
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
