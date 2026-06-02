import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'hami:forum:muted-users:v1';

/**
 * Mute user (محلي على الجهاز).
 * يخفي منشورات وتعليقات مستخدمين معيّنين دون حظرهم على السيرفر.
 * بياناتها مرتبطة بـ currentUserId كي لا تتسرّب بين الحسابات على نفس الجهاز.
 */
export function useMutedUsers(currentUserId: string | null): {
    mutedIds: Set<string>;
    isMuted: (userId: string) => boolean;
    toggleMute: (userId: string) => void;
    clearMutes: () => void;
} {
    const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());

    const storageKey = currentUserId ? `${STORAGE_KEY}:${currentUserId}` : null;

    useEffect(() => {
        if (!storageKey) {
            setMutedIds(new Set());
            return;
        }
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw) as unknown;
                if (Array.isArray(parsed)) {
                    setMutedIds(new Set(parsed.filter((x) => typeof x === 'string')));
                    return;
                }
            }
        } catch { /* ignore */ }
        setMutedIds(new Set());
    }, [storageKey]);

    const persist = useCallback(
        (next: Set<string>) => {
            if (!storageKey) return;
            try {
                window.localStorage.setItem(storageKey, JSON.stringify([...next]));
            } catch { /* quota */ }
        },
        [storageKey],
    );

    const isMuted = useCallback((userId: string) => mutedIds.has(userId), [mutedIds]);

    const toggleMute = useCallback(
        (userId: string) => {
            if (!userId || !currentUserId || userId === currentUserId) return;
            setMutedIds((prev) => {
                const next = new Set(prev);
                if (next.has(userId)) next.delete(userId);
                else next.add(userId);
                persist(next);
                return next;
            });
        },
        [currentUserId, persist],
    );

    const clearMutes = useCallback(() => {
        setMutedIds(new Set());
        if (storageKey) {
            try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
        }
    }, [storageKey]);

    return { mutedIds, isMuted, toggleMute, clearMutes };
}
