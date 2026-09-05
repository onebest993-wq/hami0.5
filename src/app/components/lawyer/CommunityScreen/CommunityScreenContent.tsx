import { lazy, Suspense, useEffect } from 'react';

import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { ForumPlumPage } from './forumPlumTheme';
import { CommunityScreenBody } from './components/CommunityScreenBody';
import { CommunityScreenAccessGate } from './components/CommunityScreenAccessGate';
import { communityOverlaysNeeded } from './communityOverlaysNeeded';
import {
    useCommunityScreenController,
    type CommunityScreenControllerProps,
} from './hooks/useCommunityScreenController';
import { useForumRepositoryIndexRetry } from './hooks/useForumRepositoryIndexRetry';

const LazyCommunityScreenOverlays = lazy(() =>
    import('./components/CommunityScreenOverlays').then((m) => ({
        default: m.CommunityScreenOverlays,
    })),
);

export type CommunityScreenContentProps = CommunityScreenControllerProps & {
    /** false = سطح دافئ مخفي؛ true/undefined = مفتوح للعرض */
    isOpen?: boolean;
};

/**
 * نواة المنتدى — محتوى متزامن مع الغلاف (بلا BootShell للـ chunk).
 * طبقات overlays تُحمَّل عند فتح طبقة فقط حتى لا يُparse مصنع الخلاصة على أول طلاء.
 */
export function CommunityScreenContent(props: CommunityScreenContentProps) {
    const { gateBlocked, accessGateProps, bodyProps, overlayProps } =
        useCommunityScreenController(props);
    const surfaceOpen = props.isOpen !== false;
    useForumRepositoryIndexRetry(surfaceOpen);

    useEffect(() => {
        if (!surfaceOpen) return;
        ensureDeferredFeatureStylesLoaded();
    }, [surfaceOpen]);

    if (gateBlocked) {
        return <CommunityScreenAccessGate {...accessGateProps} onBack={props.onBack} />;
    }

    const overlaysLive = surfaceOpen && communityOverlaysNeeded(overlayProps);

    return (
        <ForumPlumPage>
            <CommunityScreenBody {...bodyProps} />
            {overlaysLive ? (
                <Suspense fallback={null}>
                    <LazyCommunityScreenOverlays {...overlayProps} />
                </Suspense>
            ) : null}
        </ForumPlumPage>
    );
}
