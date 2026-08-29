import React from 'react';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { ClipboardList } from '@/app/components/ui/icons/ClipboardList';

export const CoerciveTabLeadBanners: React.FC<{
    coerciveUiLocked: boolean;
    effectiveEvictionModule: boolean;
    gracePeriodEnded: boolean;
    hideCoerciveGraceNoticeBanner: boolean;
    daysRemainingInGracePeriod: number;
    executionStatus: string;
    debtorAttendedVoluntarily: boolean;
    lawyerStartedPostNoticeExecution: boolean;
    registerDebtorVoluntaryAttendance: () => void;
    openExecutionSeizuresTab: () => void;
}> = ({
    coerciveUiLocked,
    effectiveEvictionModule,
    gracePeriodEnded,
    hideCoerciveGraceNoticeBanner,
    daysRemainingInGracePeriod,
    executionStatus,
    debtorAttendedVoluntarily,
    lawyerStartedPostNoticeExecution,
    registerDebtorVoluntaryAttendance,
    openExecutionSeizuresTab,
}) => (
    <>
        {coerciveUiLocked && effectiveEvictionModule && (
            <p className="text-amber-400 text-xs text-center font-semibold">موقوفة</p>
        )}
        {coerciveUiLocked && !effectiveEvictionModule && (
            <div className="bg-amber-900/40 border border-amber-500/40 rounded-2xl p-3">
                <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>
                    </svg>
                    <div className="flex-1 text-right">
                        <p className="text-amber-300 font-semibold text-sm">
                            الإضبارة موقوفة — الإجراءات الجبرية متوقفة بسبب الإيقاف أو الاستئخار.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {!gracePeriodEnded && !coerciveUiLocked && !effectiveEvictionModule && !hideCoerciveGraceNoticeBanner && (
            <div className="bg-slate-800/40 border border-amber-500/20 rounded-2xl p-3">
                <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-right">
                        <p className="text-amber-300 font-semibold text-sm mb-1.5">
                            تنبيه مهلة الإخبار
                        </p>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            يمكنك تسجيل الإجراءات من الواجهة؛ راجع وقائع الإضبارة والمهل القانونية. {(daysRemainingInGracePeriod ?? 0) > 0 ? `(باقي نحو ${daysRemainingInGracePeriod} يوماً تقويمياً على مهلة الإخبار إن وُجدت)` : ''}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {(executionStatus === 'GRACE_PERIOD' || executionStatus === 'READY_FOR_COERCIVE') &&
            !effectiveEvictionModule &&
            !debtorAttendedVoluntarily &&
            !lawyerStartedPostNoticeExecution &&
            !coerciveUiLocked && (
                <div className="flex flex-col sm:flex-row-reverse gap-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            registerDebtorVoluntaryAttendance();
                        }}
                        className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={16} />
                        تسجيل حضور المدين
                    </button>
                    {executionStatus === 'READY_FOR_COERCIVE' && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openExecutionSeizuresTab();
                            }}
                            className="flex-1 min-h-[44px] border border-rose-500/40 bg-rose-950/30 text-rose-100 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
                        >
                            <ClipboardList size={16} />
                            محضر المتابعة
                        </button>
                    )}
                </div>
            )}
    </>
);
