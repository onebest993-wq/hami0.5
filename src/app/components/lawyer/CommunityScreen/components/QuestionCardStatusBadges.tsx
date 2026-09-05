import { Pin } from '@/app/components/ui/icons/Pin';
import { Zap } from '@/app/components/ui/icons/Zap';
import {
    URGENT_CONSULTATION_BADGE,
    URGENT_CONSULTATION_LABEL,
} from '@/app/services/forum/forumUrgentConsultation';

type QuestionCardStatusBadgesProps = {
    isActiveUrgent: boolean;
    isPinned: boolean;
};

export function QuestionCardStatusBadges({ isActiveUrgent, isPinned }: QuestionCardStatusBadgesProps) {
    return (
        <>
            {isActiveUrgent ? (
                <div className="mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#C9A0A4]/30 bg-[#3A242C]/70 px-2 py-0.5 text-[10px] font-bold text-[#E8D0D2]">
                        <Zap size={11} fill="currentColor" />
                        {URGENT_CONSULTATION_LABEL}
                        <span className="rounded-full border border-[#C9A0A4]/30 bg-[#C9A0A4]/14 px-1.5 py-px text-[9px] font-black">
                            {URGENT_CONSULTATION_BADGE}
                        </span>
                    </span>
                </div>
            ) : null}
            {isPinned ? (
                <div className="mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-950/40 px-2 py-0.5 text-[10px] text-amber-200">
                        <Pin size={12} /> منشور مثبت
                    </span>
                </div>
            ) : null}
        </>
    );
}
