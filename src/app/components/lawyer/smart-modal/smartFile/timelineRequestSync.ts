import type { TimelineEvent } from '../../LawyerShared';
import { str, type SmartFileAttachment } from './judgmentTypes';
import type { FastTrackRecord } from './proceduralTypes';
import { readFastTrackRequestType, readFastTrackSubject, readFastTrackSubmissionDate } from './fastTrackNormalize';

export function buildFastTrackTimelineEvent(
    normalized: FastTrackRecord,
    eventId: string,
): TimelineEvent {
    return {
        id: eventId,
        type: 'action',
        date: str(normalized.submissionDate),
        time: str(normalized.grievanceTime),
        title: `📋 ${str(readFastTrackRequestType(normalized))}`,
        details: `${readFastTrackSubject(normalized)}${normalized.status ? `\n\nالحالة: ${normalized.status}` : ''}`,
        isFastTrack: true,
        fastTrackStatus: normalized.status,
        isNew: true,
    };
}

export function buildAttachmentTimelineEvent(
    data: SmartFileAttachment,
    eventId: string,
): TimelineEvent {
    const depositAmount = str(data.depositAmount);
    const notificationRaw = str(data.notificationDate);

    return {
        id: eventId,
        type: 'action',
        date: str(data.submissionDate),
        title: `🔒 طلب حجز احتياطي - ${str(data.status)}`,
        details: `التوقيت: ${str(data.timing)}\nالأساس القانوني: ${str(data.legalBasis)}\nالمال المحجوز: ${str(data.attachedProperty)}\nالقيمة التقديرية: ${str(data.estimatedValue)} IQD${depositAmount && parseFloat(depositAmount) > 0 ? `\nالكفالة المودعة: ${depositAmount} IQD` : ''}\n${notificationRaw ? `\n📅 تاريخ التبليغ: ${notificationRaw}` : ''}${data.hasGrievance && data.grievanceDate ? `\n\n⚖️ تظلم مقدم في: ${str(data.grievanceDate)}` : ''}${data.grievanceOutcome ? `\nالنتيجة: ${str(data.grievanceOutcome)}` : ''}`,
        isAttachment: true,
        attachmentStatus: str(data.status),
        isNew: true,
    };
}

export function patchTimelineEvent(
    timeline: TimelineEvent[],
    eventId: string | undefined,
    next: TimelineEvent,
): TimelineEvent[] {
    if (!eventId) return timeline;
    if (!timeline.some((e) => e.id === eventId)) return timeline;
    return timeline.map((e) => (e.id === eventId ? { ...e, ...next, id: eventId, isNew: false } : e));
}

export function readLinkedTimelineEventId(record: Record<string, unknown>): string | undefined {
    const id = String(record.timelineEventId ?? '').trim();
    return id || undefined;
}

export function resolveFastTrackTimelineEventId(
    petitionId: string,
    record: Record<string, unknown> | undefined,
    timeline: TimelineEvent[],
): string {
    const linked = readLinkedTimelineEventId(record ?? {});
    if (linked) return linked;

    const suffix = String(petitionId).replace(/^fast_/, '');
    const legacy = timeline.find(
        (e) => e.isFastTrack && String(e.id).includes(suffix),
    );
    if (legacy?.id) return legacy.id;

    return `timeline_fast_${Date.now()}`;
}

export function resolveAttachmentTimelineEventId(
    attachmentId: string,
    record: Record<string, unknown> | undefined,
    timeline: TimelineEvent[],
): string {
    const linked = readLinkedTimelineEventId(record ?? {});
    if (linked) return linked;

    const suffix = String(attachmentId).replace(/^attach_/, '');
    const legacy = timeline.find(
        (e) => e.isAttachment && String(e.id).includes(suffix),
    );
    if (legacy?.id) return legacy.id;

    return `timeline_attach_${Date.now()}`;
}

export function readAttachmentSubmissionDate(data: SmartFileAttachment): string {
    const raw = String(data.submissionDate ?? '').trim();
    return raw || readFastTrackSubmissionDate(data as Record<string, unknown>);
}
