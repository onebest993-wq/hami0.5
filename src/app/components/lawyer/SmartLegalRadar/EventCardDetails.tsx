import React from 'react';
import { RADAR_TEXT_MUTED } from './radarTheme';
import type { EventCardViewModel } from './eventCardViewModel';

type EventCardDetailsProps = {
    model: EventCardViewModel;
};

export const EventCardDetails = React.memo(function EventCardDetails({
    model,
}: EventCardDetailsProps) {
    return (
        <>
            {!model.isBridged && model.extraMark ? (
                <p
                    className={`truncate text-[11px] ${RADAR_TEXT_MUTED}`}
                    data-testid={`radar-event-source-${model.eventId}`}
                >
                    {model.extraMark}
                </p>
            ) : null}

            {model.court ? (
                <p
                    className={`truncate text-[11px] ${RADAR_TEXT_MUTED}`}
                    data-testid={`radar-event-court-${model.eventId}`}
                >
                    {model.court}
                </p>
            ) : null}

            {model.location ? (
                <p
                    className={`truncate text-[11px] ${RADAR_TEXT_MUTED}`}
                    data-testid={`radar-event-location-${model.eventId}`}
                >
                    {model.location}
                </p>
            ) : null}

            {model.partiesSummary ? (
                <p
                    className={`truncate text-[11px] ${RADAR_TEXT_MUTED}`}
                    data-testid={`radar-event-parties-${model.eventId}`}
                >
                    {model.partiesSummary}
                </p>
            ) : null}

            {model.isManualAppointment && model.clientName ? (
                <p
                    className={`truncate text-[11px] ${RADAR_TEXT_MUTED}`}
                    data-testid={`radar-event-client-${model.eventId}`}
                >
                    {model.clientName}
                </p>
            ) : null}

            {model.isManualAppointment && model.freeNotes ? (
                <p
                    className={`text-[11px] leading-relaxed ${RADAR_TEXT_MUTED} line-clamp-1`}
                    data-testid={`radar-event-notes-${model.eventId}`}
                >
                    {model.freeNotes}
                </p>
            ) : null}
        </>
    );
});
