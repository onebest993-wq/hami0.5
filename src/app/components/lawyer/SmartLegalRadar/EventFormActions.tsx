import React from 'react';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import {
    RADAR_FORM_BTN_DISABLED,
    RADAR_FORM_BTN_DANGER,
    RADAR_BTN_PRIMARY,
} from './radarTheme';
import type { EventFormData } from './eventFormModel';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

type EventFormActionsProps = {
    editingEvent: UnifiedEvent | null;
    saving: boolean;
    localFormData: EventFormData;
    onSave: (data: EventFormData) => void;
    onDelete: () => void;
};

export const EventFormActions = React.memo(function EventFormActions({
    editingEvent,
    saving,
    localFormData,
    onSave,
    onDelete,
}: EventFormActionsProps) {
    const canDelete =
        Boolean(editingEvent) &&
        editingEvent?.source === 'calendar' &&
        !editingEvent?.bridge?.sourceEventId?.startsWith('field_');

    return (
        <div className="hami-radar-form-actions">
            {canDelete ? (
                <button
                    type="button"
                    data-testid="radar-event-delete"
                    onClick={() => {
                        if (!saving) onDelete();
                    }}
                    disabled={saving}
                    aria-label={editingEvent ? `حذف الموعد ${editingEvent.title}` : 'حذف الموعد'}
                    className={RADAR_FORM_BTN_DANGER}
                >
                    حذف
                </button>
            ) : null}
            <button
                type="button"
                data-testid="radar-event-save"
                onClick={() => void onSave(localFormData)}
                aria-label={editingEvent ? `تحديث الموعد ${editingEvent.title}` : 'إضافة الموعد'}
                disabled={saving || !localFormData.title.trim() || !localFormData.date}
                className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium transition-colors touch-manipulation ${
                    saving || !localFormData.title.trim() || !localFormData.date
                        ? RADAR_FORM_BTN_DISABLED
                        : `${RADAR_BTN_PRIMARY} w-full`
                }`}
            >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editingEvent ? 'تحديث' : 'إضافة'}
            </button>
        </div>
    );
});
