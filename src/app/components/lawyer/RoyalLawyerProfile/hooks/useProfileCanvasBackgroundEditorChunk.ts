import { useLayoutEffect, useState } from 'react';
import {
    getCachedProfileCanvasBackgroundEditor,
    isProfileCanvasBgEditorResolved,
    loadProfileCanvasBgEditorModule,
    prefetchProfileCanvasBgEditorModule,
    type ProfileCanvasBackgroundEditorComponent,
} from '@/app/runtime/profileCanvasBgEditorLoader';

export function prefetchProfileCanvasBackgroundEditor(): void {
    prefetchProfileCanvasBgEditorModule();
}

export function useProfileCanvasBackgroundEditorChunk(open: boolean): {
    ready: boolean;
    error: boolean;
    retry: () => void;
    ProfileCanvasBackgroundEditor: ProfileCanvasBackgroundEditorComponent | null;
} {
    const [ready, setReady] = useState(() => isProfileCanvasBgEditorResolved());
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useLayoutEffect(() => {
        if (!open) {
            setReady(isProfileCanvasBgEditorResolved());
            setError(false);
            return;
        }

        if (isProfileCanvasBgEditorResolved()) {
            setReady(true);
            setError(false);
            return;
        }

        let cancelled = false;
        setReady(false);
        setError(false);

        void loadProfileCanvasBgEditorModule()
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
    }, [open, attempt]);

    return {
        ready,
        error,
        retry: () => setAttempt((n) => n + 1),
        ProfileCanvasBackgroundEditor: getCachedProfileCanvasBackgroundEditor(),
    };
}
