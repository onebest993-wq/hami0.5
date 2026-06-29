import {

    extractUserTokenFromRequest,

    getVerifiedTokenSubject,

    isTokenAuthorized,

    assertWifeSignatureRequest,

    wifeUnauthorizedResponse,

} from '../../../security/wifeValidator.ts';

import { ServerNotificationDB } from '../../../../services/notifications/notificationForumStorage.server.ts';



const POLL_MS_MIN = 2_000;

const POLL_MS_MAX = 10_000;

const MAX_DURATION_MS = 55_000;



function resolveLastEventId(request: Request): string {

    const header = request.headers.get('Last-Event-ID')?.trim();

    if (header) return header;

    const url = new URL(request.url);

    return url.searchParams.get('lastEventId')?.trim() ?? '';

}



function nextPollDelayMs(stableTicks: number, currentMs: number): number {

    if (stableTicks < 2) return POLL_MS_MIN;

    return Math.min(POLL_MS_MAX, currentMs * 2);

}



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

        let lastSentEventId = resolveLastEventId(request);

        let pollDelayMs = POLL_MS_MIN;

        let stableTicks = 0;

        let timeoutId: ReturnType<typeof setTimeout> | null = null;



        const stream = new ReadableStream<Uint8Array>({

            async start(controller) {

                const send = (payload: Record<string, unknown>, eventId?: string | null) => {

                    if (eventId) {

                        controller.enqueue(encoder.encode(`id: ${eventId}\n`));

                        lastSentEventId = eventId;

                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

                };



                const tick = async (): Promise<boolean> => {

                    if (request.signal.aborted || Date.now() - startedAt > MAX_DURATION_MS) {

                        return false;

                    }



                    const notifications = await ServerNotificationDB.getNotifications(userId);

                    const unreadCount = await ServerNotificationDB.getUnreadCount(userId);

                    const latest = notifications[0] ?? null;

                    const latestId = latest?.id ?? null;



                    if (latestId && latestId !== lastSentEventId) {

                        stableTicks = 0;

                        pollDelayMs = POLL_MS_MIN;

                        send(

                            {

                                type: 'notification',

                                unreadCount,

                                latestId,

                                notification: latest,

                            },

                            latestId,

                        );

                    } else if (lastSentEventId === '' && latest) {

                        stableTicks = 0;

                        pollDelayMs = POLL_MS_MIN;

                        send(

                            {

                                type: 'snapshot',

                                unreadCount,

                                latestId,

                                notification: latest,

                            },

                            latestId,

                        );

                    } else {

                        stableTicks += 1;

                        pollDelayMs = nextPollDelayMs(stableTicks, pollDelayMs);

                    }



                    return true;

                };



                send({

                    type: 'connected',

                    unreadCount: await ServerNotificationDB.getUnreadCount(userId),

                });



                const loop = async () => {

                    const cont = await tick();

                    if (!cont) {

                        if (timeoutId) clearTimeout(timeoutId);

                        try {

                            controller.close();

                        } catch {

                            /* closed */

                        }

                        return;

                    }

                    timeoutId = setTimeout(() => void loop(), pollDelayMs);

                };

                timeoutId = setTimeout(() => void loop(), pollDelayMs);



                request.signal.addEventListener('abort', () => {

                    if (timeoutId) clearTimeout(timeoutId);

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


