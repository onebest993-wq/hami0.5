import {
    requireWifeCloudWrite,
    unwrapWifeUser,
} from '../security/bffAuth.ts';
import { sanitizePayload } from '../security/sanitizer.ts';

export function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
}

export function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object';
}

export async function requireTaskHelpAuth(
    request: Request,
): Promise<{ userId: string } | Response> {
    const auth = await requireWifeCloudWrite(request);
    const unwrapped = unwrapWifeUser(auth);
    if ('response' in unwrapped) return unwrapped.response;
    return { userId: unwrapped.userId };
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
    try {
        const payload = sanitizePayload(await request.json());
        return isRecord(payload) ? payload : null;
    } catch {
        return null;
    }
}
