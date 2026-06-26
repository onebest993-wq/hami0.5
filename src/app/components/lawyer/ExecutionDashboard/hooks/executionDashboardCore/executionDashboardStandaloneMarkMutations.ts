import type { StandaloneExecutionMark, TimelineEvent } from '@/app/types/execution';

export type SaveStandaloneMarkInput = {
    decisionId: string;
    markType: string;
    targetEntity: string;
    markDetails: string;
    letterDetails: string;
};

export function buildStandaloneExecutionMarkRow(
    input: SaveStandaloneMarkInput,
    prev: StandaloneExecutionMark[],
    nowIso: string,
): { nextRow: StandaloneExecutionMark; nextMarks: StandaloneExecutionMark[] } {
    const decisionId = String(input.decisionId || '').trim();
    const existing = prev.find((a) => String(a.decisionRowId || '').trim() === decisionId) || null;
    const nextRow: StandaloneExecutionMark = {
        id: existing?.id || `mk_${decisionId}_${Date.now()}`,
        decisionRowId: decisionId,
        markType: String(input.markType || '').trim(),
        targetEntity: String(input.targetEntity || '').trim(),
        markDetails: String(input.markDetails || '').trim(),
        letterDetails: String(input.letterDetails || '').trim(),
        isMarkConfirmed: existing?.isMarkConfirmed || false,
        status: existing?.status || 'active',
        record_locked: existing?.record_locked || false,
        archived_at_ymd: existing?.archived_at_ymd ?? null,
    };
    const nextMarks = [...prev.filter((a) => a.id !== nextRow.id), nextRow];
    return { nextRow, nextMarks };
}

export function buildStandaloneMarkSeizureRequestDetails(
    markType: string,
    targetEntity: string,
    letterDetails: string,
    markDetails: string,
): string {
    return [
        `النوع: ${markType}`,
        `الجهة: ${targetEntity}`,
        letterDetails ? `الكتاب: ${letterDetails}` : null,
        `التفاصيل: ${markDetails}`,
    ]
        .filter(Boolean)
        .join('\n');
}

export function buildStandaloneMarkDecisionPatch(
    nextRow: StandaloneExecutionMark,
    nowIso: string,
): {
    seizureRequestSavedAt: string;
    seizureRequestDetails: string;
    seizurePayloadJson: string;
} {
    const { markType, targetEntity, markDetails, letterDetails } = nextRow;
    return {
        seizureRequestSavedAt: nowIso,
        seizureRequestDetails: buildStandaloneMarkSeizureRequestDetails(
            markType,
            targetEntity,
            letterDetails,
            markDetails,
        ),
        seizurePayloadJson: JSON.stringify({
            standaloneMarkId: nextRow.id,
            markType,
            targetEntity,
            markDetails,
            letterDetails,
        }),
    };
}

export function buildStandaloneMarkSavedTimelineEvent(
    nextRow: StandaloneExecutionMark,
    today: string,
    nowIso: string,
    nextTimelineId: () => string,
): TimelineEvent {
    const decisionId = String(nextRow.decisionRowId || '').trim();
    return {
        id: nextTimelineId(),
        date: today,
        timestamp: nowIso,
        title: '📌 تعميم/حجز احتياطي — بدء الإجراء',
        description: `النوع: ${nextRow.markType}\nالجهة: ${nextRow.targetEntity}${nextRow.letterDetails ? `\nالكتاب: ${nextRow.letterDetails}` : ''}\nالتفاصيل: ${nextRow.markDetails}`,
        type: 'coercive',
        source: 'محضر المتابعة — الشارة التنفيذية',
        metadata: {
            timelineThreadKey: `standalone_mark:${decisionId}`,
            decisionRowId: decisionId,
            markId: nextRow.id,
        },
    };
}
