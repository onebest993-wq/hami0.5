import { useMemo } from 'react';
import {
    isUrgentCaseInActiveScope,
    isUrgentCaseInArchiveScope,
    isUrgentCaseTrashed,
    type UrgentCase,
} from '../../Component_Urgent_Card';
import { archiveTextMatchesQuery } from '@/app/services/search/normalizeArabicSearch';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';

type UseUrgentCasesFilterArgs = {
    cases: UrgentCase[];
    scope: 'active' | 'archive' | 'trash';
    searchQuery: string;
};

export function useUrgentCasesFilter({ cases, scope, searchQuery }: UseUrgentCasesFilterArgs) {
    const sortedAndFilteredCases = useMemo(() => {
        let filtered =
            scope === 'trash'
                ? cases.filter(isUrgentCaseTrashed)
                : scope === 'archive'
                  ? cases.filter(isUrgentCaseInArchiveScope)
                  : cases.filter(isUrgentCaseInActiveScope);

        const q = clampGlobalSearchQuery(searchQuery);
        if (q.trim()) {
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
                ].join(' ');
                return archiveTextMatchesQuery(haystack, q);
            });
        }

        return filtered;
    }, [cases, scope, searchQuery]);

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
        archivedCases,
        trashedCases,
    };
}
