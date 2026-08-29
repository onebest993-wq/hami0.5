import { Pin } from '@/app/components/ui/icons/Pin';
import { Zap } from '@/app/components/ui/icons/Zap';
import {
    URGENT_CONSULTATION_BADGE,
    URGENT_CONSULTATION_LABEL,
} from '../forumUrgentConsultation';

type QuestionCardStatusBadgesProps = {
    isActiveUrgent: boolean;
    isPinned: boolean;
};

export function QuestionCardStatusBadges({ isActiveUrgent, isPinned }: QuestionCardStatusBadgesProps) {
    return (
        <>
            {isActiveUrgent ? (
                <>
                    <div className="pointer-events-none absolute inset-0 rounded-xl border border-[#C9A0A4]/25" />
                    <div className="mb-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A0A4]/30 bg-gradient-to-l from-[#3A242C]/80 to-[#2A1A20]/70 px-2.5 py-1 text-[11px] font-bold text-[#E8D0D2]">
                            <Zap size={12} fill="currentColor" />
                            {URGENT_CONSULTATION_LABEL}
                            <span className="rounded-full border border-[#C9A0A4]/30 bg-[#C9A0A4]/14 px-1.5 py-px text-[9px] font-black">
                                {URGENT_CONSULTATION_BADGE}
                            </span>
                        </span>
                    </div>
                </>
            ) : null}
            {isPinned ? (
                <div className="mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-950/40 px-2.5 py-1 text-[11px] text-amber-200">
                        <Pin size={12} /> منشور مثبت
                    </span>
                </div>
            ) : null}
        </>
    );
}
