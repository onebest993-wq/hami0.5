import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { FastTrackRecord } from './proceduralTypes';

export function readFastTrackRequestType(record: Record<string, unknown>): string {
    return String(record.requestType ?? record.type ?? 'طلب مستعجل').trim();
}

export function readFastTrackSubject(record: Record<string, unknown>): string {
    return String(record.subject ?? record.reason ?? '').trim();
}

export function readFastTrackSubmissionDate(record: Record<string, unknown>): string {
    const raw = String(record.submissionDate ?? record.requestDate ?? '').trim();
    return raw || getLocalTodayYmd();
}

/** Canonical FastTrack shape for storage, timeline, and UI. */
export function normalizeFastTrackRecord(data: FastTrackRecord): FastTrackRecord {
    const requestType = readFastTrackRequestType(data);
    const subject = readFastTrackSubject(data);
    const submissionDate = readFastTrackSubmissionDate(data);

    return {
        ...data,
        requestType,
        subject,
        submissionDate,
        type: requestType,
        reason: subject,
        requestDate: submissionDate,
    };
}
