import React from 'react';
import { motion } from 'motion/react';
import { Bot } from 'lucide-react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { RADAR_GLASS_PANEL, RADAR_ICON_ACCENT } from './radarTheme';

type RadarAiBriefingProps = {
    briefing: string;
};

export const RadarAiBriefing = React.memo(function RadarAiBriefing({ briefing }: RadarAiBriefingProps) {
    const reduceMotion = useReduceMotion();
    const body = (
        <>
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#C4956A]/12 blur-2xl rounded-full -mr-12 -mt-12 pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-[#F5EDE0]/[0.06] flex items-center justify-center shrink-0 border border-[#C4956A]/30 backdrop-blur-md">
                <Bot size={20} className={RADAR_ICON_ACCENT} />
            </div>
            <div className="flex-1">
                <h3 className="text-[#D4A87A] font-bold text-sm mb-1">ملخص المواعيد لليوم</h3>
                <p className="text-[#E8DCC8]/75 text-sm leading-relaxed">{briefing}</p>
            </div>
        </>
    );

    if (reduceMotion) {
        return (
            <div
                className={`${RADAR_GLASS_PANEL} p-4 flex gap-4 items-start relative overflow-hidden border-[#C4956A]/25`}
                data-testid="radar-ai-briefing"
            >
                {body}
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${RADAR_GLASS_PANEL} p-4 flex gap-4 items-start relative overflow-hidden border-[#C4956A]/25`}
            data-testid="radar-ai-briefing"
        >
            {body}
        </motion.div>
    );
});
