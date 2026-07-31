import type { TimelineEvent } from '@/app/types/execution';
import { insertTimelineEventWithThreadReplace } from '@/app/utils/timelineDedup';
import type {
    CustodyWardDeliveryBundle,
    CustodyWardDeliveryRecord,
    CustodyWardDeliveryStatus,
} from '@/app/types/custodyWardDelivery';

export type CustodyWardTimelineEventKind =
    | 'appointment'
    | 'received'
    | 'received_early'
    | 'not_received';

const AR_MONTHS = [
    'كانون الثاني',
    'شباط',
    'آذار',
    'نيسان',
    'أيار',
    'حزيران',
    'تموز',
    'آب',
    'أيلول',
    'تشرين الأول',
    'تشرين الثاني',
    'كانون الأول',
];

export function custodyWardKey(index: number): string {
    return `ward-${index}`;
}

export function readCustodyWardDeliveryBundle(
    data: { custodyWardDelivery?: CustodyWardDeliveryBundle } | null | undefined,
): CustodyWardDeliveryBundle | null {
    const raw = data?.custodyWardDelivery;
    if (!raw || !Array.isArray(raw.wards)) return null;
    return { wards: raw.wards };
}

export function mergeCustodyWardRecords(
    wardNames: string[],
    existing: CustodyWardDeliveryBundle | null,
): CustodyWardDeliveryRecord[] {
    const trimmed = wardNames.map((n) => String(n || '').trim()).filter(Boolean);
    const byKey = new Map(
        (existing?.wards ?? []).map((row) => [row.wardKey, row] as const),
    );
    return trimmed.map((name, index) => {
        const wardKey = custodyWardKey(index);
        const prev = byKey.get(wardKey);
        if (prev && prev.name === name) {
            return { ...prev, name, wardKey };
        }
        return {
            wardKey,
            name,
            status: 'pending' as CustodyWardDeliveryStatus,
        };
    });
}

export function isCustodyAppointmentDue(appointmentYmd: string, todayYmd: string): boolean {
    const a = String(appointmentYmd || '').trim();
    const t = String(todayYmd || '').trim();
    if (!a || !t) return false;
    return a <= t;
}

export function formatCustodyAppointmentLabelAr(ymd: string): string {
    const parts = String(ymd || '').trim().split('-');
    if (parts.length !== 3) return ymd;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!y || !m || !d) return ymd;
    const month = AR_MONTHS[m - 1] ?? String(m);
    return `${d} ${month} ${y}`;
}

export function patchCustodyWardRecord(
    bundle: CustodyWardDeliveryBundle | null,
    wardNames: string[],
    wardKey: string,
    patch: Partial<Pick<CustodyWardDeliveryRecord, 'appointmentYmd' | 'status' | 'statusAt'>>,
): CustodyWardDeliveryBundle {
    const wards = mergeCustodyWardRecords(wardNames, bundle);
    return {
        wards: wards.map((row) =>
            row.wardKey === wardKey
                ? {
                      ...row,
                      ...patch,
                      status:
                          patch.status ??
                          (patch.appointmentYmd
                              ? row.status === 'pending'
                                  ? 'scheduled'
                                  : row.status
                              : row.status),
                  }
                : row,
        ),
    };
}

export function wardHasFinalOutcome(status: CustodyWardDeliveryStatus): boolean {
    return status === 'received' || status === 'received_early';
}

/** أُغلق التسليم نهائياً — لا توسيع ولا إجراءات */
export function wardDeliveryIsClosed(status: CustodyWardDeliveryStatus): boolean {
    return wardHasFinalOutcome(status);
}

export function resetCustodyWardForNewCycle(
    row: CustodyWardDeliveryRecord,
): CustodyWardDeliveryRecord {
    return {
        ...row,
        status: 'pending',
        appointmentYmd: undefined,
        statusAt: undefined,
    };
}

export function restartCustodyWardBundleAfterMissedDelivery(
    bundle: CustodyWardDeliveryBundle,
    wardKey: string,
): CustodyWardDeliveryBundle {
    return {
        wards: bundle.wards.map((row) =>
            row.wardKey === wardKey ? resetCustodyWardForNewCycle(row) : row,
        ),
    };
}

export function custodyWardAppointmentThreadKey(wardKey: string): string {
    return `custody_ward_appt:${wardKey}`;
}

function wardTimelineMetadata(
    wardKey: string,
    kind: CustodyWardTimelineEventKind,
): Record<string, unknown> {
    const base: Record<string, unknown> = {
        wardKey,
        custodyWardEventKind: kind,
    };
    if (kind === 'appointment') {
        base.timelineThreadKey = custodyWardAppointmentThreadKey(wardKey);
    }
    return base;
}

export function custodyWardTimelineCopy(
    ward: CustodyWardDeliveryRecord,
    kind: CustodyWardTimelineEventKind,
): { title: string; description: string; eventDateYmd: string } {
    const name = ward.name;
    const appointmentLabel = ward.appointmentYmd
        ? formatCustodyAppointmentLabelAr(ward.appointmentYmd)
        : '';
    switch (kind) {
        case 'appointment':
            return {
                title: `📅 موعد تسليم المحضون: ${name}`,
                description: `ثُبّت موعد تسليم المحضون ${name} في ${appointmentLabel || '—'}.`,
                eventDateYmd: ward.appointmentYmd ?? '',
            };
        case 'received_early':
            return {
                title: `استلام مبكر — ${name}`,
                description: `سُجّل استلام المحضون ${name} خارج الدائرة أو قبل الموعد.`,
                eventDateYmd: ward.appointmentYmd ?? '',
            };
        case 'received':
            return {
                title: `تم تسليم المحضون — ${name}`,
                description: `أُنجز تسليم المحضون ${name} في الموعد.`,
                eventDateYmd: ward.appointmentYmd ?? '',
            };
        case 'not_received':
            return {
                title: `لم يُسلَّم المحضون — ${name}`,
                description: `سُجّل عدم تسليم المحضون ${name}${appointmentLabel ? ` في موعد ${appointmentLabel}` : ''}.`,
                eventDateYmd: ward.appointmentYmd ?? '',
            };
        default:
            return { title: name, description: name, eventDateYmd: ward.appointmentYmd ?? '' };
    }
}

export function buildCustodyWardTimelineEvent(
    ward: CustodyWardDeliveryRecord,
    kind: CustodyWardTimelineEventKind,
    options: { id: string; todayYmd: string; recordedAt?: string },
): TimelineEvent {
    const recordedAt = options.recordedAt ?? new Date().toISOString();
    const copy = custodyWardTimelineCopy(ward, kind);
    const ymd = copy.eventDateYmd || options.todayYmd;
    const isAppointment = kind === 'appointment';
    return {
        id: options.id,
        type: isAppointment ? 'appointment' : 'procedure',
        date: isAppointment ? `${ymd}T12:00:00` : ymd,
        timestamp: recordedAt,
        title: copy.title,
        description: copy.description,
        source: 'المحضونين — نزع حضانة',
        category: 'custody_delivery',
        metadata: wardTimelineMetadata(ward.wardKey, kind),
    } as TimelineEvent;
}

export type CommitCustodyWardTimelineActionInput = {
    ward: CustodyWardDeliveryRecord;
    kind: CustodyWardTimelineEventKind;
    bundle: CustodyWardDeliveryBundle;
    prevTimelineEvents: TimelineEvent[];
    nextTimelineId: () => string;
    todayYmd: string;
    stampEvent?: (event: TimelineEvent) => TimelineEvent;
};

export type CommitCustodyWardTimelineActionResult = {
    event: TimelineEvent;
    nextTimelineEvents: TimelineEvent[];
    persistPatch: Record<string, unknown>;
};

/** دمج حدث المحضون مع السجل وبيانات التسليم في patch واحد للحفظ الذري */
export function commitCustodyWardTimelineAction(
    input: CommitCustodyWardTimelineActionInput,
): CommitCustodyWardTimelineActionResult {
    const raw = buildCustodyWardTimelineEvent(input.ward, input.kind, {
        id: input.nextTimelineId(),
        todayYmd: input.todayYmd,
    });
    const event = input.stampEvent ? input.stampEvent(raw) : raw;
    const nextTimelineEvents = insertTimelineEventWithThreadReplace(
        input.prevTimelineEvents,
        event,
    );
    return {
        event,
        nextTimelineEvents,
        persistPatch: {
            custodyWardDelivery: input.bundle,
            timelineEvents: nextTimelineEvents,
        },
    };
}

export function custodyWardHasTimelineEvent(
    events: TimelineEvent[],
    wardKey: string,
    kind: CustodyWardTimelineEventKind,
): boolean {
    const list = Array.isArray(events) ? events : [];
    if (kind === 'appointment') {
        const threadKey = custodyWardAppointmentThreadKey(wardKey);
        return list.some(
            (event) =>
                !event.trashedAt &&
                (String(event.metadata?.timelineThreadKey ?? '') === threadKey ||
                    (String(event.metadata?.wardKey ?? '') === wardKey &&
                        String(event.metadata?.custodyWardEventKind ?? '') === 'appointment')),
        );
    }
    return list.some(
        (event) =>
            !event.trashedAt &&
            String(event.metadata?.wardKey ?? '') === wardKey &&
            String(event.metadata?.custodyWardEventKind ?? '') === kind,
    );
}

function parseCustodyTimelineEventYmd(event: TimelineEvent): string {
    const raw = String(event.date ?? '').trim();
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
    return m ? m[1] : '';
}

function wardTimelineEventMs(event: TimelineEvent): number {
    const ts = Date.parse(String(event.timestamp ?? ''));
    if (Number.isFinite(ts)) return ts;
    const d = Date.parse(
        String(event.date ?? '').includes('T') ? String(event.date) : `${String(event.date ?? '')}T12:00:00`,
    );
    return Number.isFinite(d) ? d : 0;
}

function findLatestWardTimelineEvent(
    events: TimelineEvent[],
    wardKey: string,
    kind: CustodyWardTimelineEventKind,
): TimelineEvent | undefined {
    const list = Array.isArray(events) ? events : [];
    let latest: TimelineEvent | undefined;
    let latestMs = -1;
    for (const event of list) {
        if (event.trashedAt) continue;
        const meta = (event.metadata ?? {}) as Record<string, unknown>;
        const eventWardKey = String(meta.wardKey ?? '');
        const eventKind = String(meta.custodyWardEventKind ?? '');
        const matchesAppointment =
            kind === 'appointment' &&
            (eventKind === 'appointment' ||
                String(meta.timelineThreadKey ?? '') === custodyWardAppointmentThreadKey(wardKey));
        const matchesKind = eventKind === kind || matchesAppointment;
        if (!matchesKind) continue;
        if (eventWardKey && eventWardKey !== wardKey) continue;
        if (!eventWardKey && kind === 'appointment') {
            const thread = String(meta.timelineThreadKey ?? '');
            if (thread && thread !== custodyWardAppointmentThreadKey(wardKey)) continue;
        } else if (!eventWardKey && kind !== 'appointment') {
            continue;
        }
        const ms = wardTimelineEventMs(event);
        if (ms >= latestMs) {
            latestMs = ms;
            latest = event;
        }
    }
    return latest;
}

/** مزامنة بطاقة المحضون من السجل عندما تتقدّم الأحداث على بيانات الحفظ */
export function enrichCustodyWardsFromTimeline(
    wards: CustodyWardDeliveryRecord[],
    events: TimelineEvent[],
): CustodyWardDeliveryRecord[] {
    if (!wards.length) return wards;
    const outcomeKinds: CustodyWardTimelineEventKind[] = [
        'received',
        'received_early',
        'not_received',
    ];
    return wards.map((ward) => {
        let next: CustodyWardDeliveryRecord = { ...ward };
        const apptEvent = findLatestWardTimelineEvent(events, ward.wardKey, 'appointment');
        if (apptEvent) {
            const ymd = parseCustodyTimelineEventYmd(apptEvent);
            if (ymd && (!next.appointmentYmd || next.status === 'pending')) {
                next.appointmentYmd = ymd;
                if (next.status === 'pending') next.status = 'scheduled';
            }
        }
        let latestOutcome: { kind: CustodyWardTimelineEventKind; event: TimelineEvent } | null =
            null;
        for (const kind of outcomeKinds) {
            const event = findLatestWardTimelineEvent(events, ward.wardKey, kind);
            if (!event) continue;
            const ms = wardTimelineEventMs(event);
            if (!latestOutcome || ms >= wardTimelineEventMs(latestOutcome.event)) {
                latestOutcome = { kind, event };
            }
        }
        if (latestOutcome) {
            if (
                latestOutcome.kind === 'not_received' &&
                wardHasFinalOutcome(next.status)
            ) {
                return next;
            }
            next = {
                ...next,
                status: latestOutcome.kind,
                statusAt: String(latestOutcome.event.timestamp ?? next.statusAt ?? ''),
            };
        }
        return next;
    });
}

/** أحداث السجل الناقصة مقارنةً بحالة المحضونين المحفوظة */
export function buildCustodyWardTimelineBackfillSpecs(
    wards: CustodyWardDeliveryRecord[],
    events: TimelineEvent[],
): Array<{ ward: CustodyWardDeliveryRecord; kind: CustodyWardTimelineEventKind }> {
    const specs: Array<{ ward: CustodyWardDeliveryRecord; kind: CustodyWardTimelineEventKind }> =
        [];
    for (const ward of wards) {
        if (
            ward.appointmentYmd &&
            ward.status !== 'pending' &&
            !custodyWardHasTimelineEvent(events, ward.wardKey, 'appointment')
        ) {
            specs.push({ ward, kind: 'appointment' });
        }
        if (
            (ward.status === 'received' || ward.status === 'received_early') &&
            !custodyWardHasTimelineEvent(events, ward.wardKey, ward.status)
        ) {
            specs.push({ ward, kind: ward.status });
        }
    }
    return specs;
}
