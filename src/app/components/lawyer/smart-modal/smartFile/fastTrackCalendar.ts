import { readFastTrackRequestType } from './fastTrackNormalize';
import {
    isFastTrackGrievanceStatus,
    resolveFastTrackStatusKey,
} from './fastTrackStatus';
import type { FastTrackRecord } from './proceduralTypes';

type FastTrackCalendarAppointment = {
    date: string;
    time?: string;
    title: string;
    details?: string;
};

function readTrimmed(record: FastTrackRecord, ...keys: string[]): string {
    for (const key of keys) {
        const value = String(record[key] ?? '').trim();
        if (value) return value;
    }
    return '';
}

/**
 * Resolve calendar fields for a FastTrack petition.
 * Syncs grievance sessions, or hearing/session dates on pending/accepted records.
 * Returns null when there is nothing to sync.
 */
export function resolveFastTrackCalendarAppointment(
    record: FastTrackRecord,
): FastTrackCalendarAppointment | null {
    const requestType = readFastTrackRequestType(record);
    const statusKey = resolveFastTrackStatusKey(
        typeof record.status === 'string' ? record.status : null,
    );

    const grievanceDate = readTrimmed(record, 'grievanceDate');
    const grievanceTime = readTrimmed(record, 'grievanceTime');
    const hasGrievanceFields = Boolean(grievanceDate || grievanceTime);

    if (isFastTrackGrievanceStatus(record.status) || hasGrievanceFields) {
        if (!grievanceDate) return null;
        return {
            date: grievanceDate,
            time: grievanceTime || undefined,
            title: `جلسة تظلم — ${requestType}`,
            details: grievanceTime ? `الوقت: ${grievanceTime}` : undefined,
        };
    }

    const hearingDate = readTrimmed(record, 'hearingDate', 'sessionDate');
    if (!hearingDate) return null;

    if (statusKey !== 'pending' && statusKey !== 'accepted' && statusKey !== 'approved') {
        return null;
    }

    const hearingTime = readTrimmed(record, 'hearingTime', 'sessionTime');
    return {
        date: hearingDate,
        time: hearingTime || undefined,
        title: `جلسة — ${requestType}`,
        details: hearingTime ? `الوقت: ${hearingTime}` : undefined,
    };
}
