/** استخراج وعرض بيانات موعد الرادار بدون إيموجي أو حشو مكرر */

const EMOJI_OR_SYMBOLS = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu;

type RadarEventDisplayMeta = {
    sourceLabel?: string;
    court?: string;
    partiesSummary?: string;
    freeNotes?: string;
};

function stripDecor(text: string): string {
    return text.replace(EMOJI_OR_SYMBOLS, '').replace(/\s{2,}/g, ' ').trim();
}

function takeLineValue(line: string, prefixes: string[]): string | null {
    const cleaned = stripDecor(line);
    for (const prefix of prefixes) {
        if (cleaned.startsWith(prefix)) {
            return cleaned.slice(prefix.length).trim() || null;
        }
    }
    return null;
}

/** يفسّر كتلة الملاحظات القديمة (مع/بدون إيموجي) إلى حقول منظمة */
export function parseCalendarNotesMeta(notes?: string | null): RadarEventDisplayMeta {
    if (!notes?.trim()) return {};
    const sourceLabelPrefixes = ['المصدر:', 'المصدر :'];
    const courtPrefixes = ['المحكمة:', 'المحكمة :'];
    let sourceLabel: string | undefined;
    let court: string | undefined;
    let partiesSummary: string | undefined;
    const free: string[] = [];

    for (const raw of notes.split(/\n+/)) {
        const line = raw.trim();
        if (!line) continue;
        const asSource = takeLineValue(line, sourceLabelPrefixes);
        if (asSource) {
            sourceLabel = asSource;
            continue;
        }
        const asCourt = takeLineValue(line, courtPrefixes);
        if (asCourt) {
            court = asCourt;
            continue;
        }
        const plain = stripDecor(line);
        if (!plain) continue;
        // سطر أطراف شائع: «اسم (دور) · اسم (دور)»
        if (!partiesSummary && /[·•]/.test(plain) && /\([^)]+\)/.test(plain)) {
            partiesSummary = plain;
            continue;
        }
        free.push(plain);
    }

    return {
        sourceLabel,
        court,
        partiesSummary,
        freeNotes: free.length ? free.join('\n') : undefined,
    };
}

export function resolveRadarEventDisplayMeta(input: {
    notes?: string | null;
    court?: string | null;
    partiesSummary?: string | null;
    sourceLabel?: string | null;
    location?: string | null;
    moduleLabel?: string | null;
}): RadarEventDisplayMeta & { location?: string } {
    const parsed = parseCalendarNotesMeta(input.notes);
    const sourceLabel =
        stripDecor(input.sourceLabel || '') ||
        parsed.sourceLabel ||
        stripDecor(input.moduleLabel || '') ||
        undefined;
    const court = stripDecor(input.court || '') || parsed.court || undefined;
    const partiesSummary =
        stripDecor(input.partiesSummary || '') || parsed.partiesSummary || undefined;
    const locationRaw = stripDecor(input.location || '') || undefined;
    const location =
        locationRaw && court && locationRaw === court ? undefined : locationRaw;

    return {
        sourceLabel,
        court,
        partiesSummary,
        freeNotes: parsed.freeNotes,
        location,
    };
}
