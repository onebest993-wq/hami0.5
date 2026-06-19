import { stripEmojisFromText } from '@/app/utils/timelineSmartDisplay';

export const newEventId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export const DECISIONS_APPEALS_TOOLTIP_DELAY_MS = 450;

export function normComparableDecisionText(s: string): string {
    return stripEmojisFromText(String(s || ''))
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

export function shouldShowDecisionHubBody(title: string, bodyText: string | undefined | null): boolean {
    const b = normComparableDecisionText(String(bodyText ?? ''));
    if (!b) return false;
    const t = normComparableDecisionText(title);
    if (!t) return true;
    if (b === t) return false;
    if (b.startsWith(t) && b.slice(t.length).trim().length <= 2) return false;
    if (t.startsWith(b) && t.slice(b.length).trim().length <= 2) return false;
    if (t.includes(b) && b.length >= Math.min(28, Math.floor(t.length * 0.92))) return false;
    return true;
}

export function arabicLooseNormalize(s: string): string {
    let x = stripEmojisFromText(String(s || '')).toLowerCase();
    x = x.replace(/[\u0640\u0610-\u061A\u064B-\u065F\u0670]/g, '');
    x = x.replace(/[أإآٱ]/g, 'ا');
    x = x.replace(/ى/g, 'ي');
    x = x.replace(/ة/g, 'ه');
    x = x.replace(/[^\p{L}\p{N}\s\u0600-\u06FF]+/gu, ' ');
    x = x.replace(/\s+/g, ' ').trim();
    return x;
}

export function isIntroLineRedundantWithTitle(title: string, line: string): boolean {
    const t = arabicLooseNormalize(title);
    const l = arabicLooseNormalize(line);
    if (!l || !t) return false;
    if (l === t) return true;
    const tw = new Set(t.split(' ').filter((w) => w.length > 2));
    const lw = new Set(l.split(' ').filter((w) => w.length > 2));
    if (tw.size === 0) return false;
    let hit = 0;
    for (const w of tw) {
        if (lw.has(w)) hit++;
    }
    const overlap = hit / tw.size;
    if (overlap >= 0.65 && l.length <= t.length * 1.55) return true;
    if (l.length >= 18 && (t.includes(l.slice(0, 22)) || l.includes(t.slice(0, 22)))) return true;
    return false;
}

export function stripRedundantLeadingLinesFromHubBody(title: string, body: string): string {
    const lines = String(body ?? '').split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
        const seg = lines[i].trim();
        if (!seg) {
            i++;
            continue;
        }
        if (isIntroLineRedundantWithTitle(title, seg)) {
            i++;
            continue;
        }
        break;
    }
    return lines.slice(i).join('\n').replace(/^\s*\n+/, '').trimStart();
}

