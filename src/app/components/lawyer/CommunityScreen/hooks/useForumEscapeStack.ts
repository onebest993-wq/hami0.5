import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { resolveForumEscapeAction } from '@/app/components/lawyer/CommunityScreen/forumEscapeStack';
import {
    getForumRepositoryEscapeSnapshot,
    subscribeForumRepositoryEscape,
} from '@/app/components/lawyer/CommunityScreen/forumRepositoryEscapeBridge';
import { isForumAddQuestionFilePickerGraceActive } from '@/app/components/lawyer/CommunityScreen/forumAddQuestionFilePickerGrace';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import {
    applyForumEscapeAction,
    buildForumEscapeHandlers,
    buildForumEscapeSnapshot,
} from './forumEscapeApply';
import type { UseForumEscapeStackParams } from './useForumEscapeStack.types';

export type { UseForumEscapeStackParams } from './useForumEscapeStack.types';

/**
 * Escape + native back + زر رجوع الشريط — نفس مكدس الطبقات (الداخل أولاً ثم الخروج).
 */
export function useForumEscapeStack(params: UseForumEscapeStackParams): {
    popForumLayer: () => boolean;
} {
    const paramsRef = useRef(params);
    paramsRef.current = params;

    const repositoryEscape = useSyncExternalStore(
        subscribeForumRepositoryEscape,
        getForumRepositoryEscapeSnapshot,
        getForumRepositoryEscapeSnapshot,
    );
    const repositoryEscapeRef = useRef(repositoryEscape);
    repositoryEscapeRef.current = repositoryEscape;

    const popForumLayer = useCallback((): boolean => {
        const p = paramsRef.current;
        if (p.enabled === false) return false;
        const action = resolveForumEscapeAction(buildForumEscapeSnapshot(p, repositoryEscapeRef.current));
        if (action === 'close-add-question' && isForumAddQuestionFilePickerGraceActive()) {
            return true;
        }
        applyForumEscapeAction(action, buildForumEscapeHandlers(p));
        return true;
    }, []);

    useEffect(() => {
        if (params.enabled === false) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            popForumLayer();
        };

        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(popForumLayer);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [params.enabled, popForumLayer]);

    return { popForumLayer };
}
