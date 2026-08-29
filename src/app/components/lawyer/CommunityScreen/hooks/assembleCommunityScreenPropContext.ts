import type { CommunityScreenPropBuilderContext } from './communityScreenPropBuilders';
import type { AssembleCommunityScreenPropContextParams } from './assembleCommunityScreenPropContext.types';
import { assembleCommunityScreenChromePropSlice } from './assembleCommunityScreenChromePropSlice';
import { assembleCommunityScreenFeedPropSlice } from './assembleCommunityScreenFeedPropSlice';
import { assembleCommunityScreenOverlayPropSlice } from './assembleCommunityScreenOverlayPropSlice';

export function assembleCommunityScreenPropContext(
    params: AssembleCommunityScreenPropContextParams,
): CommunityScreenPropBuilderContext {
    return {
        ...assembleCommunityScreenChromePropSlice(params),
        ...assembleCommunityScreenFeedPropSlice(params),
        ...assembleCommunityScreenOverlayPropSlice(params),
    };
}
