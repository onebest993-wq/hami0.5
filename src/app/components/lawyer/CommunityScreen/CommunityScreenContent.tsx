import { useEffect } from 'react';

import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { ForumPlumPage } from './forumPlumTheme';
import { CommunityScreenBody } from './components/CommunityScreenBody';
import { CommunityScreenAccessGate } from './components/CommunityScreenAccessGate';
import { CommunityScreenOverlays } from './components/CommunityScreenOverlays';
import {
    useCommunityScreenController,
    type CommunityScreenControllerProps,
} from './hooks/useCommunityScreenController';

export type CommunityScreenContentProps = CommunityScreenControllerProps & {
    /** false = سطح دافئ مخفي؛ true/undefined = مفتوح للعرض */
    isOpen?: boolean;
};

/**
 * نواة المنتدى — محتوى متزامن مع الغلاف (بلا BootShell للـ chunk).
 */
export function CommunityScreenContent(props: CommunityScreenContentProps) {
    const { gateBlocked, accessGateProps, bodyProps, overlayProps } =
        useCommunityScreenController(props);
    const surfaceOpen = props.isOpen !== false;

    useEffect(() => {
        ensureDeferredFeatureStylesLoaded();
    }, []);

    if (gateBlocked) {
        return <CommunityScreenAccessGate {...accessGateProps} onBack={props.onBack} />;
    }

    return (
        <ForumPlumPage>
            <CommunityScreenBody {...bodyProps} />
            {surfaceOpen ? <CommunityScreenOverlays {...overlayProps} /> : null}
        </ForumPlumPage>
    );
}
