import { lazy, Suspense } from 'react';

import { ForumPlumPage } from './CommunityScreen/forumPlumTheme';
import { CommunityScreenBody } from './CommunityScreen/components/CommunityScreenBody';
import { CommunityScreenAccessGate } from './CommunityScreen/components/CommunityScreenAccessGate';
import {
    useCommunityScreenController,
    type CommunityScreenControllerProps,
} from './CommunityScreen/hooks/useCommunityScreenController';

const LazyCommunityScreenOverlays = lazy(() =>
    import('./CommunityScreen/components/CommunityScreenOverlays').then((m) => ({
        default: m.CommunityScreenOverlays,
    })),
);

export type CommunityScreenProps = CommunityScreenControllerProps;

/** منتدى المحامي — orchestrator رفيع؛ المنطق في useCommunityScreenController */
export const CommunityScreen = (props: CommunityScreenProps) => {
    const { gateBlocked, accessGateProps, bodyProps, overlayProps } =
        useCommunityScreenController(props);

    if (gateBlocked) {
        return <CommunityScreenAccessGate {...accessGateProps} />;
    }

    return (
        <ForumPlumPage>
            <CommunityScreenBody {...bodyProps} />
            <Suspense fallback={null}>
                <LazyCommunityScreenOverlays {...overlayProps} />
            </Suspense>
        </ForumPlumPage>
    );
};
