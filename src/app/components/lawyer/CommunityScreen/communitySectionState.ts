export type CommunitySection = 'forum' | 'repository';

const SECTION_KEY = 'hami:community-section';

export function readPersistedCommunitySection(): CommunitySection {
    if (typeof window === 'undefined') return 'forum';
    try {
        const saved = sessionStorage.getItem(SECTION_KEY);
        if (saved === 'repository' || saved === 'forum') return saved;
    } catch {
        /* ignore */
    }
    return 'forum';
}

export function persistCommunitySection(section: CommunitySection): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(SECTION_KEY, section);
    } catch {
        /* ignore */
    }
}
