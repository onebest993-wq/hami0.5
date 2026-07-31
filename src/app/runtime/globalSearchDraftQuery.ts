/** مسودة استعلام أثناء InstantShell — تُسلَّم للـ Overlay عند اعتماد الـ chunk */

import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';

let draftQuery = '';

export function writeGlobalSearchDraftQuery(value: string): void {
    draftQuery = clampGlobalSearchQuery(typeof value === 'string' ? value : '');
}

export function peekGlobalSearchDraftQuery(): string {
    return draftQuery;
}

export function takeGlobalSearchDraftQuery(): string {
    const next = draftQuery;
    draftQuery = '';
    return next;
}

export function clearGlobalSearchDraftQuery(): void {
    draftQuery = '';
}

/** للاختبارات */
export function resetGlobalSearchDraftQueryForTests(): void {
    draftQuery = '';
}
