import { getSupabaseAuthConfigFromEnv } from '../../security/sessionCookie.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { resolvePasswordResetRedirectTo } from '../passwordResetRedirectAllowlist.ts';

const WINDOW_MS = 15 * 60_000;
const MAX_PER_IP = 10;
const MAX_PER_EMAIL = 4;

function readClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const firstHop = forwarded?.split(',')[0]?.trim();
    return firstHop || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * POST /api/auth/forgot-password — يطلب رابط استعادة من GoTrue.
 * الاستجابة دائماً عامة (لا تكشف وجود البريد).
 */
export async function POST(request: Request): Promise<Response> {
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Auth not configured' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    if (
        !(await consumeRateLimitSlot(readClientIp(request), {
            scope: 'auth-forgot-ip',
            maxRequests: MAX_PER_IP,
            windowMs: WINDOW_MS,
            fallbackToMemory: true,
        }))
    ) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Too many requests' }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Retry-After': String(Math.ceil(WINDOW_MS / 1000)),
                },
            }),
        );
    }

    let email = '';
    let redirectTo = '';
    try {
        const body = (await request.json()) as { email?: unknown; redirectTo?: unknown };
        email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo.trim() : '';
    } catch {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    if (!email || !email.includes('@')) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Valid email required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const emailAllowed = await consumeRateLimitSlot(email, {
        scope: 'auth-forgot-email',
        maxRequests: MAX_PER_EMAIL,
        windowMs: WINDOW_MS,
        fallbackToMemory: true,
    });

    const safeRedirect = resolvePasswordResetRedirectTo(redirectTo, request);

    if (emailAllowed) {
        try {
            const payload: Record<string, unknown> = { email };
            if (safeRedirect) payload.redirect_to = safeRedirect;
            await fetch(`${cfg.url}/auth/v1/recover`, {
                method: 'POST',
                headers: {
                    apikey: cfg.key,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        } catch {
            /* لا نكشف فشل الشبكة كوجود حساب */
        }
    }

    return applyWifeSecurityHeaders(
        new Response(
            JSON.stringify({
                ok: true,
                message: 'إن وُجد حساب بهذا البريد فستصلك رسالة لاستعادة كلمة المرور.',
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            },
        ),
    );
}
