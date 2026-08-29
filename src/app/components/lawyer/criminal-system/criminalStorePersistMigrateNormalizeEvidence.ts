/**
 * Persist migrate — evidence/timeline/log normalizers
 */
import type {
    InvestigationLog,
    OtherEvidenceItem,
    Statement,
    TimelineEvent,
} from './criminalCaseModel';
import { createCriminalId as createId } from './criminalIdUtils';
import { isCorruptTimelineEvent } from './criminalCaseTimelineUtils';
import { normalizeGuarantorDetails } from './criminalGuarantorModel';
import { sanitizeContentHighlights } from './statementContentHighlights';
import {
    isTimelineNextDateInvalid,
    normalizeTimelineCategoryForDisplay,
    resolveTimelineEventTitle,
} from './criminalStageUtils';
import { asRecord } from './criminalStorePersistMigrateUtils';

export function normalizePersistStatements(arr: unknown): Statement[] {
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => {
        if (!it || typeof it !== 'object') {
            return {
                id: createId(),
                date: new Date().toISOString().slice(0, 10),
                giverType: 'informant',
                giverName: '',
                content: String(it ?? ''),
            };
        }
        const o = asRecord(it);
        if (typeof o.date === 'string' && typeof o.giverType === 'string') {
            const giverType = o.giverType as Statement['giverType'];
            const witnessNameRaw =
                typeof o.witnessName === 'string'
                    ? String(o.witnessName).trim()
                    : giverType === 'witness'
                      ? String(o.giverName ?? '').trim()
                      : '';
            const content = String(o.content ?? '').trim();
            return {
                ...(o as unknown as Statement),
                giverType,
                content,
                witnessName: witnessNameRaw || undefined,
                witnessDetails:
                    typeof o.witnessDetails === 'string' && String(o.witnessDetails).trim()
                        ? String(o.witnessDetails).trim()
                        : undefined,
                giverName:
                    giverType === 'witness' && witnessNameRaw
                        ? witnessNameRaw
                        : String(o.giverName ?? '').trim(),
                isJudiciallyRatified: o.isJudiciallyRatified === true ? true : undefined,
                statementRecordingPlace:
                    o.statementRecordingPlace === 'investigation_officer' ||
                    o.statementRecordingPlace === 'judicial_investigator'
                        ? o.statementRecordingPlace
                        : undefined,
                contentHighlights: (() => {
                    const hl = sanitizeContentHighlights(o.contentHighlights, content.length);
                    return hl.length ? hl : undefined;
                })(),
                witnessPartySide:
                    o.witnessPartySide === 'complainant' || o.witnessPartySide === 'defendant'
                        ? o.witnessPartySide
                        : o.witnessKind === 'prosecution'
                          ? 'complainant'
                          : o.witnessKind === 'defense'
                            ? 'defendant'
                            : undefined,
                witnessPartyIds: Array.isArray(o.witnessPartyIds)
                    ? o.witnessPartyIds.map((id: unknown) => String(id).trim()).filter(Boolean)
                    : undefined,
            };
        }
        const isRatified = o.certified === true || o.isJudiciallyRatified === true;
        return {
            id: String(o.id ?? createId()),
            date: String(o.recordedAt ?? o.date ?? new Date().toISOString().slice(0, 10)),
            giverType: 'informant',
            giverName: String(o.ownerName ?? o.giverName ?? ''),
            content: String(o.text ?? o.content ?? ''),
            notes: typeof o.notes === 'string' ? o.notes : isRatified ? 'مُصدّقة' : undefined,
            isJudiciallyRatified: isRatified ? true : undefined,
        };
    });
};

export function normalizePersistTimeline(arr: unknown): TimelineEvent[] {
    if (!Array.isArray(arr)) return [];
    const mapped = arr.map((it) => {
        if (!it || typeof it !== 'object') return it as TimelineEvent;
        const o = asRecord(it);
        const legacyId = typeof o.relatedDefendantId === 'string' ? o.relatedDefendantId.trim() : '';
        const rawIds = Array.isArray(o.defendantIds) ? o.defendantIds : legacyId ? [legacyId] : [];
        const ids = Array.isArray(rawIds)
            ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
            : [];
        const rawCategory = typeof o.category === 'string' ? o.category : '';
        const category = normalizeTimelineCategoryForDisplay(rawCategory);
        const eventDate = String(o.date ?? '').trim();
        const rawNext = String(o.nextDate ?? '').trim();
        const nextDate =
            rawNext && eventDate && !isTimelineNextDateInvalid(eventDate, rawNext) ? rawNext : undefined;
        const rawTitle = String(o.title ?? '').trim();
        const rawDesc = String(o.description ?? o.details ?? '').trim();
        return {
            ...o,
            category,
            title: resolveTimelineEventTitle(category, rawTitle),
            description: rawDesc,
            nextDate,
            defendantIds: ids.length ? Array.from(new Set(ids)) : undefined,
            appealedDecision: typeof o.appealedDecision === 'string' ? o.appealedDecision : undefined,
            postponementReason:
                typeof o.postponementReason === 'string' ? o.postponementReason : undefined,
            guarantorDetails: normalizeGuarantorDetails(o.guarantorDetails),
            extensionDays: typeof o.extensionDays === 'number' ? o.extensionDays : undefined,
            socialWorkerPresent:
                typeof o.socialWorkerPresent === 'boolean' ? o.socialWorkerPresent : undefined,
            suspendedExecution: typeof o.suspendedExecution === 'boolean' ? o.suspendedExecution : undefined,
            probationYears: typeof o.probationYears === 'number' ? o.probationYears : undefined,
            transferredToStage: typeof o.transferredToStage === 'string' ? o.transferredToStage : undefined,
            notifiedDate: typeof o.notifiedDate === 'string' ? o.notifiedDate : undefined,
            notificationMethod: typeof o.notificationMethod === 'string' ? o.notificationMethod : undefined,
            summonsStatus:
                o.summonsStatus === 'served_valid' ||
                o.summonsStatus === 'not_served_invalid' ||
                o.summonsStatus === 'served_to_official'
                    ? o.summonsStatus
                    : undefined,
            summonsDate: typeof o.summonsDate === 'string' ? o.summonsDate : undefined,
            summonsDocumentRef:
                typeof o.summonsDocumentRef === 'string' ? o.summonsDocumentRef : undefined,
            targetDefendantId: (() => {
                if (o.targetDefendantId === null) return null;
                const tid = String(o.targetDefendantId ?? '').trim();
                return tid || undefined;
            })(),
        } as TimelineEvent;
    });
    return mapped.filter((ev) => !isCorruptTimelineEvent(ev));
};

export function normalizePersistInvestigationLogs(arr: unknown): InvestigationLog[] {
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => {
        if (!it || typeof it !== 'object') {
            return {
                id: createId(),
                date: new Date().toISOString().slice(0, 10),
                category: 'other',
                title: String(it ?? ''),
                details: '',
                status: 'awaiting_response',
            };
        }
        const o = asRecord(it);
        const catRaw = String(o.category ?? 'other');
        const cat = catRaw === 'lawyer_request' ? 'other' : catRaw;
        const statusRaw = String(o.status ?? 'awaiting_response');
        const status =
            statusRaw === 'completed' || statusRaw === 'response_received'
                ? 'response_received'
                : statusRaw === 'returned_for_revision'
                  ? 'returned_for_revision'
                  : statusRaw === 'pending' || statusRaw === 'awaiting_response'
                    ? 'awaiting_response'
                    : 'awaiting_response';
        const rawIds = Array.isArray(o.defendantIds) ? o.defendantIds : [];
        const ids = Array.isArray(rawIds)
            ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
            : [];
        return {
            id: String(o.id ?? createId()),
            date: String(o.date ?? new Date().toISOString().slice(0, 10)),
            category: [
                'official_letter',
                'forensic_report',
                'site_inspection',
                'exhibit_seizure',
                'other',
            ].includes(cat)
                ? (cat as InvestigationLog['category'])
                : 'other',
            title: String(o.title ?? ''),
            details: String(o.details ?? ''),
            status: status as InvestigationLog['status'],
            attachmentRef: typeof o.attachmentRef === 'string' ? o.attachmentRef : undefined,
            defendantIds: ids.length ? Array.from(new Set(ids)) : undefined,
            seizureRecordNumber:
                typeof o.seizureRecordNumber === 'string' ? o.seizureRecordNumber : undefined,
            forensicLetterRef:
                typeof o.forensicLetterRef === 'string' ? o.forensicLetterRef : undefined,
            linkedPartyId:
                typeof o.linkedPartyId === 'string'
                    ? String(o.linkedPartyId).trim() || undefined
                    : ids[0],
            exhibitDescription:
                typeof o.exhibitDescription === 'string' ? o.exhibitDescription : undefined,
            exhibitQuantity:
                typeof o.exhibitQuantity === 'string' ? o.exhibitQuantity : undefined,
            exhibitLifecycle:
                o.exhibitLifecycle === 'seized_at_station' ||
                o.exhibitLifecycle === 'sent_to_lab' ||
                o.exhibitLifecycle === 'lab_result_received'
                    ? o.exhibitLifecycle
                    : cat === 'exhibit_seizure'
                      ? 'seized_at_station'
                      : undefined,
            responseReceivedAt:
                typeof o.responseReceivedAt === 'string' ? o.responseReceivedAt : undefined,
            responseNotes: typeof o.responseNotes === 'string' ? o.responseNotes : undefined,
        };
    });
};

export function normalizePersistOtherEvidenceItems(arr: unknown): OtherEvidenceItem[] {
    if (!Array.isArray(arr)) return [];
    return arr
        .map((it) => {
            if (!it || typeof it !== 'object') return null;
            const o = asRecord(it);
            const evidenceType = String(o.evidenceType ?? '').trim();
            if (!evidenceType) return null;
            const isLinkedToDossier = o.isLinkedToDossier === true;
            const attachmentDateRaw = String(o.attachmentDate ?? '').trim();
            return {
                id: String(o.id ?? createId()),
                evidenceType,
                isLinkedToDossier,
                attachmentDate: isLinkedToDossier && attachmentDateRaw ? attachmentDateRaw : undefined,
                notes: String(o.notes ?? '').trim(),
                createdAt: String(o.createdAt ?? attachmentDateRaw ?? '').trim() || undefined,
                proceduralNodeId:
                    typeof o.proceduralNodeId === 'string' && String(o.proceduralNodeId).trim()
                        ? String(o.proceduralNodeId).trim()
                        : undefined,
            } as OtherEvidenceItem;
        })
        .filter(Boolean) as OtherEvidenceItem[];
};

