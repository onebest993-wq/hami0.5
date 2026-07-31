import { useCallback, useMemo } from 'react';
import type { CriminalCase, TimelineEvent } from './criminalStore';
import {
    findProceduralReferencesToLink,
    type ProceduralContainer,
    type ProceduralLinkReference,
} from './proceduralContainersEngine';

export type UseCriminalDashboardProceduralDataParams = {
    criminalCase: CriminalCase;
    editingRequestId: string | null;
    linkedTimelineFromProcedural: TimelineEvent | null;
};

export function useCriminalDashboardProceduralData({
    criminalCase,
    editingRequestId,
    linkedTimelineFromProcedural,
}: UseCriminalDashboardProceduralDataParams) {
    const proceduralContainers = useMemo<ProceduralContainer[]>(
        () => (Array.isArray(criminalCase.proceduralContainers) ? criminalCase.proceduralContainers : []),
        [criminalCase.proceduralContainers],
    );

    const timelineEvents = useMemo<TimelineEvent[]>(
        () => (Array.isArray(criminalCase.timelineEvents) ? criminalCase.timelineEvents : []),
        [criminalCase.timelineEvents],
    );

    const getProceduralRefsForRequest = useCallback(
        (requestId: string): ProceduralLinkReference[] =>
            findProceduralReferencesToLink(proceduralContainers, { kind: 'request', id: requestId }),
        [proceduralContainers],
    );

    const activeRequestProceduralReferences = useMemo(
        () => (editingRequestId ? getProceduralRefsForRequest(editingRequestId) : []),
        [editingRequestId, getProceduralRefsForRequest],
    );

    const linkedTimelineProceduralReferences = useMemo(
        () =>
            linkedTimelineFromProcedural
                ? findProceduralReferencesToLink(proceduralContainers, {
                      kind: 'timeline',
                      id: linkedTimelineFromProcedural.id,
                  })
                : [],
        [linkedTimelineFromProcedural, proceduralContainers],
    );

    return {
        proceduralContainers,
        timelineEvents,
        getProceduralRefsForRequest,
        activeRequestProceduralReferences,
        linkedTimelineProceduralReferences,
    };
}
