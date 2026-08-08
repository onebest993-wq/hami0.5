/**
 * CSRF shared constants — cookie (HttpOnly), meta/header name, sessionStorage key.
 * Keep cookie name identical between client and API Set-Cookie builders.
 */

export const CSRF_COOKIE_NAME = 'hami_csrf_token';

/** Document meta + SecureAPIClient header name */
export const CSRF_META_NAME = 'x-csrf-token';

/** sessionStorage key for client-held CSRF token (double-submit) */
export const CSRF_STORAGE_KEY = 'hami:csrf';

/** Base64url token shape (24 random bytes → ~32 chars without padding) */
export const CSRF_TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;
