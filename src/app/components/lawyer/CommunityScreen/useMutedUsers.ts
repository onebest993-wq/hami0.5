import { useCallback, useEffect, useState } from 'react';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';

const STORAGE_KEY = 'hami:forum:muted-users:v1';

type MuteListResponse = { ok: boolean; mutedIds?: string[] };
type MuteToggleResponse = { ok: boolean; muted?: boolean };

/**
 * Mute user — كتم على الخادم مع كاش محلي فوري.
 * يخفي منشورات وتعليقات مستخدمين معيّنين دون حظرهم، ويُخمد إشعاراتهم على الخادم.
 * الكاش المحلي (localStorage) مرتبط بـ currentUserId لتفادي التسرّب بين الحسابات،
 * ويُزامَن مع الخادم عند التوفر لضمان الاستمرار عبر الأجهزة.
 */
export function useMutedUsers(currentUserId: string | null): {
    mutedIds: Set<string>;
    isMuted: (userId: string) => boolean;
    toggleMute: (userId: string) => void;
    clearMutes: () => void;
} {
    const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());

    const storageKey = currentUserId ? `${STORAGE_KEY}:${currentUserId}` : null;

    const persist = useCallback(
        (next: Set<string>) => {
            if (!storageKey) return;
            try {
                window.localStorage.setItem(storageKey, JSON.stringify([...next]));
            } catch { /* quota */ }
        },
        [storageKey],
    );

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
                }
            } else {
                setMutedIds(new Set());
            }
        } catch {
            setMutedIds(new Set());
        }
    }, [storageKey]);

    // مزامنة من الخادم — مصدر الحقيقة عبر الأجهزة (لا يفشل بصمت على العميل)
    useEffect(() => {
        if (!currentUserId) return;
        let cancelled = false;
        void (async () => {
            try {
                const res = await SecureAPIClient.fetchSecure<MuteListResponse>('/api/forum/mute', {
                    method: 'GET',
                });
                if (cancelled || !res?.ok || !Array.isArray(res.mutedIds)) return;
                const serverSet = new Set(res.mutedIds.filter((x) => typeof x === 'string'));
                setMutedIds((prev) => {
                    const same = prev.size === serverSet.size && [...prev].every((id) => serverSet.has(id));
                    if (same) return prev;
                    persist(serverSet);
                    return serverSet;
                });
            } catch {
                /* الكاش المحلي يكفي عند تعذّر الوصول */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [currentUserId, persist]);

    const isMuted = useCallback((userId: string) => mutedIds.has(userId), [mutedIds]);

    const toggleMute = useCallback(
        (userId: string) => {
            if (!userId || !currentUserId || userId === currentUserId) return;

            const willMute = !mutedIds.has(userId);
            setMutedIds((prev) => {
                const next = new Set(prev);
                if (willMute) next.add(userId);
                else next.delete(userId);
                persist(next);
                return next;
            });

            void (async () => {
                try {
                    await SecureAPIClient.fetchSecure<MuteToggleResponse>('/api/forum/mute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            targetUserId: userId,
                            action: willMute ? 'mute' : 'unmute',
                        }),
                    });
                } catch {
                    // تراجع عن التغيير المتفائل عند فشل الخادم
                    setMutedIds((prev) => {
                        const next = new Set(prev);
                        if (willMute) next.delete(userId);
                        else next.add(userId);
                        persist(next);
                        return next;
                    });
                }
            })();
        },
        [currentUserId, mutedIds, persist],
    );

    const clearMutes = useCallback(() => {
        const previous = [...mutedIds];
        setMutedIds(new Set());
        if (storageKey) {
            try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
        }
        if (currentUserId) {
            void Promise.allSettled(
                previous.map((userId) =>
                    SecureAPIClient.fetchSecure('/api/forum/mute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetUserId: userId, action: 'unmute' }),
                    }),
                ),
            );
        }
    }, [currentUserId, mutedIds, storageKey]);

    return { mutedIds, isMuted, toggleMute, clearMutes };
}
