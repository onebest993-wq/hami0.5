import React from 'react';
import { RADAR_FORM_INPUT, RADAR_FORM_LABEL } from './radarTheme';
import type { EventFormData } from './eventFormModel';
import { EventFormTimeField } from './EventFormTimeField';

type EventFormFieldsProps = {
    titleInputId: string;
    dateInputId: string;
    timeInputId: string;
    locationInputId: string;
    notesInputId: string;
    localFormData: EventFormData;
    setLocalFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
    openNativePicker: (target: HTMLInputElement) => void;
};

export const EventFormFields = React.memo(function EventFormFields({
    titleInputId,
    dateInputId,
    timeInputId,
    locationInputId,
    notesInputId,
    localFormData,
    setLocalFormData,
    openNativePicker,
}: EventFormFieldsProps) {
    return (
        <>
            <div>
                <label htmlFor={titleInputId} className={RADAR_FORM_LABEL}>العنوان *</label>
                <input
                    id={titleInputId}
                    data-testid="radar-event-title"
                    value={localFormData.title}
                    maxLength={160}
                    enterKeyHint="next"
                    autoComplete="off"
                    autoCorrect="off"
                    onChange={(e) =>
                        setLocalFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className={RADAR_FORM_INPUT}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor={dateInputId} className={RADAR_FORM_LABEL}>التاريخ *</label>
                    <input
                        id={dateInputId}
                        data-testid="radar-event-date"
                        type="date"
                        value={localFormData.date}
                        onChange={(e) =>
                            setLocalFormData((prev) => ({ ...prev, date: e.target.value }))
                        }
                        onFocus={(e) => openNativePicker(e.currentTarget)}
                        className={RADAR_FORM_INPUT}
                    />
                </div>
                <EventFormTimeField
                    timeInputId={timeInputId}
                    localFormData={localFormData}
                    setLocalFormData={setLocalFormData}
                    openNativePicker={openNativePicker}
                />
            </div>

            <div>
                <label htmlFor={locationInputId} className={RADAR_FORM_LABEL}>الموقع</label>
                <input
                    id={locationInputId}
                    data-testid="radar-event-location"
                    value={localFormData.location}
                    maxLength={160}
                    enterKeyHint="next"
                    autoComplete="off"
                    onChange={(e) =>
                        setLocalFormData((prev) => ({ ...prev, location: e.target.value }))
                    }
                    className={RADAR_FORM_INPUT}
                />
            </div>

            <div>
                <label htmlFor={notesInputId} className={RADAR_FORM_LABEL}>ملاحظات</label>
                <textarea
                    id={notesInputId}
                    data-testid="radar-event-notes"
                    value={localFormData.notes}
                    maxLength={600}
                    onChange={(e) =>
                        setLocalFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    rows={3}
                    className={`${RADAR_FORM_INPUT} resize-none min-h-[96px]`}
                />
            </div>
        </>
    );
});
