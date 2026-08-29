import {
    readAccessTokenFromRequest,
} from '../../security/sessionCookie.ts';
import {
    isTokenAuthorized,
} from '../../security/wifeValidator.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { getSupabaseAuthConfigFromEnv } from '../../security/sessionCookie.ts';
import { deriveClientCryptoWrapCredential } from '../../security/cryptoWrapServer.ts';
import { isPlatformAdminUserId } from '../../security/roleResolver.ts';

async function fetchSupabaseUser(accessToken: string): Promise<Record<string, unknown> | null> {
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) return null;
    try {
        const res = await fetch(`${cfg.url}/auth/v1/user`, {
            headers: {
                apikey: cfg.key,
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!res.ok) return null;
        return (await res.json()) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function anonymousSessionResponse(): Response {
    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: true, user: null, isAdmin: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
    );
}

/** GET /api/auth/session — جلسة HttpOnly (لا tokens في JSON). */
export async function GET(request: Request): Promise<Response> {
    const token = readAccessTokenFromRequest(request);
    if (!token || !(await isTokenAuthorized(token))) {
        return anonymousSessionResponse();
    }

    const user = await fetchSupabaseUser(token);
    if (!user?.id) {
        return anonymousSessionResponse();
    }

    const cryptoWrapCredential = await deriveClientCryptoWrapCredential(token);
    const userId = typeof user.id === 'string' ? user.id : '';
    const liveEmail = typeof user.email === 'string' ? user.email : null;
    let isAdmin = false;
    try {
        isAdmin = await isPlatformAdminUserId(userId, liveEmail);
    } catch {
        isAdmin = false;
    }

    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: true, user, cryptoWrapCredential, isAdmin }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
    );
}
