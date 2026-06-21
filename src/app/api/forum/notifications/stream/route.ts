import {
    extractUserTokenFromRequest,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    assertWifeSignatureRequest,
    wifeUnauthorizedResponse,
} from '../../../security/wifeValidator.ts';
import { NotificationDB } from '../../../../services/lawyer-cloud.ts';

const POLL_MS = 2_000;
const MAX_DURATION_MS = 55_000;

export async function GET(request: Request): Promise<Response> {
    try {
        const userToken = extractUserTokenFromRequest(request);
        if (!userToken || !(await isTokenAuthorized(userToken))) {
            return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
        }
        const wifeBlock = await assertWifeSignatureRequest(request, userToken);
        if (wifeBlock) return wifeBlock;

        const userId = await getVerifiedTokenSubject(userToken);
        if (!userId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

        const encoder = new TextEncoder();
        const startedAt = Date.now();
        let lastSignature = '';

        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                const send = (payload: Record<string, unknown>) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                };

                const tick = async () => {
                    if (request.signal.aborted || Date.now() - startedAt > MAX_DURATION_MS) {
                        controller.close();
                        return false;
                    }
                    const notifications = await NotificationDB.getNotifications(userId);
                    const unreadCount = await NotificationDB.getUnreadCount(userId);
                    const latest = notifications[0] ?? null;
                    const signature = `${unreadCount}:${latest?.id ?? ''}:${latest?.createdAt ?? ''}`;
                    if (signature !== lastSignature) {
                        lastSignature = signature;
                        send({
                            unreadCount,
                            latestId: latest?.id ?? null,
                            notification: latest,
                        });
                    }
                    return true;
                };

                send({ type: 'connected', unreadCount: await NotificationDB.getUnreadCount(userId) });

                const loop = async () => {
                    const cont = await tick();
                    if (!cont) return;
                    setTimeout(() => void loop(), POLL_MS);
                };
                void loop();

                request.signal.addEventListener('abort', () => {
                    try {
                        controller.close();
                    } catch {
                        /* closed */
                    }
                });
            },
        });

        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        });
    } catch {
        return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    }
}
