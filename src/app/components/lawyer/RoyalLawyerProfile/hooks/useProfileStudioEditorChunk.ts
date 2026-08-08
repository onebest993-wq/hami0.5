import { useLayoutEffect, useState } from 'react';
import {
    getCachedImageBlockStudioEditor,
    getCachedTextBlockStudioEditor,
    isProfileStudioChunkResolved,
    loadProfileStudioChunk,
    prefetchProfileStudioChunk,
    type ImageBlockStudioEditorComponent,
    type TextBlockStudioEditorComponent,
} from '@/app/runtime/profileSettingsStudioTabsLoader';

export type ProfileStudioEditorKind = 'text' | 'image';

export function prefetchProfileStudioEditor(kind: ProfileStudioEditorKind): void {
    prefetchProfileStudioChunk(kind === 'text' ? 'textEditor' : 'imageEditor');
}

export function useProfileStudioEditorChunk(
    kind: ProfileStudioEditorKind | null,
    enabled: boolean,
): {
    ready: boolean;
    error: boolean;
    retry: () => void;
    TextBlockStudioEditor: TextBlockStudioEditorComponent | null;
    ImageBlockStudioEditor: ImageBlockStudioEditorComponent | null;
} {
    const chunk = kind === 'text' ? 'textEditor' : kind === 'image' ? 'imageEditor' : null;
    const [ready, setReady] = useState(() =>
        chunk ? isProfileStudioChunkResolved(chunk) : false,
    );
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useLayoutEffect(() => {
        if (!enabled || !chunk) {
            setReady(false);
            setError(false);
            return;
        }

        if (isProfileStudioChunkResolved(chunk)) {
            setReady(true);
            setError(false);
            return;
        }

        let cancelled = false;
        setReady(false);
        setError(false);

        void loadProfileStudioChunk(chunk)
            .then(() => {
                if (!cancelled) {
                    setReady(true);
                    setError(false);
                }
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });

        return () => {
            cancelled = true;
        };
    }, [attempt, chunk, enabled]);

    return {
        ready,
        error,
        retry: () => setAttempt((n) => n + 1),
        TextBlockStudioEditor: getCachedTextBlockStudioEditor(),
        ImageBlockStudioEditor: getCachedImageBlockStudioEditor(),
    };
}
