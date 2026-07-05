/**
 * Server-side CSRF token registry (Redis → Supabase → memory).
 * Binds CSRF token to authenticated subject (sub).
 */
export declare function generateCsrfTokenValue(): string;
export declare function issueCsrfTokenForSubject(sub: string): Promise<string | null>;
export declare function invalidateCsrfForSubject(sub: string): Promise<void>;
export declare function validateCsrfForSubject(sub: string, token: string): Promise<boolean>;
export declare function resetCsrfServerStoreForTests(): void;
