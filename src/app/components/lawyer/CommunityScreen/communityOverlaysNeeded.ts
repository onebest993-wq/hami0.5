import type { CommunityScreenOverlaysProps } from './components/CommunityScreenOverlays.types';

/** طبقات عائمة مفتوحة — بلا ذلك لا يُحمَّل مصنع overlays على أول parse للخلاصة */
export function communityOverlaysNeeded(p: CommunityScreenOverlaysProps): boolean {
    return Boolean(
        p.activePostForComments ||
            p.isSearchOpen ||
            p.isAddQuestionOpen ||
            p.isCreateGroupOpen ||
            p.editingPostId ||
            p.pendingDeletePostId ||
            p.profileView,
    );
}
