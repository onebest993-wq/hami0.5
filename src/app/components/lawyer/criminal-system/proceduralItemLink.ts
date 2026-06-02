import type { LawyerRequest, TimelineEvent } from './criminalStore';
import { formatLawyerRequestStatusLabel, resolveTimelineEventTitle } from './criminalStageUtils';

export type ProceduralLinkKind = 'timeline' | 'request';

export type ProceduralItemLink = {
    kind: ProceduralLinkKind;
    id: string;
    /** تسمية محفوظة للعرض إن حُذف السجل لاحقاً */
    label: string;
};

export type ProceduralContextValue = {
    link?: ProceduralItemLink;
    /** نص إضافي اختياري بجانب الربط */
    contextNote?: string;
};

export function normalizeProceduralItemLink(raw: unknown): ProceduralItemLink | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    const kind = String(o.kind ?? '');
    const id = String(o.id ?? '').trim();
    const label = String(o.label ?? '').trim();
    if ((kind !== 'timeline' && kind !== 'request') || !id || !label) return undefined;
    return { kind, id, label };
}

export function normalizeProceduralContextValue(
    linkRaw: unknown,
    contextRefRaw: unknown,
    contextNoteRaw?: unknown,
): ProceduralContextValue {
    const link = normalizeProceduralItemLink(linkRaw);
    const legacyText = String(contextRefRaw ?? '').trim();
    const contextNote = String(contextNoteRaw ?? '').trim() || undefined;
    if (link) return { link, contextNote };
    if (legacyText) return { contextNote: legacyText };
    return {};
}

export function timelineLinkLabel(ev: TimelineEvent): string {
    const title = resolveTimelineEventTitle(String(ev.category ?? ''), String(ev.title ?? ''));
    const date = String(ev.date ?? '').trim();
    return date ? `${date} — ${title}` : title;
}

export function requestLinkLabel(req: LawyerRequest): string {
    const type = String(req.type ?? '').trim() || 'طلب';
    const date = String(req.requestDate ?? '').trim();
    const st = formatLawyerRequestStatusLabel(req.status);
    return date ? `${date} — ${type} (${st})` : `${type} (${st})`;
}

export type ProceduralLinkOption = {
    kind: ProceduralLinkKind;
    id: string;
    label: string;
    sublabel?: string;
};

export function buildProceduralLinkOptions(input: {
    timelineEvents?: TimelineEvent[];
    lawyerRequests?: LawyerRequest[];
}): { timeline: ProceduralLinkOption[]; requests: ProceduralLinkOption[] } {
    const timeline = (Array.isArray(input.timelineEvents) ? input.timelineEvents : [])
        .filter((ev) => ev && typeof ev === 'object' && String(ev.id ?? '').trim())
        .map((ev) => ({
            kind: 'timeline' as const,
            id: String(ev.id),
            label: timelineLinkLabel(ev),
            sublabel: String(ev.category ?? '').trim() || undefined,
        }));
    const requests = (Array.isArray(input.lawyerRequests) ? input.lawyerRequests : [])
        .filter((r) => r && typeof r === 'object' && String(r.id ?? '').trim())
        .map((r) => ({
            kind: 'request' as const,
            id: String(r.id),
            label: requestLinkLabel(r),
            sublabel: String(r.lawyerNote ?? '').trim().slice(0, 60) || undefined,
        }));
    return { timeline, requests };
}

export function resolveLiveLinkLabel(
    link: ProceduralItemLink,
    input: { timelineEvents?: TimelineEvent[]; lawyerRequests?: LawyerRequest[] },
): string {
    if (link.kind === 'timeline') {
        const hit = (input.timelineEvents ?? []).find((e) => e.id === link.id);
        if (hit) return timelineLinkLabel(hit);
    }
    if (link.kind === 'request') {
        const hit = (input.lawyerRequests ?? []).find((r) => r.id === link.id);
        if (hit) return requestLinkLabel(hit);
    }
    return link.label;
}

export function isProceduralLinkBroken(
    link: ProceduralItemLink,
    input: { timelineEvents?: TimelineEvent[]; lawyerRequests?: LawyerRequest[] },
): boolean {
    if (link.kind === 'timeline') {
        return !(input.timelineEvents ?? []).some((e) => String(e?.id ?? '') === link.id);
    }
    return !(input.lawyerRequests ?? []).some((r) => String(r?.id ?? '') === link.id);
}

export function formatProceduralLinkDisplay(ctx: ProceduralContextValue, liveLabel?: string): string | null {
    const parts: string[] = [];
    if (ctx.link) {
        const prefix = ctx.link.kind === 'timeline' ? '📅' : '📋';
        parts.push(`${prefix} ${liveLabel ?? ctx.link.label}`);
    }
    if (ctx.contextNote) parts.push(ctx.contextNote);
    return parts.length ? parts.join(' · ') : null;
}
