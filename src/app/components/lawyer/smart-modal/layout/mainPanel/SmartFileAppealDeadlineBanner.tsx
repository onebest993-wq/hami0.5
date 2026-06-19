import { Clock } from 'lucide-react';
import type { CaseStage } from '../../../LawyerShared';
import { shouldShowFirstInstancePleadingLockUi } from '../../smartFile/stageInit';
import {
    daysRemainingUntil,
    resolveAbsentObjectionDeadline,
    shouldShowAbsentJudgmentFooter,
} from '../../smartFile/absentJudgmentFlow';

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
    const objectionDeadline = absentGhayabi
        ? resolveAbsentObjectionDeadline(displayStage)
        : displayStage?.appealDeadline;
    if (!objectionDeadline) return null;

    const today = new Date();
    const daysRemaining = daysRemainingUntil(objectionDeadline, today);

    let cardStyles = '';
    let statusText = '';

    if (daysRemaining > 5) {
        cardStyles = 'bg-emerald-900/20 border-emerald-500 text-emerald-400';
        statusText = `متبقي ${daysRemaining} يوم`;
    } else if (daysRemaining >= 0) {
        cardStyles = 'bg-amber-900/20 border-amber-500 text-amber-400 animate-pulse';
        statusText = `⚠️ تحذير: متبقي ${daysRemaining} يوم فقط!`;
    } else {
        cardStyles = 'bg-rose-900/20 border-rose-500 text-rose-500';
        statusText = 'انتهت المدة القانونية ❌';
    }

    return (
        <div
            className={`w-full p-4 rounded-xl border mb-4 flex justify-between items-center transition-all shadow-lg ${cardStyles}`}
            dir="rtl"
        >
            <div className="flex flex-col">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Clock size={20} />
                    {absentGhayabi ? '⏳ مهلة الاعتراض على الحكم الغيابي' : '⏳ المدة القانونية للطعن'}
                </h3>
                <p className="text-sm opacity-80 mt-1 font-mono">ينتهي في: {objectionDeadline}</p>
            </div>
            <div className="text-left bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                <span className="font-bold text-lg block">{statusText}</span>
            </div>
        </div>
    );
}
