import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { RADAR_FORM_ICON_BTN } from './radarTheme';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

type EventFormHeaderProps = {
    formTitleId: string;
    editingEvent: UnifiedEvent | null;
    saving: boolean;
    onClose: () => void;
};

export const EventFormHeader = React.memo(function EventFormHeader({
    formTitleId,
    editingEvent,
    saving,
    onClose,
}: EventFormHeaderProps) {
    return (
        <div className="hami-radar-form-head">
            <h2 id={formTitleId} className="hami-radar-form-title">
                {editingEvent ? 'تعديل الموعد' : 'إضافة موعد جديد'}
            </h2>
            <button
                type="button"
                data-testid="radar-event-form-close"
                aria-label="إغلاق نموذج الموعد"
                onClick={() => {
                    if (!saving) onClose();
                }}
                className={RADAR_FORM_ICON_BTN}
            >
                <X size={20} />
            </button>
        </div>
    );
});
