import { useMemo } from 'react';
import {
    buildCommunityScreenBodyProps,
    buildCommunityScreenOverlayProps,
    type CommunityScreenPropBuilderContext,
} from './communityScreenPropBuilders';
import { communityScreenPropModelMemoInputs } from './communityScreenPropModelDeps';

export function useCommunityScreenPropModel(ctx: CommunityScreenPropBuilderContext) {
    const propBuilderCtx = useMemo(
        (): CommunityScreenPropBuilderContext => ctx,
        // eslint-disable-next-line react-hooks/exhaustive-deps -- قائمة الحقول في communityScreenPropModelMemoInputs
        communityScreenPropModelMemoInputs(ctx),
    );

    const bodyProps = useMemo(
        () => buildCommunityScreenBodyProps(propBuilderCtx),
        [propBuilderCtx],
    );
    const overlayProps = useMemo(
        () => buildCommunityScreenOverlayProps(propBuilderCtx),
        [propBuilderCtx],
    );

    return { bodyProps, overlayProps };
}
