import type { CommunitySection } from './communitySectionState';
import { resolveHorizontalTabSwipe } from '@/app/utils/horizontalTabSwipe';

export const FORUM_SECTION_ORDER: readonly CommunitySection[] = ['forum', 'groups', 'repository'];

export function resolveForumSectionSwipe(
    active: CommunitySection,
    deltaX: number,
    deltaY: number,
    minDistancePx = 56,
): CommunitySection | null {
    return resolveHorizontalTabSwipe(FORUM_SECTION_ORDER, active, deltaX, deltaY, minDistancePx);
}
