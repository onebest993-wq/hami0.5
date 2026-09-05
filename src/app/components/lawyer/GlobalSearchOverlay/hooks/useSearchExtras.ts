import { useState, useEffect } from 'react';
import { NOTES_VAULT_CHANGED } from '@/app/services/notesSyncBridge';
import {
    getCachedGlobalSearchExtras,
    invalidateGlobalSearchExtrasCache,
    loadGlobalSearchExtras,
    type GlobalSearchExtras,
} from '@/app/services/globalSearchLoad';
import { getCachedProfileLine, resolveProfileLine } from '@/app/services/globalSearchProfileCache';

const FOCUS_REFRESH_MS = 800;
const OVERLAY_EXTRAS_OPTIONS = { includeCommunityPosts: true } as const;

interface UseSearchExtrasOptions {
    userId: string | null;
    overlayOpen?: boolean;
}

export function useSearchExtras({ userId, overlayOpen }: UseSearchExtrasOptions): {
    extras: GlobalSearchExtras | null;
    profileLine: string;
} {
    const extrasLoadOptions = overlayOpen ? OVERLAY_EXTRAS_OPTIONS : undefined;
    const [extrasVersion, setExtrasVersion] = useState(0);
    const [profileLine, setProfileLine] = useState(() => getCachedProfileLine(userId));
    const [extras, setExtras] = useState<GlobalSearchExtras | null>(() =>
        getCachedGlobalSearchExtras(userId, extrasLoadOptions),
    );

    useEffect(() => {
        if (!overlayOpen) {
            setExtras(getCachedGlobalSearchExtras(userId));
            return;
        }

        let cancelled = false;
        const cached = getCachedGlobalSearchExtras(userId, OVERLAY_EXTRAS_OPTIONS);
        if (cached) setExtras(cached);

        void (async () => {
            const [loadedExtras, line] = await Promise.all([
                loadGlobalSearchExtras(userId, OVERLAY_EXTRAS_OPTIONS),
                resolveProfileLine(userId),
            ]);
            if (cancelled) return;
            setExtras(loadedExtras);
            setProfileLine(line);
        })();

        return () => {
            cancelled = true;
        };
    }, [userId, extrasVersion, overlayOpen]);

    useEffect(() => {
        const onVault = () => {
            invalidateGlobalSearchExtrasCache(userId);
            setExtrasVersion((v) => v + 1);
        };
        window.addEventListener(NOTES_VAULT_CHANGED, onVault);
        return () => window.removeEventListener(NOTES_VAULT_CHANGED, onVault);
    }, [userId]);

    useEffect(() => {
        if (!overlayOpen) return;
        let cancelled = false;
        let timer: number | undefined;
        const focusedUserId = userId;
        const onFocus = () => {
            if (timer !== undefined) window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                void loadGlobalSearchExtras(focusedUserId, OVERLAY_EXTRAS_OPTIONS).then((loaded) => {
                    if (cancelled) return;
                    setExtras(loaded);
                });
            }, FOCUS_REFRESH_MS);
        };
        window.addEventListener('focus', onFocus);
        return () => {
            cancelled = true;
            window.removeEventListener('focus', onFocus);
            if (timer !== undefined) window.clearTimeout(timer);
        };
    }, [overlayOpen, userId]);

    return { extras, profileLine };
}
