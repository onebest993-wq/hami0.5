/**
 * Single source of truth for Content-Security-Policy (WIFE / Hami).
 * Dev: relaxed for Vite HMR. Production: strict — no unsafe-eval, no inline scripts.
 */
export type CspMode = 'development' | 'production';
export declare function buildContentSecurityPolicy(mode: CspMode): string;
export declare function resolveCspMode(nodeEnv?: string, viteMode?: string): CspMode;
