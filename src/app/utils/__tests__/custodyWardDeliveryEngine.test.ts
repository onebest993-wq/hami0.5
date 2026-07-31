import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import {
    buildCustodyWardTimelineBackfillSpecs,
    buildCustodyWardTimelineEvent,
    commitCustodyWardTimelineAction,
    custodyWardHasTimelineEvent,
    enrichCustodyWardsFromTimeline,
    formatCustodyAppointmentLabelAr,
    isCustodyAppointmentDue,
    mergeCustodyWardRecords,
    patchCustodyWardRecord,
    readCustodyWardDeliveryBundle,
    wardHasFinalOutcome,
    restartCustodyWardBundleAfterMissedDelivery,
} from '../custodyWardDeliveryEngine';
describe('custodyWardDeliveryEngine', () => {
    it('merges ward names with existing delivery records', () => {
        const rows = mergeCustodyWardRecords(['أحمد', 'سارة'], {
            wards: [
                {
                    wardKey: 'ward-0',
                    name: 'أحمد',
                    status: 'scheduled',
                    appointmentYmd: '2026-08-01',
                },
            ],
        });
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
            wardKey: 'ward-0',
            name: 'أحمد',
            status: 'scheduled',
            appointmentYmd: '2026-08-01',
        });
        expect(rows[1]).toMatchObject({
            wardKey: 'ward-1',
            name: 'سارة',
            status: 'pending',
        });
    });

    it('resets record when ward name changes at same index', () => {
        const rows = mergeCustodyWardRecords(['ليلى'], {
            wards: [
                {
                    wardKey: 'ward-0',
                    name: 'أحمد',
                    status: 'received',
                    appointmentYmd: '2026-08-01',
                },
            ],
        });
        expect(rows[0]).toMatchObject({
            wardKey: 'ward-0',
            name: 'ليلى',
            status: 'pending',
        });
    });

    it('detects due appointments inclusively', () => {
        expect(isCustodyAppointmentDue('2026-07-30', '2026-07-30')).toBe(true);
        expect(isCustodyAppointmentDue('2026-07-29', '2026-07-30')).toBe(true);
        expect(isCustodyAppointmentDue('2026-07-31', '2026-07-30')).toBe(false);
    });

    it('patches appointment and promotes pending to scheduled', () => {
        const next = patchCustodyWardRecord(null, ['أحمد'], 'ward-0', {
            appointmentYmd: '2026-09-10',
        });
        expect(next.wards[0]).toMatchObject({
            wardKey: 'ward-0',
            status: 'scheduled',
            appointmentYmd: '2026-09-10',
        });
    });

    it('reads bundle only when wards array exists', () => {
        expect(readCustodyWardDeliveryBundle({ custodyWardDelivery: { wards: [] } })).toEqual({
            wards: [],
        });
        expect(readCustodyWardDeliveryBundle({ custodyWardDelivery: {} as never })).toBeNull();
        expect(readCustodyWardDeliveryBundle(null)).toBeNull();
    });

    it('formats Arabic appointment labels', () => {
        expect(formatCustodyAppointmentLabelAr('2026-07-30')).toBe('30 تموز 2026');
    });

    it('identifies closed ward outcomes (delivered only)', () => {
        expect(wardHasFinalOutcome('received')).toBe(true);
        expect(wardHasFinalOutcome('received_early')).toBe(true);
        expect(wardHasFinalOutcome('not_received')).toBe(false);
        expect(wardHasFinalOutcome('scheduled')).toBe(false);
    });

    it('restarts ward cycle after missed delivery', () => {
        const bundle = {
            wards: [
                {
                    wardKey: 'ward-0',
                    name: 'أحمد',
                    status: 'not_received' as const,
                    appointmentYmd: '2026-07-31',
                    statusAt: '2026-07-31T10:00:00.000Z',
                },
            ],
        };
        const next = restartCustodyWardBundleAfterMissedDelivery(bundle, 'ward-0');
        expect(next.wards[0]).toMatchObject({
            wardKey: 'ward-0',
            name: 'أحمد',
            status: 'pending',
        });
        expect(next.wards[0].appointmentYmd).toBeUndefined();
    });

    it('builds timeline events with appointment and procedure types', () => {
        const ward = {
            wardKey: 'ward-0',
            name: 'أحمد',
            status: 'scheduled' as const,
            appointmentYmd: '2026-07-31',
        };
        const appt = buildCustodyWardTimelineEvent(ward, 'appointment', {
            id: 'tl-1',
            todayYmd: '2026-07-30',
            recordedAt: '2026-07-30T08:00:00.000Z',
        });
        expect(appt.type).toBe('appointment');
        expect(appt.date).toBe('2026-07-31T12:00:00');
        expect(appt.timestamp).toBe('2026-07-30T08:00:00.000Z');
        expect(appt.metadata?.timelineThreadKey).toBe('custody_ward_appt:ward-0');

        const delivered = buildCustodyWardTimelineEvent(
            { ...ward, status: 'received' },
            'received',
            { id: 'tl-2', todayYmd: '2026-07-30' },
        );
        expect(delivered.type).toBe('procedure');
        expect(delivered.metadata?.custodyWardEventKind).toBe('received');
    });

    it('enriches ward card from timeline when bundle is stale', () => {
        const appt = buildCustodyWardTimelineEvent(
            {
                wardKey: 'ward-0',
                name: 'أحمد',
                status: 'scheduled',
                appointmentYmd: '2026-07-31',
            },
            'appointment',
            { id: 'tl-1', todayYmd: '2026-07-30' },
        );
        const enriched = enrichCustodyWardsFromTimeline(
            [{ wardKey: 'ward-0', name: 'أحمد', status: 'pending' }],
            [appt],
        );
        expect(enriched[0]).toMatchObject({
            appointmentYmd: '2026-07-31',
            status: 'scheduled',
        });
    });

    it('commit merges bundle and timeline in one persist patch', () => {
        const ward = {
            wardKey: 'ward-0',
            name: 'أحمد',
            status: 'scheduled' as const,
            appointmentYmd: '2026-07-31',
        };
        const result = commitCustodyWardTimelineAction({
            ward,
            kind: 'received',
            bundle: { wards: [{ ...ward, status: 'received' as const }] },
            prevTimelineEvents: [],
            nextTimelineId: () => 'tl-new',
            todayYmd: '2026-07-31',
        });
        expect(result.persistPatch.custodyWardDelivery).toEqual({
            wards: [{ ...ward, status: 'received' }],
        });
        expect(result.nextTimelineEvents).toHaveLength(1);
        expect(result.nextTimelineEvents[0]?.type).toBe('procedure');
    });

    it('detects missing ward timeline events for backfill', () => {
        const wards = [
            {
                wardKey: 'ward-0',
                name: 'أحمد',
                status: 'scheduled' as const,
                appointmentYmd: '2026-07-31',
            },
            {
                wardKey: 'ward-1',
                name: 'سارة',
                status: 'received' as const,
                appointmentYmd: '2026-07-31',
            },
        ];
        const events: TimelineEvent[] = [
            buildCustodyWardTimelineEvent(wards[0], 'appointment', {
                id: 'tl-a',
                todayYmd: '2026-07-30',
            }),
        ];
        expect(custodyWardHasTimelineEvent(events, 'ward-0', 'appointment')).toBe(true);
        expect(custodyWardHasTimelineEvent(events, 'ward-1', 'appointment')).toBe(false);

        const specs = buildCustodyWardTimelineBackfillSpecs(wards, events);
        expect(specs).toEqual([
            { ward: wards[1], kind: 'appointment' },
            { ward: wards[1], kind: 'received' },
        ]);
    });
});