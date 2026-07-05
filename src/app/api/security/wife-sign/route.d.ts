/**
 * POST /api/security/wife-sign
 * Bootstrap WIFE headers when JWT lives in HttpOnly cookie (BFF auth).
 * Hardened: same-origin + allowlisted /api/* only + dedicated rate limit.
 * Note: لا TTL cache للتوقيع — كل nonce يُستهلك مرة واحدة عند استدعاء API الهدف.
 */
export declare function POST(request: Request): Promise<Response>;
