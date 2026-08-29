import React from 'react';
import { ExternalLink } from '@/app/components/ui/icons/ExternalLink';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { RADAR_ICON_BTN, RADAR_TEXT_MUTED } from './radarTheme';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

type EventCardActionsProps = {
    event: UnifiedEvent;
    canOpenSource: boolean;
    canMutateCalendar: boolean;
    onEdit: (event: UnifiedEvent) => void;
    onDelete: (event: UnifiedEvent) => void;
    onOpenSource?: (event: UnifiedEvent) => void;
};

export const EventCardActions = React.memo(function EventCardActions({
    event,
    canOpenSource,
    canMutateCalendar,
    onEdit,
    onDelete,
    onOpenSource,
}: EventCardActionsProps) {
    if (!canOpenSource && !canMutateCalendar) return null;

    return (
        <div className="hami-radar-event-card__actions flex shrink-0 items-center">
            {canOpenSource ? (
                <button
                    type="button"
                    data-testid={`radar-event-open-source-${event.id}`}
                    onClick={() => onOpenSource!(event)}
                    title="فتح المصدر"
                    aria-label={`فتح المصدر الأصلي للموعد ${event.title}`}
                    className={`${RADAR_ICON_BTN} ${RADAR_TEXT_MUTED}`}
                >
                    <ExternalLink size={14} aria-hidden />
                </button>
            ) : null}
            {canMutateCalendar ? (
                <>
                    <button
                        type="button"
                        data-testid={`radar-event-edit-${event.id}`}
                        onClick={() => onEdit(event)}
                        aria-label={`تعديل الموعد ${event.title}`}
                        className={`${RADAR_ICON_BTN} ${RADAR_TEXT_MUTED}`}
                    >
                        <Pencil size={13} aria-hidden />
                    </button>
                    <button
                        type="button"
                        data-testid={`radar-event-card-delete-${event.id}`}
                        onClick={() => onDelete(event)}
                        aria-label={`حذف الموعد ${event.title}`}
                        className={`${RADAR_ICON_BTN} ${RADAR_TEXT_MUTED}`}
                    >
                        <Trash2 size={13} aria-hidden />
                    </button>
                </>
            ) : null}
        </div>
    );
});
