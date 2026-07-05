import { type WifeRejectMeta } from './wifeSecurityMonitor.ts';
/**
 * Server-side CSRF validation (double-submit cookie pattern).
 */
export declare function getCsrfTokenHeader(req: Request): string | null;
export declare function verifyCsrfToken(req: Request, userToken: string): Promise<boolean>;
/**
 * Extract user token from incoming request.
 * Priority:
 * 1) Authorization: Bearer <token>
 * 2) Supabase auth cookie/session fallback
 */
export declare function extractUserTokenFromRequest(req: Request): string | null;
/**
 * Standardized 403 response for failed cryptographic checks.
 */
export declare function wifeForbiddenResponse(meta?: WifeRejectMeta): Response;
export declare function wifeUnauthorizedResponse(meta?: WifeRejectMeta): Response;
/** 429 — too many WIFE-verified requests (distinct from signature failure). */
export declare function wifeRateLimitedResponse(meta?: WifeRejectMeta): Response;
/** After verifyWifeSignature returns false — records signature_failed telemetry. */
export declare function wifeSignatureFailedResponse(request: Request): Response;
export type WifeSignatureStatus = 'valid' | 'rate_limited' | 'invalid';
/**
 * Returns detailed WIFE verification status (use for correct 429 vs 403).
 */
export declare function verifyWifeSignatureStatus(req: Request, userToken: string): Promise<WifeSignatureStatus>;
/** Returns blocking Response when invalid/rate-limited; null when valid. */
export declare function assertWifeSignatureRequest(req: Request, userToken: string): Promise<Response | null>;
/** Test-only: clears token/user status caches between isolated scenarios. */
export declare function resetWifeValidatorCachesForTests(): void;
export declare function getVerifiedTokenSubject(userToken: string): Promise<string | null>;
export declare function isTokenAuthorized(userToken: string): Promise<boolean>;
/**
 * Enforces that verified token subject matches actor identifiers in payload.
 */
export declare function enforceTokenActorBinding(userToken: string, payload: unknown): Promise<boolean>;
/** GET/HEAD/OPTIONS: قراءة متكررة — حد أعلى. POST/PUT/DELETE: 250/min */
export declare const WIFE_RATE_READ_MAX = 400;
export declare const WIFE_RATE_WRITE_MAX = 250;
/**
 * Server-side WIFE verification (boolean — rate limit returns false).
 */
export declare function verifyWifeSignature(req: Request, userToken: string): Promise<boolean>;
/** Server-side WIFE header builder — used by /api/security/wife-sign (HttpOnly BFF). */
export declare function createWifeSignedHeaders(method: string, url: string, body: string, userToken: string, contentHash?: string): Promise<Record<string, string>>;
