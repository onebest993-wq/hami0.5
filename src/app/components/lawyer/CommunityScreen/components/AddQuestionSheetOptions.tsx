import { EyeOff } from '@/app/components/ui/icons/EyeOff';
import { Zap } from '@/app/components/ui/icons/Zap';
import {
    URGENT_CONSULTATION_BADGE,
    URGENT_CONSULTATION_HINT,
    URGENT_CONSULTATION_LABEL,
} from '../forumUrgentConsultation';
import {
    FORUM_OPTION_ROW,
    FORUM_OPTION_ROW_ACTIVE,
    FORUM_OPTION_ROW_IDLE,
    FORUM_OPTION_ROW_URGENT_ACTIVE,
} from '../forumPlumTheme';
import { ForumToggleSwitch } from './ForumToggleSwitch';

type AddQuestionSheetOptionsProps = {
    newIsUrgent: boolean;
    onNewIsUrgentChange: (value: boolean) => void;
    newIsAnonymous: boolean;
    onNewIsAnonymousChange: (value: boolean) => void;
};

export function AddQuestionSheetOptions({
    newIsUrgent,
    onNewIsUrgentChange,
    newIsAnonymous,
    onNewIsAnonymousChange,
}: AddQuestionSheetOptionsProps) {
    return (
        <div className="mb-5 space-y-3">
            <button
                type="button"
                onClick={() => onNewIsUrgentChange(!newIsUrgent)}
                className={`${FORUM_OPTION_ROW} justify-between ${
                    newIsUrgent ? FORUM_OPTION_ROW_URGENT_ACTIVE : FORUM_OPTION_ROW_IDLE
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            newIsUrgent
                                ? 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/25'
                                : 'bg-white/5 text-amber-300/70 ring-1 ring-white/10'
                        }`}
                    >
                        <Zap size={16} fill={newIsUrgent ? 'currentColor' : 'none'} />
                    </div>
                    <div className="min-w-0 text-right">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold">{URGENT_CONSULTATION_LABEL}</span>
                            <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black tracking-wide text-amber-200">
                                {URGENT_CONSULTATION_BADGE}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/45">
                                24س
                            </span>
                        </div>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-white/45">
                            {URGENT_CONSULTATION_HINT}
                        </p>
                    </div>
                </div>
                <ForumToggleSwitch on={newIsUrgent} tone="amber" />
            </button>

            <button
                type="button"
                onClick={() => onNewIsAnonymousChange(!newIsAnonymous)}
                className={`${FORUM_OPTION_ROW} justify-between ${
                    newIsAnonymous ? FORUM_OPTION_ROW_ACTIVE : FORUM_OPTION_ROW_IDLE
                }`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${newIsAnonymous ? 'bg-[#E6C673]/18 text-[#E6C673]' : 'bg-white/5 text-[#9AA3B2]'}`}>
                        <EyeOff size={16} />
                    </div>
                    <span className="text-sm font-bold">نشر بهوية مخفية</span>
                </div>
                <ForumToggleSwitch on={newIsAnonymous} />
            </button>
        </div>
    );
}
