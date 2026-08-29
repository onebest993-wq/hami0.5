import type { Decision } from '../../types';

function decisionSortTimestamp(d: Decision): number {
    let best = 0;
    const bump = (raw: string | undefined | null) => {
        const t = Date.parse(String(raw ?? '').trim());
        if (!Number.isNaN(t) && t > best) best = t;
    };
    bump(d.resolvedAt);
    bump(d.date);
    if (Array.isArray(d.appealTimelineLogs)) {
        for (const log of d.appealTimelineLogs) bump(log.at);
    }
    const idTs = String(d.id || '').match(/(\d{13})/);
    if (idTs) {
        const t = Number(idTs[1]);
        if (!Number.isNaN(t) && t > best) best = t;
    }
    return best;
}

/** الأحدث أولاً — للعرض في مركز القرارات والطعون */
export function compareDecisionsNewestFirst(a: Decision, b: Decision): number {
    const ta = decisionSortTimestamp(a);
    const tb = decisionSortTimestamp(b);
    if (tb !== ta) return tb - ta;
    return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
}

export function sortDecisionsNewestFirst(list: Decision[]): Decision[] {
    return [...list].sort(compareDecisionsNewestFirst);
}
