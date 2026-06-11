export type ExpertObjectionKind = 'report' | 'experts';

/** عدد الخبراء المطلوب — دائماً فردي (لا يقبل القسمة على 2) */
export function normalizeOddExpertCount(n: number): number {
    const v = Math.max(1, Math.trunc(Number(n) || 0));
    return v % 2 === 1 ? v : v + 1;
}

export function readExpertCommitteeSize(entity: {
    expertCommitteeSize?: number | null;
    expertNames?: string[] | null;
}): number {
    if (entity.expertCommitteeSize != null && Number.isFinite(Number(entity.expertCommitteeSize))) {
        const s = Math.trunc(Number(entity.expertCommitteeSize));
        if (s >= 1) return normalizeOddExpertCount(s);
    }
    const names = Array.isArray(entity.expertNames)
        ? entity.expertNames.map((x) => String(x || '').trim()).filter(Boolean)
        : [];
    if (names.length > 0) return normalizeOddExpertCount(names.length);
    return 1;
}

/** بعد اعتراض على التقرير: 1→3→5→7… */
export function nextExpertCommitteeSizeAfterReportObjection(current: number): number {
    return normalizeOddExpertCount(current) + 2;
}

export function parseExpertObjectionKindFromPayload(rawJson: string): ExpertObjectionKind {
    const raw = String(rawJson || '').trim();
    if (!raw) return 'report';
    try {
        const v = JSON.parse(raw) as { objectionKind?: string };
        const k = String(v?.objectionKind || '').trim();
        if (k === 'experts') return 'experts';
    } catch {
        /* ignore */
    }
    return 'report';
}

export function buildExpertObjectionEntityPatch(
    entity: { expertCommitteeSize?: number | null; expertNames?: string[] | null },
    objectionKind: ExpertObjectionKind
): Record<string, unknown> {
    const currentSize = readExpertCommitteeSize(entity);
    const base = {
        status: 'estimation_objected',
        lastExpertObjectionKind: objectionKind,
        expertNames: [] as string[],
        expertReportDateYmd: null,
        expertEstimatedAmountIqd: null,
        experts: undefined,
    };
    if (objectionKind === 'report') {
        return {
            ...base,
            expertCommitteeSize: nextExpertCommitteeSizeAfterReportObjection(currentSize),
        };
    }
    return {
        ...base,
        expertCommitteeSize: currentSize,
    };
}

export function expertCommitteeSizeLabelAr(size: number): string {
    const n = normalizeOddExpertCount(size);
    return `مطلوب ${n} ${n === 1 ? 'خبير' : 'خبراء'} (عدد فردي)`;
}
