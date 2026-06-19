import { useState, useEffect, useCallback } from 'react';
import { NOTES_VAULT_CHANGED } from '@/app/services/notesSyncBridge';
import {
    getCachedGlobalSearchExtras,
    invalidateGlobalSearchExtrasCache,
    loadGlobalSearchExtras,
    type GlobalSearchExtras,
} from '@/app/services/globalSearchLoad';
import { getCachedProfileLine, resolveProfileLine } from '@/app/services/globalSearchProfileCache';

const FOCUS_REFRESH_MS = 800;

export interface UseSearchExtrasOptions {
    userId: string | null;
    overlayOpen?: boolean;
}

export interface UseSearchExtrasReturn {
    extras: GlobalSearchExtras | null;
    profileLine: string;
    isLoadingExtras: boolean;
    reloadExtras: () => void;
}

export function useSearchExtras({ userId, overlayOpen }: UseSearchExtrasOptions): UseSearchExtrasReturn {
    const [extrasVersion, setExtrasVersion] = useState(0);
    const [profileLine, setProfileLine] = useState(() => getCachedProfileLine(userId));
    const [extras, setExtras] = useState<GlobalSearchExtras | null>(() => getCachedGlobalSearchExtras(userId));
    const [isLoadingExtras, setIsLoadingExtras] = useState(() => !getCachedGlobalSearchExtras(userId));

    useEffect(() => {
        let cancelled = false;
        const cached = getCachedGlobalSearchExtras(userId);
        if (cached) {
            setExtras(cached);
            setIsLoadingExtras(false);
        } else {
            setIsLoadingExtras(true);
        }

        void (async () => {
            try {
                const [loadedExtras, line] = await Promise.all([
                    loadGlobalSearchExtras(userId),
                    resolveProfileLine(userId),
                ]);
                if (cancelled) return;
                setExtras(loadedExtras);
                setProfileLine(line);
            } finally {
                if (!cancelled) setIsLoadingExtras(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId, extrasVersion]);

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
        let timer: number | undefined;
        const onFocus = () => {
            if (timer !== undefined) window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                invalidateGlobalSearchExtrasCache(userId);
                setExtrasVersion((v) => v + 1);
            }, FOCUS_REFRESH_MS);
        };
        window.addEventListener('focus', onFocus);
        return () => {
            window.removeEventListener('focus', onFocus);
            if (timer !== undefined) window.clearTimeout(timer);
        };
    }, [overlayOpen, userId]);

    const reloadExtras = useCallback(() => {
        invalidateGlobalSearchExtrasCache(userId);
        setExtrasVersion((v) => v + 1);
    }, [userId]);

    return { extras, profileLine, isLoadingExtras, reloadExtras };
}
