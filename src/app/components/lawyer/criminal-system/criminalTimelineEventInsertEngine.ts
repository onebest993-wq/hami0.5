import type {
    CriminalCase,
    CriminalDefendant,
    DefendantStatus,
    TimelineEvent,
} from './criminalCaseModel';
import { isTimelineEventInsertBlocked } from './criminalCaseMutationPolicy';
import { computeObjectionDeadlineFromNotifiedDate } from './criminalDateUtils';
import { normalizeGuarantorDetails } from './criminalGuarantorModel';
import {
    resolveProceduralDefendantIds,
} from './criminalProceduralPartyUtils';
import {
    isDetentionArrestCategory,
    isInvestigationDetentionCategory,
    isPrivateRightWaiverTimelineCategory,
    isValidJuvenileDetentionPlacement,
    juvenileDetentionPlacementLabel,
} from './criminalStageUtils';
import {
    investigationJuvenileDetentionAuthorityLabel,
    syncJuvenileInvestigationCaseFlags,
} from './juvenileInvestigationRules';
import { resolveCurrentJourneyNodeId } from './stageJourney';

export type TimelineEventInsertResult =
    | { ok: true; nextCase: CriminalCase }
    | { ok: false; reason: 'blocked' | 'invalid_event' };

function stampProceduralNodeId<T extends { proceduralNodeId?: string }>(item: T, nodeId: string): T {
    if (!nodeId) return item;
    return { ...item, proceduralNodeId: nodeId };
}

function normalizeCourtSessionTimelineEvent(event: TimelineEvent): TimelineEvent | null {
    const isCourtSession = String(event.type ?? '').trim() === 'court_session';
    if (!isCourtSession) {
        const { summonsStatus: _s, summonsDate: _d, summonsDocumentRef: _r, ...rest } = event as TimelineEvent & {
            summonsStatus?: string;
            summonsDate?: string;
            summonsDocumentRef?: string;
        };
        return rest as TimelineEvent;
    }
    const statusRaw = String((event as { summonsStatus?: string }).summonsStatus ?? '').trim();
    const status =
        statusRaw === 'served_valid' ||
        statusRaw === 'not_served_invalid' ||
        statusRaw === 'served_to_official'
            ? statusRaw
            : '';
    const summonsDate = String((event as { summonsDate?: string }).summonsDate ?? '').trim();
    const summonsDocumentRef = String((event as { summonsDocumentRef?: string }).summonsDocumentRef ?? '').trim();
    if (!status || !summonsDate || !summonsDocumentRef) return null;
    return {
        ...event,
        summonsStatus: status as TimelineEvent['summonsStatus'],
        summonsDate,
        summonsDocumentRef,
    };
}

/** يُطبّق إدراج حدث تايم لاين على لقطة إضبارة — منطق store `addTimelineEvent`. */
export function applyTimelineEventInsertion(
    target: CriminalCase,
    event: TimelineEvent,
): TimelineEventInsertResult {
    if (isTimelineEventInsertBlocked(target, event)) {
        return { ok: false, reason: 'blocked' };
    }

    const nextEvent = normalizeCourtSessionTimelineEvent(event);
    if (!nextEvent) return { ok: false, reason: 'invalid_event' };

    const category = String(nextEvent.category ?? '').trim();
    const rawIds = nextEvent.defendantIds;
    const eventPartyIds = Array.isArray(rawIds)
        ? rawIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)
        : [];
    const isMutual = target.isMutualComplaint === true;
    const caseComplainants = Array.isArray(target.complainants) ? target.complainants : [];
    let nextDefendantsAfterArrest = Array.isArray(target.defendants) ? target.defendants : [];
    const eventDefendantIds = resolveProceduralDefendantIds(
        caseComplainants,
        nextDefendantsAfterArrest,
        eventPartyIds,
        isMutual,
    );

    const isBailForfeiture = category === 'قرار مصادرة الكفالة وتحصيلها';
    const isInAbsentiaNotification = category === 'تبليغ رسمي بالحكم الغيابي';
    const guarantorDetails = normalizeGuarantorDetails(nextEvent.guarantorDetails) ?? null;

    const isArrestCategory = isDetentionArrestCategory(category);
    const isInvDetentionCategory = isInvestigationDetentionCategory(category);
    const placementRaw = String((nextEvent as { detentionPlacement?: string }).detentionPlacement ?? '').trim();
    const detentionPlacement = isValidJuvenileDetentionPlacement(placementRaw) ? placementRaw : null;

    if ((isArrestCategory || isInvDetentionCategory) && eventDefendantIds.length) {
        nextDefendantsAfterArrest = nextDefendantsAfterArrest.map((d) => {
            if (!eventDefendantIds.includes(d.id)) return d;
            if (Boolean(d.isJuvenile)) {
                const placementCode =
                    detentionPlacement ?? (isInvDetentionCategory ? ('juvenile_observation' as const) : null);
                if (!placementCode && isArrestCategory) return d;
                return {
                    ...d,
                    status: 'juvenile_detention' as DefendantStatus,
                    detentionAuthority: isInvDetentionCategory
                        ? investigationJuvenileDetentionAuthorityLabel()
                        : juvenileDetentionPlacementLabel(placementCode!),
                    detentionExpiryDate: isInvDetentionCategory
                        ? String(
                              (nextEvent as { detentionEndDate?: string }).detentionEndDate ??
                                  d.detentionExpiryDate ??
                                  '',
                          )
                        : d.detentionExpiryDate,
                };
            }
            if (isInvDetentionCategory) {
                return {
                    ...d,
                    status: 'موقوف' as DefendantStatus,
                    detentionExpiryDate: String(
                        (nextEvent as { detentionEndDate?: string }).detentionEndDate ?? d.detentionExpiryDate ?? '',
                    ),
                };
            }
            return d;
        });
    }

    const isCourtSession = String(nextEvent.type ?? '').trim() === 'court_session';
    const juvenileSessionConfidential =
        isCourtSession &&
        (eventDefendantIds.length
            ? eventDefendantIds.some((defId) => {
                  const hit = nextDefendantsAfterArrest.find((d) => d.id === defId);
                  return Boolean(hit?.isJuvenile);
              })
            : nextDefendantsAfterArrest.some((d) => Boolean(d.isJuvenile)));

    const eventForStamp: TimelineEvent = juvenileSessionConfidential
        ? { ...nextEvent, isConfidential: true }
        : nextEvent;

    const nextDefendants =
        eventDefendantIds.length && (Boolean(guarantorDetails) || isBailForfeiture || isInAbsentiaNotification)
            ? nextDefendantsAfterArrest.map((d) => {
                  if (!eventDefendantIds.includes(d.id)) return d;

                  const existingGuarantor = normalizeGuarantorDetails(d.guarantorDetails);
                  const nextGuarantor = (() => {
                      if (guarantorDetails) return guarantorDetails;
                      if (isBailForfeiture && existingGuarantor) {
                          const note = '⛔ مصادرة الكفالة وتحصيلها';
                          const info = existingGuarantor.guarantorInfo.trim();
                          return {
                              ...existingGuarantor,
                              guarantorInfo: info.includes('مصادرة') ? info : `${info ? `${info}\n` : ''}${note}`.trim(),
                          };
                      }
                      return existingGuarantor;
                  })();

                  const next: CriminalDefendant = {
                      ...d,
                      guarantorDetails: nextGuarantor,
                  };
                  if (isInAbsentiaNotification) {
                      const det = d.inAbsentiaDetails;
                      if (det && !det.isObjectionFiled) {
                          const notifiedDate = String(nextEvent.notifiedDate ?? '').trim();
                          const method = String(nextEvent.notificationMethod ?? '').trim();
                          const computed = computeObjectionDeadlineFromNotifiedDate(
                              notifiedDate,
                              String(target.basics?.crimeType ?? ''),
                          );
                          if (notifiedDate && computed) {
                              next.inAbsentiaDetails = {
                                  ...det,
                                  notifiedDate,
                                  notificationMethod: method || undefined,
                                  objectionDeadline: computed,
                              };
                          }
                      }
                  }
                  return next;
              })
            : nextDefendantsAfterArrest;

    const isVerdictEvent =
        target.basics.stage === 'محكمة الجنح' || target.basics.stage === 'محكمة الجنايات';
    const verdictDate =
        isVerdictEvent && /نطق بالقرار|قرار حكم/.test(category)
            ? String(nextEvent.date ?? '').trim()
            : '';

    const autoWaivePrivateRight = isPrivateRightWaiverTimelineCategory(category);
    const waiverDate = autoWaivePrivateRight
        ? String(nextEvent.date ?? '').trim() || new Date().toISOString().slice(0, 10)
        : target.waiverDate;

    const activeNodeId = resolveCurrentJourneyNodeId(target.stageJourney);
    const stampedEvent = stampProceduralNodeId(eventForStamp, activeNodeId);

    const nextCase = syncJuvenileInvestigationCaseFlags({
        ...target,
        defendants: nextDefendants,
        timelineEvents: [...(target.timelineEvents ?? []), stampedEvent],
        verdictDate: verdictDate ? verdictDate : target.verdictDate,
        ...(autoWaivePrivateRight ? { isPrivateRightWaived: true, waiverDate } : {}),
    });

    return { ok: true, nextCase };
}
