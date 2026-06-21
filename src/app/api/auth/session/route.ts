import {
    parseAccessCookie,
} from '../../security/sessionCookie.ts';
import {
    isTokenAuthorized,
    wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { getSupabaseAuthConfigFromEnv } from '../../security/sessionCookie.ts';
import { deriveClientCryptoWrapCredential } from '../../security/cryptoWrapServer.ts';

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

/** GET /api/auth/session — جلسة HttpOnly (لا tokens في JSON). */
export async function GET(request: Request): Promise<Response> {
    const token = parseAccessCookie(request.headers.get('cookie'));
    if (!token || !(await isTokenAuthorized(token))) {
        return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }

    const user = await fetchSupabaseUser(token);
    if (!user?.id) {
        return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }

    const cryptoWrapCredential = await deriveClientCryptoWrapCredential(token);

    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: true, user, cryptoWrapCredential }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
    );
}
