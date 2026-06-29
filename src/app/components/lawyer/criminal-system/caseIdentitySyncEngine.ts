// @ts-nocheck
import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalCase, LawyerRequest, TimelineEvent } from './criminalCaseModel';

function replaceEmbeddedText(value: string | undefined, prior: string, next: string): string | undefined {
    const text = String(value ?? '');
    const from = String(prior ?? '').trim();
    const to = String(next ?? '').trim();
    if (!text || !from || from === to || !text.includes(from)) return value;
    return text.split(from).join(to);
}

function decisionTouchesParty(decision: JudicialDecision, partyId: string): boolean {
    const pid = String(partyId ?? '').trim();
    if (!pid) return false;
    const ids = ([] as string[])
        .concat(decision.defendantIds ?? [])
        .concat(decision.beneficiaryPartyIds ?? [])
        .map((x) => String(x ?? '').trim());
    return ids.includes(pid);
}

function requestTouchesParty(request: LawyerRequest, partyId: string): boolean {
    const pid = String(partyId ?? '').trim();
    if (!pid) return false;
    return (Array.isArray(request.defendantIds) ? request.defendantIds : [])
        .map((x) => String(x ?? '').trim())
        .includes(pid);
}

function timelineTouchesParty(event: TimelineEvent, partyId: string): boolean {
    const pid = String(partyId ?? '').trim();
    if (!pid) return false;
    const ids = Array.isArray(event.defendantIds) ? event.defendantIds : [];
    return ids.map((x) => String(x ?? '').trim()).includes(pid);
}

export function patchJudicialDecisionPartyName(
    decision: JudicialDecision,
    partyId: string,
    priorName: string,
    nextName: string,
): JudicialDecision {
    if (!decisionTouchesParty(decision, partyId)) return decision;
    const bail = decision.defendantBail;
    const nextBail =
        bail && Array.isArray(bail.guarantors)
            ? {
                  ...bail,
                  guarantors: bail.guarantors.map((g) => {
                      const name = String(g.fullName ?? '').trim();
                      return name === priorName ? { ...g, fullName: nextName } : g;
                  }),
              }
            : bail;
    return {
        ...decision,
        title: replaceEmbeddedText(decision.title, priorName, nextName) ?? decision.title,
        summary: replaceEmbeddedText(decision.summary, priorName, nextName) ?? decision.summary,
        defendantBail: nextBail,
        appeals: (decision.appeals ?? []).map((appeal) => ({
            ...appeal,
            cassationDirectives: replaceEmbeddedText(appeal.cassationDirectives, priorName, nextName),
            appellantManualLabel: replaceEmbeddedText(appeal.appellantManualLabel, priorName, nextName),
            modifiedCharge: replaceEmbeddedText(appeal.modifiedCharge, priorName, nextName),
        })),
    };
}

export function patchLawyerRequestPartyName(
    request: LawyerRequest,
    partyId: string,
    priorName: string,
    nextName: string,
): LawyerRequest {
    if (!requestTouchesParty(request, partyId)) return request;
    const bail = request.defendantBail;
    const nextBail =
        bail && Array.isArray(bail.guarantors)
            ? {
                  ...bail,
                  guarantors: bail.guarantors.map((g) => {
                      const name = String(g.fullName ?? '').trim();
                      return name === priorName ? { ...g, fullName: nextName } : g;
                  }),
              }
            : bail;
    return {
        ...request,
        lawyerNote: replaceEmbeddedText(request.lawyerNote, priorName, nextName) ?? request.lawyerNote,
        judgeMargin: replaceEmbeddedText(request.judgeMargin, priorName, nextName) ?? request.judgeMargin,
        defendantBail: nextBail,
    };
}

export function patchTimelineEventPartyName(
    event: TimelineEvent,
    partyId: string,
    priorName: string,
    nextName: string,
): TimelineEvent {
    if (!timelineTouchesParty(event, partyId)) return event;
    return {
        ...event,
        title: replaceEmbeddedText(event.title, priorName, nextName) ?? event.title,
        description: replaceEmbeddedText(event.description, priorName, nextName) ?? event.description,
        category: replaceEmbeddedText(event.category, priorName, nextName) ?? event.category,
    };
}

export function syncCasePartyNameCorrection(
    caseRecord: CriminalCase,
    partyId: string,
    priorName: string,
    nextName: string,
): CriminalCase {
    const from = String(priorName ?? '').trim();
    const to = String(nextName ?? '').trim();
    if (!from || !to || from === to) return caseRecord;

    const judicialDecisions = (Array.isArray(caseRecord.judicialDecisions) ? caseRecord.judicialDecisions : []).map(
        (d) => patchJudicialDecisionPartyName(d, partyId, from, to),
    );
    const lawyerRequests = (Array.isArray(caseRecord.lawyerRequests) ? caseRecord.lawyerRequests : []).map((r) =>
        patchLawyerRequestPartyName(r, partyId, from, to),
    );
    const timelineEvents = (Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []).map((ev) =>
        patchTimelineEventPartyName(ev, partyId, from, to),
    );
    const statements = (Array.isArray(caseRecord.statements) ? caseRecord.statements : []).map((s) => {
        const ids = Array.isArray(s.defendantIds) ? s.defendantIds : [];
        if (!ids.map(String).includes(String(partyId))) return s;
        return {
            ...s,
            title: replaceEmbeddedText(s.title, from, to) ?? s.title,
            content: replaceEmbeddedText(s.content, from, to) ?? s.content,
        };
    });

    return {
        ...caseRecord,
        judicialDecisions,
        lawyerRequests,
        timelineEvents,
        statements,
    };
}

function patchLegalArticleField(value: string | undefined, priorArticle: string, nextArticle: string): string | undefined {
    const stored = String(value ?? '').trim();
    if (!stored) return value;
    if (stored === priorArticle) return nextArticle;
    return replaceEmbeddedText(value, priorArticle, nextArticle);
}

export function patchJudicialDecisionLegalArticle(
    decision: JudicialDecision,
    priorArticle: string,
    nextArticle: string,
): JudicialDecision {
    const nextBasis = patchLegalArticleField(decision.legalArticleBasis, priorArticle, nextArticle);
    return {
        ...decision,
        legalArticleBasis: nextBasis ?? decision.legalArticleBasis,
        summary: replaceEmbeddedText(decision.summary, priorArticle, nextArticle) ?? decision.summary,
        title: replaceEmbeddedText(decision.title, priorArticle, nextArticle) ?? decision.title,
    };
}

export function patchLawyerRequestLegalArticle(
    request: LawyerRequest,
    priorArticle: string,
    nextArticle: string,
): LawyerRequest {
    const nextBasis = patchLegalArticleField(request.legalArticleBasis, priorArticle, nextArticle);
    const orderEnforcement = request.orderEnforcement
        ? {
              ...request.orderEnforcement,
              legalArticleBasis:
                  patchLegalArticleField(request.orderEnforcement.legalArticleBasis, priorArticle, nextArticle) ??
                  request.orderEnforcement.legalArticleBasis,
          }
        : request.orderEnforcement;
    return {
        ...request,
        legalArticleBasis: nextBasis ?? request.legalArticleBasis,
        lawyerNote: replaceEmbeddedText(request.lawyerNote, priorArticle, nextArticle) ?? request.lawyerNote,
        judgeMargin: replaceEmbeddedText(request.judgeMargin, priorArticle, nextArticle) ?? request.judgeMargin,
        orderEnforcement,
    };
}

export function syncCaseLegalArticleCorrection(
    caseRecord: CriminalCase,
    priorArticle: string,
    nextArticle: string,
): CriminalCase {
    const from = String(priorArticle ?? '').trim();
    const to = String(nextArticle ?? '').trim();
    if (!from || !to || from === to) return caseRecord;

    return {
        ...caseRecord,
        judicialDecisions: (Array.isArray(caseRecord.judicialDecisions) ? caseRecord.judicialDecisions : []).map(
            (d) => patchJudicialDecisionLegalArticle(d, from, to),
        ),
        lawyerRequests: (Array.isArray(caseRecord.lawyerRequests) ? caseRecord.lawyerRequests : []).map((r) =>
            patchLawyerRequestLegalArticle(r, from, to),
        ),
        timelineEvents: (Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []).map((ev) => ({
            ...ev,
            title: replaceEmbeddedText(ev.title, from, to) ?? ev.title,
            description: replaceEmbeddedText(ev.description, from, to) ?? ev.description,
        })),
    };
}

export function patchJudicialDecisionCourtName(
    decision: JudicialDecision,
    priorCourtName: string,
    nextCourtName: string,
): JudicialDecision {
    return {
        ...decision,
        referredCourtName:
            patchLegalArticleField(decision.referredCourtName, priorCourtName, nextCourtName) ??
            decision.referredCourtName,
        summary: replaceEmbeddedText(decision.summary, priorCourtName, nextCourtName) ?? decision.summary,
    };
}

export function patchLawyerRequestCourtName(
    request: LawyerRequest,
    priorCourtName: string,
    nextCourtName: string,
): LawyerRequest {
    return {
        ...request,
        referredCourtName:
            patchLegalArticleField(request.referredCourtName, priorCourtName, nextCourtName) ??
            request.referredCourtName,
        lawyerNote: replaceEmbeddedText(request.lawyerNote, priorCourtName, nextCourtName) ?? request.lawyerNote,
        judgeMargin: replaceEmbeddedText(request.judgeMargin, priorCourtName, nextCourtName) ?? request.judgeMargin,
    };
}

export function syncCaseCourtNameCorrection(
    caseRecord: CriminalCase,
    priorCourtName: string,
    nextCourtName: string,
): CriminalCase {
    const from = String(priorCourtName ?? '').trim();
    const to = String(nextCourtName ?? '').trim();
    if (!from || !to || from === to) return caseRecord;

    return {
        ...caseRecord,
        judicialDecisions: (Array.isArray(caseRecord.judicialDecisions) ? caseRecord.judicialDecisions : []).map(
            (d) => patchJudicialDecisionCourtName(d, from, to),
        ),
        lawyerRequests: (Array.isArray(caseRecord.lawyerRequests) ? caseRecord.lawyerRequests : []).map((r) =>
            patchLawyerRequestCourtName(r, from, to),
        ),
        timelineEvents: (Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []).map((ev) => ({
            ...ev,
            title: replaceEmbeddedText(ev.title, from, to) ?? ev.title,
            description: replaceEmbeddedText(ev.description, from, to) ?? ev.description,
        })),
    };
}
