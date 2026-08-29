/**
 * Node IncomingMessage ↔ Fetch Request/Response for Vite and Vercel.
 *
 * Two real failures lived here:
 * 1. `res.setHeader('Set-Cookie', …)` on each forEach tick keeps only the last
 *    cookie — login/refresh send access + refresh, so the browser stored refresh
 *    only and every access-cookie route (session, OTP) returned 401.
 * 2. Undici forbids `Cookie` on `Request`. The browser still sends it to Node;
 *    we copy it onto a dedicated header after dropping any client-spoofed value.
 */
import type { IncomingHttpHeaders } from 'node:http';

import { INCOMING_COOKIE_FALLBACK_HEADER } from './sessionCookie.ts';

export type NodeHeaderMap = IncomingHttpHeaders | Record<string, string | string[] | undefined>;

export type NodeResponseHeaderSink = {
    setHeader: (name: string, value: number | string | readonly string[]) => void;
};

const HOP_BY_HOP = new Set([
    'host',
    'connection',
    'keep-alive',
    'proxy-connection',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
    'http2-settings',
    'content-length',
    INCOMING_COOKIE_FALLBACK_HEADER,
]);

const RESPONSE_HOP = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie']);

function headerValue(value: string | string[]): string {
    return Array.isArray(value) ? value.join(', ') : value;
}

function readNodeCookie(headers: NodeHeaderMap): string | null {
    const raw = headers.cookie;
    if (typeof raw === 'string' && raw.trim()) return raw;
    if (Array.isArray(raw) && raw.length > 0) {
        const joined = raw.filter((part) => typeof part === 'string' && part.trim()).join('; ');
        return joined.trim() ? joined : null;
    }
    return null;
}

export function nodeHeadersToWebHeaders(incoming: NodeHeaderMap, extraSkip?: Iterable<string>): Headers {
    const skip = extraSkip ? new Set([...HOP_BY_HOP, ...extraSkip]) : HOP_BY_HOP;
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming)) {
        if (value === undefined) continue;
        if (skip.has(key.toLowerCase())) continue;
        headers.set(key, headerValue(value));
    }
    const cookie = readNodeCookie(incoming);
    if (cookie) {
        try {
            headers.set('cookie', cookie);
        } catch {
            /* undici may reject Cookie as a forbidden request header */
        }
        headers.set(INCOMING_COOKIE_FALLBACK_HEADER, cookie);
    }
    return headers;
}

/** Node 24 + TS 5.9: Uint8Array<ArrayBufferLike> is not BodyInit; copy onto ArrayBuffer. */
function nodeBytesToRequestBody(body: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(body.byteLength);
    copy.set(body);
    return copy.buffer;
}

export function createWebRequestFromNode(
    url: string,
    req: { method?: string; headers: NodeHeaderMap },
    body?: Uint8Array,
): Request {
    const method = (req.method ?? 'GET').toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';
    return new Request(url, {
        method,
        headers: nodeHeadersToWebHeaders(req.headers),
        body: hasBody && body?.byteLength ? nodeBytesToRequestBody(body) : undefined,
    });
}

function collectSetCookieHeaders(webRes: Response): string[] {
    if (typeof webRes.headers.getSetCookie === 'function') {
        return webRes.headers.getSetCookie();
    }
    const single = webRes.headers.get('set-cookie');
    return single?.trim() ? [single] : [];
}

export function applyWebResponseHeadersToNode(nodeRes: NodeResponseHeaderSink, webRes: Response): void {
    webRes.headers.forEach((value, key) => {
        if (RESPONSE_HOP.has(key.toLowerCase())) return;
        nodeRes.setHeader(key, value);
    });
    const cookies = collectSetCookieHeaders(webRes);
    if (cookies.length > 0) {
        nodeRes.setHeader('Set-Cookie', cookies);
    }
}
