/**
 * عرض صفة الحكم في السجل: نتيجة كل طرف (صفة + إلزام/رد) — بلا «مختلط» وبلا تلميحات طعن.
 * إعادة كتابة للعرض فقط؛ التخزين القديم يبقى كما هو.
 */
import type { PartyJudgmentDisposition } from './partyJudgmentDisposition';
import {
    formatPartyJudgmentOutcomeSummary,
    formatPartyJudgmentPresenceSummary,
    isPresentLikeJudgmentForm,
    JUDGMENT_FORM_GHIABI,
    JUDGMENT_FORM_HADARI,
} from './partyJudgmentDisposition';

const MIXED_WORD = 'مختلط';
const FORM_MIXED_RE = /الشكل:\s*مختلط/g;
const TITLE_MIXED_RE = /\s*\(\s*مختلط\s*\)/g;
const BARE_MIXED_PHRASE_RE = /حكم مختلط/g;
const CLIENT_HINT_LINE_RE = /^.*النتيجة للموكل:.*$/gm;
const CLOSED_PLEADING_LINE_RE = /^.*صدر الحكم وقُفلت المرافعة\.?\s*$/gm;
const PRESENCE_OR_OUTCOME_LABEL_RE = /^(?:الصفة|النتيجة):\s*.+$/m;

function toOutcomeBlock(presenceLine: string): string {
    const t = String(presenceLine ?? '').trim();
    if (!t) return '';
    if (t.includes('\n')) return t;
    return t.split(' — ').map((part) => part.trim()).filter(Boolean).join('\n');
}

function toInline(presenceLine: string): string {
    return toOutcomeBlock(presenceLine).split('\n').filter(Boolean).join(' — ');
}

export function rewriteJudgmentTimelinePresenceText(
    text: string,
    presenceLine: string,
): string {
    const raw = String(text ?? '');
    if (!raw) return raw;
    const outcomeBlock = toOutcomeBlock(presenceLine);
    const inline = toInline(presenceLine);
    let out = raw.replace(FORM_MIXED_RE, inline ? `الصفة: ${inline}` : '');
    out = out.replace(TITLE_MIXED_RE, '');
    out = out.replace(BARE_MIXED_PHRASE_RE, inline ? `حكم — ${inline}` : 'حكم');
    out = out.replace(CLIENT_HINT_LINE_RE, '');
    out = out.replace(CLOSED_PLEADING_LINE_RE, '');
    if (outcomeBlock && PRESENCE_OR_OUTCOME_LABEL_RE.test(out)) {
        out = out.replace(PRESENCE_OR_OUTCOME_LABEL_RE, `النتيجة:\n${outcomeBlock}`);
    } else if (outcomeBlock && !out.includes(outcomeBlock.split('\n')[0]!)) {
        out = `${out.trimEnd()}\nالنتيجة:\n${outcomeBlock}`;
    }
    if (!outcomeBlock) {
        out = out
            .split('\n')
            .filter((line) => !line.includes(MIXED_WORD))
            .join('\n');
    } else if (out.includes(MIXED_WORD)) {
        out = out.split(MIXED_WORD).join(inline);
    }
    return out.replace(/\n{3,}/g, '\n\n').trim();
}

export function rewriteTimelineEventJudgmentPresence<T extends { title?: string; details?: string }>(
    event: T,
    presenceLine: string,
): T {
    const presence = String(presenceLine ?? '').trim();
    const title = rewriteJudgmentTimelinePresenceText(String(event.title ?? ''), presence);
    const details = rewriteJudgmentTimelinePresenceText(String(event.details ?? ''), presence);
    if (title === event.title && details === (event.details ?? '')) return event;
    return { ...event, title, details };
}

export function rewriteTimelineEventsJudgmentPresence<T extends { title?: string; details?: string }>(
    events: T[] | null | undefined,
    presenceLine: string,
): T[] {
    if (!Array.isArray(events) || events.length === 0) return events ?? [];
    const presence = String(presenceLine ?? '').trim();
    const needsHintStrip = events.some((event) =>
        /النتيجة للموكل:|صدر الحكم وقُفلت المرافعة/.test(String(event.title ?? event.details ?? '')),
    );
    if (
        !presence
        && !needsHintStrip
        && !events.some((event) => String(event.title ?? event.details ?? '').includes(MIXED_WORD))
    ) {
        return events;
    }
    return events.map((event) => rewriteTimelineEventJudgmentPresence(event, presence));
}

export function formatJudgmentPresenceFromLanes(
    parties: Array<{ id?: unknown; name?: unknown }> | null | undefined,
    lanes: Array<{ partyId?: unknown; disposition?: unknown }> | null | undefined,
): string {
    if (!Array.isArray(lanes) || lanes.length === 0) return '';
    const byId = new Map(
        (parties ?? []).map((party) => [String(party.id ?? '').trim(), String(party.name ?? '').trim()]),
    );
    const parts: string[] = [];
    const seen = new Set<string>();
    for (const lane of lanes) {
        const partyId = String(lane.partyId ?? '').trim();
        if (!partyId || seen.has(partyId)) continue;
        const form = isPresentLikeJudgmentForm(lane.disposition)
            ? JUDGMENT_FORM_HADARI
            : lane.disposition === JUDGMENT_FORM_GHIABI
              ? JUDGMENT_FORM_GHIABI
              : '';
        if (!form) continue;
        seen.add(partyId);
        const name = byId.get(partyId) || `طرف ${partyId}`;
        parts.push(`${name} ${form}`);
    }
    return parts.join(' — ');
}

export function resolveStageJudgmentPresenceLine(stage?: {
    parties?: Array<{ id?: unknown; name?: unknown }> | null;
    partyJudgmentDispositions?: PartyJudgmentDisposition[] | unknown;
    partyChallengeLanes?: Array<{ partyId?: unknown; disposition?: unknown }> | unknown;
} | null): string {
    if (!stage) return '';
    const fromOutcomes = formatPartyJudgmentOutcomeSummary(
        stage.parties,
        stage.partyJudgmentDispositions,
    );
    if (fromOutcomes) return fromOutcomes;
    const fromDispositions = formatPartyJudgmentPresenceSummary(
        stage.parties,
        stage.partyJudgmentDispositions,
    );
    if (fromDispositions) return fromDispositions;
    const lanes = Array.isArray(stage.partyChallengeLanes) ? stage.partyChallengeLanes : [];
    return formatJudgmentPresenceFromLanes(stage.parties, lanes);
}
