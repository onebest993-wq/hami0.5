import { describe, expect, it } from 'vitest';
import {
    FAST_TRACK_GRIEVANCE_STORED,
    FAST_TRACK_STATUS_STORED,
    FAST_TRACK_STATUS_UI_OPTIONS,
    isFastTrackDecidedStatus,
    resolveFastTrackStatusKey,
    storedFastTrackStatus,
} from '../fastTrackStatus';
import { resolveFastTrackCalendarAppointment } from '../fastTrackCalendar';

describe('fastTrackStatus', () => {
    it('resolves stored status strings', () => {
        expect(resolveFastTrackStatusKey(FAST_TRACK_STATUS_STORED.pending)).toBe('pending');
        expect(resolveFastTrackStatusKey(FAST_TRACK_STATUS_STORED.accepted)).toBe('accepted');
        expect(resolveFastTrackStatusKey(FAST_TRACK_STATUS_STORED.rejected)).toBe('rejected');
        expect(resolveFastTrackStatusKey(FAST_TRACK_STATUS_STORED.approved)).toBe('approved');
        expect(resolveFastTrackStatusKey(FAST_TRACK_GRIEVANCE_STORED)).toBe('grievance');
        expect(resolveFastTrackStatusKey(FAST_TRACK_STATUS_STORED.grievance)).toBe('grievance');
    });

    it('maps keys back to stored values including grievance', () => {
        expect(storedFastTrackStatus('approved')).toBe('✅ موافقة المحكمة');
        expect(storedFastTrackStatus('grievance')).toBe(FAST_TRACK_GRIEVANCE_STORED);
        expect(FAST_TRACK_STATUS_STORED.grievance).toBe(FAST_TRACK_GRIEVANCE_STORED);
    });

    it('exposes grievance in selectable UI options', () => {
        const keys = FAST_TRACK_STATUS_UI_OPTIONS.map((o) => o.key);
        expect(keys).toContain('grievance');
        const grievance = FAST_TRACK_STATUS_UI_OPTIONS.find((o) => o.key === 'grievance');
        expect(grievance?.storedValue).toBe(FAST_TRACK_GRIEVANCE_STORED);
        expect(grievance?.label).toBe('تظلم');
    });

    it('detects decided statuses for task automation', () => {
        expect(isFastTrackDecidedStatus(FAST_TRACK_STATUS_STORED.accepted)).toBe(true);
        expect(isFastTrackDecidedStatus(FAST_TRACK_STATUS_STORED.approved)).toBe(true);
        expect(isFastTrackDecidedStatus(FAST_TRACK_STATUS_STORED.pending)).toBe(false);
        expect(isFastTrackDecidedStatus(FAST_TRACK_STATUS_STORED.grievance)).toBe(false);
    });
});

describe('resolveFastTrackCalendarAppointment', () => {
    it('syncs grievance session when status or grievance fields are present', () => {
        expect(
            resolveFastTrackCalendarAppointment({
                type: 'منع سفر',
                status: FAST_TRACK_GRIEVANCE_STORED,
                grievanceDate: '2026-09-01',
                grievanceTime: '10:30',
            }),
        ).toEqual({
            date: '2026-09-01',
            time: '10:30',
            title: 'جلسة تظلم — منع سفر',
            details: 'الوقت: 10:30',
        });

        expect(
            resolveFastTrackCalendarAppointment({
                type: 'منع سفر',
                status: FAST_TRACK_STATUS_STORED.pending,
                grievanceDate: '2026-09-02',
            }),
        ).toEqual({
            date: '2026-09-02',
            title: 'جلسة تظلم — منع سفر',
            details: undefined,
        });
    });

    it('skips sync when grievance status lacks a date', () => {
        expect(
            resolveFastTrackCalendarAppointment({
                status: FAST_TRACK_GRIEVANCE_STORED,
                grievanceTime: '11:00',
            }),
        ).toBeNull();
    });

    it('syncs hearing/session date on pending or accepted petitions', () => {
        expect(
            resolveFastTrackCalendarAppointment({
                type: 'إيقاف أعمال',
                status: FAST_TRACK_STATUS_STORED.pending,
                hearingDate: '2026-10-05',
                hearingTime: '09:00',
            }),
        ).toEqual({
            date: '2026-10-05',
            time: '09:00',
            title: 'جلسة — إيقاف أعمال',
            details: 'الوقت: 09:00',
        });

        expect(
            resolveFastTrackCalendarAppointment({
                type: 'إيقاف أعمال',
                status: FAST_TRACK_STATUS_STORED.accepted,
                sessionDate: '2026-10-06',
            }),
        ).toEqual({
            date: '2026-10-06',
            title: 'جلسة — إيقاف أعمال',
            details: undefined,
        });
    });

    it('returns null when no calendar fields exist', () => {
        expect(
            resolveFastTrackCalendarAppointment({
                status: FAST_TRACK_STATUS_STORED.pending,
                type: 'منع سفر',
            }),
        ).toBeNull();
    });
});
