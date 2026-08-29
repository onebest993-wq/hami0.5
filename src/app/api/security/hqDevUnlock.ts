import { isPostgresUuidSubject } from './postgresUuidSubject.ts';
import { isWifeProduction } from './wifeStoreEnv.ts';

const DEV_ACCESS_TOKEN_PREFIX = 'dev-access-token-';

/** إقلاع مقر التطوير فقط — يُغلق في الإنتاج. */
export function isHeadquartersDevUnlockEnabled(): boolean {
    return !isWifeProduction();
}

export function headquartersDevAccessTokenFor(userId: string): string {
    return `${DEV_ACCESS_TOKEN_PREFIX}${userId.trim()}`;
}

export function readBearerAuthorizationToken(request: Request): string | null {
    const raw = request.headers.get('authorization') ?? request.headers.get('Authorization');
    if (!raw) return null;
    const [scheme, token] = raw.split(' ');
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
    const normalized = token.trim();
    return normalized || null;
}

/**
 * موضوع توكن التطوير فقط (`dev-access-token-<uuid>`).
 * لا يقبل JWT حياً حتى لا يُستعمل هذا المسار لتجاوز الرمز بحساب حقيقي.
 */
export function parseHeadquartersDevUnlockSubject(token: string): string | null {
    const normalized = token.trim();
    if (!normalized.startsWith(DEV_ACCESS_TOKEN_PREFIX)) return null;
    const subject = normalized.slice(DEV_ACCESS_TOKEN_PREFIX.length).trim();
    if (!isPostgresUuidSubject(subject)) return null;
    if (normalized !== headquartersDevAccessTokenFor(subject)) return null;
    return subject;
}
