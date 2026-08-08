import { Clock } from '@/app/components/ui/lucideIcons';
import type { CaseStage } from '../../../LawyerShared';
import { shouldShowFirstInstancePleadingLockUi } from '../../smartFile/stageInit';
import {
    daysRemainingUntil,
    resolveAbsentObjectionDeadline,
    shouldShowAbsentJudgmentFooter,
} from '../../smartFile/absentJudgmentFlow';
import { resolveStageCassationDeadline } from '../../smartFile/appealDeadlineEngine';
import { isAppealStageName } from '../../smartFile/judgmentTypes';

export type SmartFileAppealDeadlineBannerProps = {
    displayStage: CaseStage;
    showOpponentAppealBtn: boolean;
    showAbsentJudgmentFooter: boolean;
};

export function SmartFileAppealDeadlineBanner({
    displayStage,
    showOpponentAppealBtn,
    showAbsentJudgmentFooter,
}: SmartFileAppealDeadlineBannerProps) {
    if (!shouldShowFirstInstancePleadingLockUi(displayStage) || showOpponentAppealBtn || showAbsentJudgmentFooter) {
        return null;
    }

    const absentGhayabi = shouldShowAbsentJudgmentFooter(displayStage);
    const isAppealStage = isAppealStageName(displayStage?.stageName);
    const objectionDeadline = absentGhayabi
        ? resolveAbsentObjectionDeadline(displayStage)
        : isAppealStage
          ? null
          : displayStage?.appealDeadline;
    const cassationDeadline = resolveStageCassationDeadline(displayStage);
    const decisionDate = String(displayStage?.decisionDate ?? '').trim().slice(0, 10);

    if (!objectionDeadline && !cassationDeadline) return null;

    const primaryDeadline = objectionDeadline ?? cassationDeadline;
    if (!primaryDeadline) return null;

    const today = new Date();
    const daysRemaining = daysRemainingUntil(primaryDeadline, today);

    let cardStyles = '';
    let statusText = '';

    if (daysRemaining > 5) {
        cardStyles = 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200/90';
        statusText = `متبقي ${daysRemaining} يوم`;
    } else if (daysRemaining >= 0) {
        cardStyles = 'border-amber-500/30 bg-amber-500/[0.08] text-amber-200/90';
        statusText = `متبقي ${daysRemaining} يوم`;
    } else {
        cardStyles = 'border-rose-500/25 bg-rose-500/[0.06] text-rose-200/90';
        statusText = 'انتهت المدة القانونية';
    }

    const headline = absentGhayabi
        ? 'مهلة الاعتراض على الحكم الغيابي'
        : isAppealStage
          ? 'مهلة التمييز'
          : 'مهلة الطعن';

    return (
        <div
            className={`w-full rounded-xl border backdrop-blur-xl px-3.5 py-3 mb-4 flex flex-wrap justify-between items-center gap-3 transition-all ${cardStyles}`}
            dir="rtl"
        >
            <div className="flex flex-col min-w-0 text-right">
                <h3 className="font-bold text-sm flex items-center gap-2">
                    <Clock size={18} className="shrink-0 opacity-80" />
                    {headline}
                </h3>
                {decisionDate ? (
                    <p className="text-[11px] opacity-70 mt-1 tabular-nums">
                        تاريخ صدور القرار: {decisionDate}
                    </p>
                ) : null}
                {objectionDeadline ? (
                    <p className="text-[11px] opacity-70 tabular-nums">
                        {absentGhayabi ? 'آخر مهلة للاعتراض (10 أيام من التبليغ): ' : 'آخر مهلة للاستئناف: '}
                        {objectionDeadline}
                    </p>
                ) : null}
                {cassationDeadline && !absentGhayabi ? (
                    <p className="text-[11px] opacity-70 tabular-nums">
                        آخر مهلة للتمييز (شهر من صدور القرار): {cassationDeadline}
                    </p>
                ) : null}
            </div>
            <div className="text-left bg-black/20 px-3 py-2 rounded-lg backdrop-blur-sm shrink-0">
                <span className="font-bold text-sm block tabular-nums">{statusText}</span>
            </div>
        </div>
    );
}
