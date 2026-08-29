import {
    CommunityScreenBrowseMidOverlays,
    CommunityScreenBrowseProfileOverlay,
} from './CommunityScreenBrowseOverlays';
import {
    CommunityScreenComposeEarlyOverlays,
    CommunityScreenComposeLateOverlays,
} from './CommunityScreenComposeOverlays';
import type { CommunityScreenOverlaysProps } from './CommunityScreenOverlays.types';

export type { CommunityScreenOverlaysProps } from './CommunityScreenOverlays.types';

/** طبقات المنتدى العائمة — ترتيب DOM مطابق للأصل حتى لا يتغيّر التكديس */
export function CommunityScreenOverlays(props: CommunityScreenOverlaysProps) {
    return (
        <>
            <CommunityScreenComposeEarlyOverlays {...props} />
            <CommunityScreenBrowseMidOverlays {...props} />
            <CommunityScreenComposeLateOverlays {...props} />
            <CommunityScreenBrowseProfileOverlay {...props} />
        </>
    );
}
