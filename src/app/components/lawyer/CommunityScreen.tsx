import { useEffect } from 'react';

import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { ForumPlumPage } from './CommunityScreen/forumPlumTheme';
import { CommunityScreenBody } from './CommunityScreen/components/CommunityScreenBody';
import { CommunityScreenAccessGate } from './CommunityScreen/components/CommunityScreenAccessGate';
import { CommunityScreenOverlays } from './CommunityScreen/components/CommunityScreenOverlays';
import {
    useCommunityScreenController,
    type CommunityScreenControllerProps,
} from './CommunityScreen/hooks/useCommunityScreenController';

export type CommunityScreenProps = CommunityScreenControllerProps;

/** منتدى المحامي — orchestrator رفيع؛ المنطق في useCommunityScreenController */
export const CommunityScreen = (props: CommunityScreenProps) => {
    const { gateBlocked, accessGateProps, bodyProps, overlayProps } =
        useCommunityScreenController(props);

    useEffect(() => {
        ensureDeferredFeatureStylesLoaded();
    }, []);

    if (gateBlocked) {
        return <CommunityScreenAccessGate {...accessGateProps} onBack={props.onBack} />;
    }

    return (
        <ForumPlumPage>
            <CommunityScreenBody {...bodyProps} />
            <CommunityScreenOverlays {...overlayProps} />
        </ForumPlumPage>
    );
};
