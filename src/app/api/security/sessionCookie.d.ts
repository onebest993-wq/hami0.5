/**
 * HttpOnly session cookies — BFF auth (JWT لا يُخزَّن في localStorage).
 */
export declare const ACCESS_COOKIE_NAME = "hami_access_token";
export declare const REFRESH_COOKIE_NAME = "hami_refresh_token";
export declare const ACCESS_COOKIE_MAX_AGE_SEC: number;
export declare const REFRESH_COOKIE_MAX_AGE_SEC: number;
export declare function isSecureRequest(request: Request): boolean;
export declare function parseAccessCookie(cookieHeader: string | null): string | null;
export declare function parseRefreshCookie(cookieHeader: string | null): string | null;
export declare function buildAccessSetCookie(token: string, secure: boolean, maxAgeSec?: number): string;
export declare function buildRefreshSetCookie(token: string, secure: boolean, maxAgeSec?: number): string;
export declare function buildClearSessionCookies(secure: boolean): string[];
export declare function getSupabaseAuthConfigFromEnv(): {
    url: string;
    key: string;
} | null;
