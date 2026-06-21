import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { emitForumUnreadCount } from '@/app/services/forum/forumNotificationBridge';
import { PushNotificationService } from '@/app/services/PushNotificationService';

export type ForumStreamPayload = {
    type?: 'connected';
    unreadCount: number;
    latestId?: string | null;
    notification?: ForumNotification | null;
};

type StreamHandler = (payload: ForumStreamPayload) => void;

let running = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushedId: string | null = null;
const handlers = new Set<StreamHandler>();

function parseSseChunk(buffer: string): { events: ForumStreamPayload[]; rest: string } {
    const events: ForumStreamPayload[] = [];
    const parts = buffer.split('\n\n');
    const rest = parts.pop() ?? '';
    for (const part of parts) {
        for (const line of part.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw) continue;
            try {
                events.push(JSON.parse(raw) as ForumStreamPayload);
            } catch {
                /* skip */
            }
        }
    }
    return { events, rest };
}

async function consumeStream(onPayload: StreamHandler, signal: AbortSignal): Promise<void> {
        const response = await SecureAPIClient.fetchSecureResponse('/api/forum/notifications/stream', {
            method: 'GET',
            signal,
            headers: { Accept: 'text/event-stream' },
        });

    if (!response.ok || !response.body) {
        throw new Error(`stream ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseChunk(buffer);
        buffer = rest;
        for (const ev of events) onPayload(ev);
    }
}

function dispatchPayload(payload: ForumStreamPayload): void {
    if (typeof payload.unreadCount === 'number') {
        emitForumUnreadCount(payload.unreadCount, { refresh: true });
    }

    const notif = payload.notification;
    if (notif && !notif.read && notif.id && notif.id !== lastPushedId) {
        lastPushedId = notif.id;
        void PushNotificationService.notifyForumActivity({
            title: notif.title,
            message: notif.message,
            postId: notif.postId,
            type: notif.type,
        });
    }

    for (const h of handlers) h(payload);
}

function scheduleReconnect(userId: string): void {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (running) void ForumNotificationStreamService.start(userId);
    }, 3_000);
}

export const ForumNotificationStreamService = {
    isRunning(): boolean {
        return running;
    },

    subscribe(handler: StreamHandler): () => void {
        handlers.add(handler);
        return () => handlers.delete(handler);
    },

    async start(userId: string | null): Promise<void> {
        if (!userId || typeof window === 'undefined') return;
        this.stop();
        running = true;

        const controller = new AbortController();
        (this as { _abort?: AbortController })._abort = controller;

        try {
            await consumeStream(dispatchPayload, controller.signal);
        } catch {
            /* reconnect below */
        } finally {
            if (running && !controller.signal.aborted) {
                scheduleReconnect(userId);
            }
        }
    },

    stop(): void {
        running = false;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        const abort = (this as { _abort?: AbortController })._abort;
        abort?.abort();
        (this as { _abort?: AbortController })._abort = undefined;
    },
};
