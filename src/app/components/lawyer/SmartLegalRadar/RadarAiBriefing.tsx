import React from 'react';
import { motion } from 'motion/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { RADAR_GLASS_PANEL, RADAR_GLASS_PANEL_BRIEFING_CONFLICT, RADAR_TEXT, RADAR_TEXT_MUTED } from './radarTheme';

type RadarAiBriefingProps = {
    briefing: string;
    /** يُلوّن الإطار عند وجود تعارض/إثقال في اليوم */
    hasConflictHint?: boolean;
};

export const RadarAiBriefing = React.memo(function RadarAiBriefing({
    briefing,
    hasConflictHint = false,
}: RadarAiBriefingProps) {
    const reduceMotion = useReduceMotion();
    const panelClass = hasConflictHint ? RADAR_GLASS_PANEL_BRIEFING_CONFLICT : RADAR_GLASS_PANEL;
    const body = (
        <div className="flex-1 min-w-0">
            <h3 className={`${RADAR_TEXT} font-bold text-sm mb-1`}>ملخص المواعيد لليوم</h3>
            <p className={`${RADAR_TEXT_MUTED} text-sm leading-relaxed`}>{briefing}</p>
        </div>
    );

    if (reduceMotion) {
        return (
            <div
                aria-live="polite"
                className={`${panelClass} p-4 relative overflow-hidden`}
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
            aria-live="polite"
            className={`${panelClass} p-4 relative overflow-hidden`}
            data-testid="radar-ai-briefing"
        >
            {body}
        </motion.div>
    );
});
