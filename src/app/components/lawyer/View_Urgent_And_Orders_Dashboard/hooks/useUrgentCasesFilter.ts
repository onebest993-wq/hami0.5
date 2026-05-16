import { useMemo } from 'react';
import { isUrgentCaseClosed, type UrgentCase } from '../../Component_Urgent_Card';
import type { FilterStatus } from '../types';

function normalizeSearchText(v: unknown) {
    return String(v ?? '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي');
}

type UseUrgentCasesFilterArgs = {
    cases: UrgentCase[];
    scope: 'active' | 'archive' | 'trash';
    filterStatus: FilterStatus;
    searchQuery: string;
};

export function useUrgentCasesFilter({ cases, scope, filterStatus, searchQuery }: UseUrgentCasesFilterArgs) {
    const sortedAndFilteredCases = useMemo(() => {
        const isFinalized = (c: UrgentCase) => isUrgentCaseClosed(c) || c.status === 'completed' || c.phase === 'completed';
        let filtered =
            scope === 'trash'
                ? cases.filter((c) => !!c.deleted)
                : scope === 'archive'
                  ? cases.filter((c) => !c.deleted && (!!c.archived || isFinalized(c)))
                  : cases.filter((c) => !c.deleted && !c.archived && !isFinalized(c));

        if (searchQuery.trim()) {
            const q = normalizeSearchText(searchQuery);
            filtered = filtered.filter((c) => {
                const haystack = [
                    c.applicantName,
                    c.actionType,
                    c.court,
                    c.requestNumber,
                    c.courtName,
                    c.judgeName,
                    c.party1Name,
                    c.party2Name,
                    c.specificActionType,
                ];
                return haystack.some((x) => normalizeSearchText(x).includes(q));
            });
        }

        if (filterStatus !== 'all') {
            if (filterStatus === 'critical') {
                filtered = filtered.filter((c) => c.status === 'critical');
            } else if (filterStatus === 'active') {
                filtered = filtered.filter((c) => c.status === 'warning' || c.status === 'safe');
            } else if (filterStatus === 'completed') {
                filtered = filtered.filter((c) => c.status === 'completed');
            }
        }

        return filtered;
    }, [cases, filterStatus, scope, searchQuery]);

    const criticalCases = useMemo(
        () => sortedAndFilteredCases.filter((c) => c.status === 'critical'),
        [sortedAndFilteredCases],
    );
    const pendingCases = useMemo(
        () =>
            sortedAndFilteredCases.filter(
                (c) => c.status === 'warning' || c.status === 'safe' || c.status === 'expired',
            ),
        [sortedAndFilteredCases],
    );
    const completedCases = useMemo(
        () => sortedAndFilteredCases.filter((c) => c.status === 'completed'),
        [sortedAndFilteredCases],
    );
    const archivedCases = useMemo(
        () => (scope === 'archive' ? sortedAndFilteredCases : []),
        [scope, sortedAndFilteredCases],
    );
    const trashedCases = useMemo(
        () => (scope === 'trash' ? sortedAndFilteredCases : []),
        [scope, sortedAndFilteredCases],
    );

    return {
        sortedAndFilteredCases,
        criticalCases,
        pendingCases,
        completedCases,
        archivedCases,
        trashedCases,
    };
}
