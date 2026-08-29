import type { DefendantPersonalStage } from '@/app/types/criminal';
import type { CriminalCase, CriminalDefendant, TimelineEvent } from './criminalCaseModel';
import { shouldUseJuvenileTrialJourneyLabels } from './criminalStageUtils';

export function createId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function juvenileJourneyLabelOptions(
    caseRecord: CriminalCase,
    defendantIds?: string[],
): { juvenileTrialDisplay?: boolean } {
    return {
        juvenileTrialDisplay: shouldUseJuvenileTrialJourneyLabels(
            Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [],
            { defendantIds, storedStage: caseRecord.basics?.stage },
        ),
    };
}

export function applyPersonalStagesToDefendants(
    caseRecord: CriminalCase,
    defendantIds: string[],
    personalStage: DefendantPersonalStage,
    patch?: Partial<CriminalDefendant>,
): CriminalCase {
    const idSet = new Set(defendantIds);
    return {
        ...caseRecord,
        defendants: (caseRecord.defendants ?? []).map((d) =>
            idSet.has(d.id) ? { ...d, personalStage, ...patch } : d,
        ),
    };
}

export function mergeCassationTimelineEvents(
    caseRecord: CriminalCase,
    event: TimelineEvent,
    suppress?: boolean,
): TimelineEvent[] {
    const base = Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : [];
    if (suppress) return base;
    return [...base, event];
}

export function buildCassationTimelineEvent(
    date: string,
    fallback: {
        category: string;
        title: string;
        description: string;
        defendantIds?: string[];
        proceduralNodeId?: string;
    },
    overlay?: { title?: string; category?: string },
): TimelineEvent {
    return {
        id: createId(),
        date,
        type: 'decision',
        category: overlay?.category ?? fallback.category,
        title: overlay?.title ?? fallback.title,
        description: fallback.description,
        defendantIds: fallback.defendantIds,
        proceduralNodeId: fallback.proceduralNodeId,
    };
}
