import React, { useEffect, useMemo } from 'react';
import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';
import {
    sortDecisionsNewestFirst,
    sortDecisionsNewestFirstTerminatedManualLast,
    sortDecisionsAppealActivityNewestFirst,
    resolveAppealsHubFilterOptions,
    resolveAppealHubProponentCategory,
    decisionAppealPipelineActive,
    hubHasActiveAppealLedgerEntry,
    manualExecutorAppealPipelineActive,
    EXECUTOR_QUEUE_REQUEST_KINDS,
    type AppealsHubProponentFilter,
} from '../utils';

export type UseDecisionsAppealsHubListsParams = {
    domainVisibleDecisions: Decision[];
    appealPerspective: AppealUiPerspective;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    previousFilter: 'all' | 'approved' | 'rejected';
    previousProponentFilter: AppealsHubProponentFilter;
    appealsProponentFilter: AppealsHubProponentFilter;
    setPreviousProponentFilter: React.Dispatch<React.SetStateAction<AppealsHubProponentFilter>>;
    setAppealsProponentFilter: React.Dispatch<React.SetStateAction<AppealsHubProponentFilter>>;
};

export function useDecisionsAppealsHubLists(params: UseDecisionsAppealsHubListsParams) {
    const {
        domainVisibleDecisions,
        appealPerspective,
        requestNeedsExecutorOutcome,
        previousFilter,
        previousProponentFilter,
        appealsProponentFilter,
        setPreviousProponentFilter,
        setAppealsProponentFilter,
    } = params;

    /** قرارات أصلية فقط (ليس نسخ طعن) — طابور المنفذ ثم الباقي زمنياً */
    const archiveHubDecisions = useMemo(() => {
        const originals = domainVisibleDecisions.filter(
            (d) =>
                !d.appealSourceDecisionId &&
                !d.isArchived &&
                !hubHasActiveAppealLedgerEntry(d)
        );
        const pending = originals.filter((d) => requestNeedsExecutorOutcome(d));
        const rest = originals.filter((d) => !requestNeedsExecutorOutcome(d));
        
        const sortedPending = sortDecisionsNewestFirst(pending);
        const sortedRest = sortDecisionsNewestFirstTerminatedManualLast(rest);

        return [...sortedPending, ...sortedRest];
    }, [domainVisibleDecisions, requestNeedsExecutorOutcome]);

    const archivePendingDecisions = useMemo(
        () => archiveHubDecisions.filter((d) => requestNeedsExecutorOutcome(d)),
        [archiveHubDecisions]
    );
    const archiveSettledDecisions = useMemo(
        () => archiveHubDecisions.filter((d) => !requestNeedsExecutorOutcome(d)),
        [archiveHubDecisions]
    );

    /** القرارات المؤرشفة */
    const archivedDecisions = useMemo(
        () =>
            sortDecisionsNewestFirst(
                domainVisibleDecisions.filter((d) => !d.appealSourceDecisionId && d.isArchived)
            ),
        [domainVisibleDecisions]
    );

    /** سجل الطعون: نسخ مسار الطعن + (للبيانات القديمة) صف واحد يضم مساراً مفتوحاً */
    const appealsHubDecisions = useMemo(
        () =>
            sortDecisionsAppealActivityNewestFirst(
                domainVisibleDecisions.filter((d) => {
                    if (manualExecutorAppealPipelineActive(d)) return true;
                    if (d.manualExecutorLedgerEntry === true) return false;
                    if (d.appealSourceDecisionId) {
                        const src = domainVisibleDecisions.find(
                            (x) => String(x.id) === String(d.appealSourceDecisionId)
                        );
                        if (src?.manualExecutorLedgerEntry === true) return false;
                        return true;
                    }
                    return decisionAppealPipelineActive(d, null);
                })
            ),
        [domainVisibleDecisions]
    );

    const previousHubFilterOptions = useMemo(
        () =>
            resolveAppealsHubFilterOptions(
                archiveSettledDecisions,
                domainVisibleDecisions,
                appealPerspective
            ),
        [appealPerspective, archiveSettledDecisions, domainVisibleDecisions]
    );

    const appealsHubFilterOptions = useMemo(
        () =>
            resolveAppealsHubFilterOptions(
                appealsHubDecisions,
                domainVisibleDecisions,
                appealPerspective
            ),
        [appealPerspective, appealsHubDecisions, domainVisibleDecisions]
    );

    const filteredPreviousSettledDecisions = useMemo(() => {
        return archiveSettledDecisions.filter((d) => {
            if (previousFilter === 'approved') {
                if (
                    d.executorOutcome !== 'approved' &&
                    d.executorOutcome !== 'alternative'
                ) {
                    return false;
                }
            } else if (previousFilter === 'rejected') {
                if (d.executorOutcome !== 'rejected') return false;
            }
            if (previousProponentFilter !== 'all') {
                if (
                    resolveAppealHubProponentCategory(
                        d,
                        domainVisibleDecisions,
                        appealPerspective
                    ) !== previousProponentFilter
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [
        appealPerspective,
        archiveSettledDecisions,
        domainVisibleDecisions,
        previousFilter,
        previousProponentFilter,
    ]);

    const filteredAppealsHubDecisions = useMemo(() => {
        if (appealsProponentFilter === 'all') return appealsHubDecisions;
        return appealsHubDecisions.filter(
            (d) =>
                resolveAppealHubProponentCategory(
                    d,
                    domainVisibleDecisions,
                    appealPerspective
                ) === appealsProponentFilter
        );
    }, [
        appealPerspective,
        appealsHubDecisions,
        appealsProponentFilter,
        domainVisibleDecisions,
    ]);

    useEffect(() => {
        if (
            previousProponentFilter !== 'all' &&
            previousHubFilterOptions.length > 0 &&
            !previousHubFilterOptions.includes(previousProponentFilter)
        ) {
            setPreviousProponentFilter('all');
        }
    }, [previousHubFilterOptions, previousProponentFilter]);

    useEffect(() => {
        if (
            appealsProponentFilter !== 'all' &&
            appealsHubFilterOptions.length > 0 &&
            !appealsHubFilterOptions.includes(appealsProponentFilter)
        ) {
            setAppealsProponentFilter('all');
        }
    }, [appealsHubFilterOptions, appealsProponentFilter]);

    return {
        archiveHubDecisions,
        archivePendingDecisions,
        archiveSettledDecisions,
        archivedDecisions,
        appealsHubDecisions,
        previousHubFilterOptions,
        appealsHubFilterOptions,
        filteredPreviousSettledDecisions,
        filteredAppealsHubDecisions,
    };
}
