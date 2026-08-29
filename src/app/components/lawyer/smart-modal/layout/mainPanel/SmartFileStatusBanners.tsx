import { PauseCircle } from '@/app/components/ui/icons/PauseCircle';
import { Scale } from '@/app/components/ui/icons/Scale';
import type { CaseStage } from '../../../LawyerShared';
import { daysRemainingUntil } from '../../smartFile/absentJudgmentFlow';
import {
    CASE_FLOW_BANNER_SHELL,
    formatInterruptionBannerText,
    resolveAbandonmentReviewDeadline,
} from '../../smartFile/caseFlowStatusDisplay';

export type SmartFileStatusBannersProps = {
    displayStage: CaseStage;
    status: string;
    interruptionData?: Record<string, unknown> | null;
};

/** بانرات إعلامية فقط — الإجراء يُنفَّذ من التذييل (SmartFileStageFooterBar). */
export function SmartFileStatusBanners({
    displayStage,
    status,
    interruptionData,
}: SmartFileStatusBannersProps) {
    const interruptionText = formatInterruptionBannerText(interruptionData);
    const abandonmentYmd = displayStage?.abandonmentDate?.slice(0, 10);
    const abandonmentDeadline = abandonmentYmd ? resolveAbandonmentReviewDeadline(abandonmentYmd) : null;
    const abandonmentDaysLeft =
        abandonmentDeadline ? daysRemainingUntil(abandonmentDeadline) : null;

    return (
        <>
            {displayStage?.isVoided ? (
                <div
                    className={`${CASE_FLOW_BANNER_SHELL} border-white/[0.08] bg-white/[0.03] text-center`}
                    dir="rtl"
                >
                    <p className="text-sm font-bold text-white/75">تم إبطال عريضة الدعوى قانوناً</p>
                    <p className="text-xs text-white/40 mt-1">
                        بسبب تركها للمراجعة للمرة الثانية أو لمرور المدة القانونية
                    </p>
                </div>
            ) : null}

            {displayStage?.interruptionDate && !displayStage?.abandonmentDate ? (
                <div
                    className={`${CASE_FLOW_BANNER_SHELL} border-rose-500/20 bg-rose-500/[0.04]`}
                    dir="rtl"
                >
                    <div className="min-w-0 text-right w-full">
                        <p className="text-sm font-bold text-rose-200/90 flex items-center gap-2">
                            <PauseCircle size={16} className="shrink-0 text-rose-300/80" />
                            {interruptionText.headline}
                        </p>
                        {interruptionText.detail ? (
                            <p className="text-[11px] text-rose-200/55 mt-1 leading-relaxed">
                                {interruptionText.detail}
                            </p>
                        ) : null}
                        <p className="text-[10px] text-rose-200/45 mt-1.5">
                            استخدم زر التذييل لاستئناف السير وتسجيل موعد المرافعة.
                        </p>
                    </div>
                </div>
            ) : null}

            {status === 'متروكة للمراجعة' && displayStage?.abandonmentDate ? (
                <div
                    className={`${CASE_FLOW_BANNER_SHELL} border-amber-500/20 bg-amber-500/[0.04]`}
                    dir="rtl"
                >
                    <div className="min-w-0 text-right w-full">
                        <p className="text-sm font-bold text-amber-200/90">الدعوى متروكة للمراجعة</p>
                        {abandonmentDeadline ? (
                            <p className="text-[11px] text-amber-200/55 mt-1 tabular-nums">
                                مهلة التجديد: {abandonmentDeadline}
                                {abandonmentDaysLeft !== null ? (
                                    <span className="font-bold">
                                        {' '}
                                        ({abandonmentDaysLeft < 0
                                            ? 'انتهت المهلة'
                                            : `متبقي ${abandonmentDaysLeft} يوم`})
                                    </span>
                                ) : null}
                            </p>
                        ) : null}
                        <p className="text-[10px] text-amber-200/45 mt-1.5">
                            استخدم زر التذييل لفتح باب المراجعة.
                        </p>
                    </div>
                </div>
            ) : null}

            {status === 'مستأخرة' || status === 'موقوفة اتفاقياً' ? (
                <div
                    className={`${CASE_FLOW_BANNER_SHELL} border-amber-500/20 bg-amber-500/[0.04] flex-col items-start`}
                    dir="rtl"
                >
                    <span className="text-sm font-bold text-amber-200/85 flex items-center gap-2 min-w-0">
                        <PauseCircle size={16} className="shrink-0 text-amber-300/80" />
                        الدعوى مستأخرة — يجب استئناف السير قبل انتهاء المهلة القانونية
                    </span>
                    <p className="text-[10px] text-amber-200/45 mt-1.5">
                        استخدم زر التذييل لاستئناف السير.
                    </p>
                </div>
            ) : null}

            {status === 'قيد نظر طلب رد القاضي' ? (
                <div
                    className={`${CASE_FLOW_BANNER_SHELL} border-purple-500/20 bg-purple-500/[0.04] justify-center`}
                    dir="rtl"
                >
                    <span className="text-sm font-bold text-purple-200/85 flex items-center gap-2">
                        <Scale size={16} className="shrink-0 text-purple-300/80" />
                        الدعوى مجمدة: قيد نظر طلب رد القاضي أو نقل الدعوى
                    </span>
                </div>
            ) : null}
        </>
    );
}
