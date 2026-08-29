import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import {
    addQuestionImport,
    commentSheetImport,
    editPostImport,
    memberProfileImport,
    searchOverlayImport,
} from './communityScreenLazyEntries';

export function prefetchCommunityCommentOverlay(): void {
    if (typeof window === 'undefined') return;
    void commentSheetImport().catch(() => undefined);
}

export function prefetchCommunityAddQuestionOverlay(): void {
    if (typeof window === 'undefined') return;
    void addQuestionImport().catch(() => undefined);
}

export function prefetchCommunitySearchOverlay(): void {
    if (typeof window === 'undefined') return;
    void searchOverlayImport().catch(() => undefined);
}

export function prefetchCommunityEditPostOverlay(): void {
    if (typeof window === 'undefined') return;
    void editPostImport().catch(() => undefined);
}

/** بعد فتح الشاشة — prefetch مؤجَّل للملف الشخصي */
export function scheduleCommunityProfileOverlayPrefetch(): void {
    if (typeof window === 'undefined') return;
    scheduleIdleWork(() => {
        void memberProfileImport().catch(() => undefined);
    }, 4_000);
}
