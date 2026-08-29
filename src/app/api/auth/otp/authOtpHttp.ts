import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';

export function readAuthOtpClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const firstHop = forwarded?.split(',')[0]?.trim();
    return firstHop || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function authOtpJson(status: number, body: Record<string, unknown>): Response {
    return applyWifeSecurityHeaders(
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
    );
}
