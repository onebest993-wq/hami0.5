/**
 * Policy for /api/security/wife-sign — allowlist only same-origin /api/* (no bootstrap oracle abuse).
 */
/** @returns canonical pathname if allowed; null if rejected */
export declare function resolveAllowedWifeSignTarget(request: Request, targetUrl: string): string | null;
export declare function isBlockedWifeSignPath(pathname: string): boolean;
