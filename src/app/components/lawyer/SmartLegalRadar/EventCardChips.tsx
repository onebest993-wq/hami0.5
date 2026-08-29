import React from 'react';
import { RADAR_TEXT, RADAR_TEXT_MUTED } from './radarTheme';
import type { EventCardViewModel } from './eventCardViewModel';

type EventCardChipsProps = {
    model: EventCardViewModel;
};

export const EventCardChips = React.memo(function EventCardChips({
    model,
}: EventCardChipsProps) {
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
                className="text-[10px] font-semibold text-[#E6C673]"
                data-testid={`radar-event-kind-${model.eventId}`}
            >
                {model.chipLabel}
            </span>
            {model.isBridged ? (
                <span
                    className="max-w-full truncate text-[10px] font-semibold text-[#E6C673]"
                    data-testid={`radar-event-source-${model.eventId}`}
                >
                    {model.moduleVisual.label}
                    {model.extraMark ? ` · ${model.extraMark}` : ''}
                </span>
            ) : null}
            {model.timeLabel ? (
                <span className={`font-mono text-[11px] font-semibold tabular-nums ${RADAR_TEXT}`}>{model.timeLabel}</span>
            ) : null}
            {model.isCompleted ? (
                <span className="text-[10px] font-semibold text-emerald-300/90">مكتمل</span>
            ) : null}
            {model.reminderLabel ? (
                <span
                    className={`text-[10px] font-semibold ${RADAR_TEXT_MUTED}`}
                    data-testid={`radar-event-reminder-badge-${model.eventId}`}
                >
                    {model.reminderLabel}
                </span>
            ) : null}
            {model.countdownLabel ? (
                <span
                    className="text-[10px] font-semibold text-[#E6C673]"
                    data-testid={`radar-event-legal-deadline-${model.eventId}`}
                    title={model.countdownTitle}
                >
                    {model.countdownLabel}
                </span>
            ) : null}
        </div>
    );
});
