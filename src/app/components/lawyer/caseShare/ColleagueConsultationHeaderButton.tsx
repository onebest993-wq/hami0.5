import { memo } from 'react';
import { Send } from '@/app/components/ui/lucideIcons';
import { useColleagueConsultation } from './ColleagueConsultationContext';

const DEFAULT_CLASS =
    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E6C673]/[0.06] border border-[#E6C673]/25 text-[#E6C673] hover:bg-[#E6C673]/[0.12] hover:border-[#E6C673]/40 transition-all duration-200 shrink-0";

type ColleagueConsultationHeaderButtonProps = {
    className?: string;
    iconSize?: number;
    /** إخفاء النص — أيقونة فقط */
    iconOnly?: boolean;
};

/** زر مستقل في الترويسة — خارج قائمة «سير الدعوى» */
export const ColleagueConsultationHeaderButton = memo(function ColleagueConsultationHeaderButton({
    className,
    iconSize = 14,
    iconOnly = false,
}: ColleagueConsultationHeaderButtonProps) {
    const consultation = useColleagueConsultation();
    if (!consultation) return null;

    return (
        <button
            type="button"
            data-testid="colleague-consultation-trigger"
            onClick={() => consultation.openConsultation()}
            className={className ?? DEFAULT_CLASS}
            title="استشارة زميل مختار"
        >
            <Send size={iconSize} strokeWidth={1.75} className="shrink-0" />
            {!iconOnly ? (
                <span className="text-[11px] font-bold whitespace-nowrap">استشارة زميل مختار</span>
            ) : null}
        </button>
    );
});
