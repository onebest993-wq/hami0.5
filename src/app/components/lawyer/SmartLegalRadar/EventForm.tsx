import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EventFormData } from './eventFormModel';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import {
    RADAR_FORM_OVERLAY,
    RADAR_FORM_PANEL,
} from './radarTheme';
import { useEventFormOverlay } from './hooks/useEventFormOverlay';
import { EventFormHeader } from './EventFormHeader';
import { EventFormFields } from './EventFormFields';
import { EventFormActions } from './EventFormActions';

interface EventFormProps {
    show: boolean;
    onClose: () => void;
    formData: EventFormData;
    editingEvent: UnifiedEvent | null;
    saving: boolean;
    onSave: (data: EventFormData) => void;
    onDelete: () => void;
}

export const EventForm = React.memo(function EventForm({
    show,
    onClose,
    formData,
    editingEvent,
    saving,
    onSave,
    onDelete,
}: EventFormProps) {
    const [localFormData, setLocalFormData] = useState(formData);
    const wasOpenRef = useRef(false);
    const titleInputId = 'radar-event-title-input';
    const dateInputId = 'radar-event-date-input';
    const timeInputId = 'radar-event-time-input';
    const locationInputId = 'radar-event-location-input';
    const notesInputId = 'radar-event-notes-input';
    const formTitleId = 'radar-event-form-title';

    const overlay = useEventFormOverlay({
        show,
        saving,
        onClose,
        titleInputId,
    });

    useEffect(() => {
        if (show && !wasOpenRef.current) {
            setLocalFormData(formData);
        }
        wasOpenRef.current = show;
    }, [show, formData, editingEvent?.id]);

    if (!show) return null;

    const content = (
        <div
            className={RADAR_FORM_OVERLAY}
            data-testid="radar-event-form-overlay"
            data-keyboard-open={overlay.viewport.keyboardOpen ? '1' : '0'}
            style={overlay.viewport.style}
            onClick={() => {
                if (saving || Date.now() < (overlay.keyboardResizeGuardUntilRef.current ?? 0)) return;
                onClose();
            }}
        >
            <div
                ref={overlay.panelRef as React.Ref<HTMLDivElement>}
                role="dialog"
                aria-modal="true"
                aria-labelledby={formTitleId}
                className={RADAR_FORM_PANEL}
                data-testid="radar-event-form"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onKeyDown={overlay.onKeyDownCapture}
            >
                <EventFormHeader
                    formTitleId={formTitleId}
                    editingEvent={editingEvent}
                    saving={saving}
                    onClose={onClose}
                />

                <div ref={overlay.fieldsRef as React.Ref<HTMLDivElement>} className="hami-radar-form-fields space-y-5" dir="rtl">
                    <EventFormFields
                        titleInputId={titleInputId}
                        dateInputId={dateInputId}
                        timeInputId={timeInputId}
                        locationInputId={locationInputId}
                        notesInputId={notesInputId}
                        localFormData={localFormData}
                        setLocalFormData={setLocalFormData}
                        openNativePicker={overlay.openNativePicker}
                    />
                </div>

                <EventFormActions
                    editingEvent={editingEvent}
                    saving={saving}
                    localFormData={localFormData}
                    onSave={onSave}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return content;
    }

    return createPortal(content, document.body);
});
