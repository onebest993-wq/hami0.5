export const HOME_HUB_SECRETARY_PREVIEW_MAX = 3;

export function splitHomeHubSecretaryNudges<T>(nudges: T[]): {
    preview: T[];
    overflowCount: number;
    hasOverflow: boolean;
} {
    if (nudges.length <= HOME_HUB_SECRETARY_PREVIEW_MAX) {
        return { preview: nudges, overflowCount: 0, hasOverflow: false };
    }
    return {
        preview: nudges.slice(0, HOME_HUB_SECRETARY_PREVIEW_MAX),
        overflowCount: nudges.length - HOME_HUB_SECRETARY_PREVIEW_MAX,
        hasOverflow: true,
    };
}
