import type { SparkCoherenceContextBundle, SparkCoherenceFinding } from '@/app/spark/coherence/types';

const YMD_RE = /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g;

function extractYmds(text: string): string[] {
    const out: string[] = [];
    for (const m of text.matchAll(YMD_RE)) {
        const y = m[1];
        const mo = m[2].padStart(2, '0');
        const d = m[3].padStart(2, '0');
        out.push(`${y}-${mo}-${d}`);
    }
    return out;
}

/** تواريخ مذكورة في نص حر لا تطابق السجل الرسمي */
export function runTextRegistryRule(bundle: SparkCoherenceContextBundle): SparkCoherenceFinding[] {
    const registered = new Set(
        [...(bundle.registeredDates ?? []), ...bundle.dates.map((d) => d.ymd)].filter(Boolean),
    );
    if (registered.size === 0) return [];

    const findings: SparkCoherenceFinding[] = [];
    for (const t of bundle.texts) {
        const content = String(t.content ?? '').trim();
        if (content.length < 8) continue;
        const mentioned = extractYmds(content);
        const unregistered = mentioned.filter((ymd) => !registered.has(ymd));
        if (unregistered.length === 0) continue;
        findings.push({
            id: `text:unregistered-dates:${t.id}`,
            category: 'text',
            severity: 'info',
            observation: `نص «${t.role}» يذكر تواريخ غير مسجّلة في الإضبارة.`,
            evidence: unregistered.slice(0, 3).map((d) => `تاريخ في النص: ${d}`),
            relatedIds: [t.id],
        });
    }
    return findings;
}
