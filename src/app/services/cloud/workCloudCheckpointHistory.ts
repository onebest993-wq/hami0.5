/**
 * ترحيل الشرائح وتاريخ النقاط — بلا شبكة.
 * الخادم أعمى ويقرأ أحدث صفوف مشفّرة؛ الدمج هنا بعد الفك.
 */
import type { WorkCloudCheckpointPayload } from '@/app/services/cloud/workCloudCheckpoint';

export type OmittedDossierSlices = {
    lawsuits: boolean;
    execution: boolean;
    notes: boolean;
};

export function hasOmittedDossierSlices(omitted: OmittedDossierSlices): boolean {
    return omitted.lawsuits || omitted.execution || omitted.notes;
}

export function payloadHasDossiers(payload: WorkCloudCheckpointPayload): boolean {
    return payload.lawsuits.length > 0 || payload.execution.length > 0 || payload.notes.length > 0;
}

export function carryForwardOmittedSlices(
    fresh: WorkCloudCheckpointPayload,
    previous: WorkCloudCheckpointPayload,
    omitted: OmittedDossierSlices,
): WorkCloudCheckpointPayload {
    return {
        ...fresh,
        lawsuits: omitted.lawsuits ? previous.lawsuits : fresh.lawsuits,
        execution: omitted.execution ? previous.execution : fresh.execution,
        notes: omitted.notes ? previous.notes : fresh.notes,
    };
}

export function stripCalendarFromCheckpoint(
    payload: WorkCloudCheckpointPayload,
): WorkCloudCheckpointPayload {
    return {
        ...payload,
        calendar: [],
        calendarTombstones: {},
        calendarOmittedForBudget: true,
        calendarSlicePresent: true,
    };
}

export function resolveCalendarFromHistory(
    payloads: WorkCloudCheckpointPayload[],
): Pick<WorkCloudCheckpointPayload, 'calendar' | 'calendarTombstones'> {
    for (const payload of payloads) {
        if (payload.calendarOmittedForBudget) continue;
        if (!payload.calendarSlicePresent) continue;
        return {
            calendar: payload.calendar,
            calendarTombstones: payload.calendarTombstones,
        };
    }
    for (const payload of payloads) {
        if (payload.calendar.length > 0 || Object.keys(payload.calendarTombstones).length > 0) {
            return {
                calendar: payload.calendar,
                calendarTombstones: payload.calendarTombstones,
            };
        }
    }
    return { calendar: [], calendarTombstones: {} };
}

export function composeRestorePayload(
    payloads: WorkCloudCheckpointPayload[],
): WorkCloudCheckpointPayload | null {
    const latest = payloads[0];
    if (!latest) return null;
    const calendar = resolveCalendarFromHistory(payloads);
    return {
        ...latest,
        calendar: calendar.calendar,
        calendarTombstones: calendar.calendarTombstones,
        calendarOmittedForBudget: false,
        calendarSlicePresent:
            latest.calendarSlicePresent ||
            calendar.calendar.length > 0 ||
            Object.keys(calendar.calendarTombstones).length > 0,
    };
}
