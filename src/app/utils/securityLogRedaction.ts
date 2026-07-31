const MAX_DEPTH = 4;
const MAX_ITEMS = 32;
const REDACTED = '[REDACTED]';
const REDACTED_STACK = '[STACK_REDACTED]';

const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._-]+\b/gi;
const BASE64_SECRET_RE = /\b[A-Za-z0-9+/_-]{40,}={0,2}\b/g;
const NONCE_RE = /\b[A-Za-z0-9_-]{16,128}\b/g;
const HEX_SECRET_RE = /\b[a-f0-9]{32,}\b/gi;

const SENSITIVE_KEY_RE =
    /(token|secret|password|authorization|cookie|csrf|nonce|signature|session|refresh|access|wrapped|jwt|apikey|api_key|salt|credential|key)/i;

function redactString(input: string): string {
    return input
        .replace(BEARER_RE, `Bearer ${REDACTED}`)
        .replace(JWT_RE, REDACTED)
        .replace(HEX_SECRET_RE, REDACTED)
        .replace(BASE64_SECRET_RE, REDACTED)
        .replace(NONCE_RE, (match) => (match.length >= 24 ? REDACTED : match));
}

function sanitizeObjectInternal(value: unknown, depth: number, seen: WeakSet<object>): unknown {
    if (value == null) return value;
    if (depth > MAX_DEPTH) return '[TRUNCATED]';

    if (typeof value === 'string') return redactString(value);
    if (typeof value === 'number' || typeof value === 'boolean') return value;

    if (value instanceof Error) {
        return {
            name: value.name,
            message: redactString(value.message ?? 'Unknown error'),
            stack: REDACTED_STACK,
        };
    }

    if (Array.isArray(value)) {
        return value.slice(0, MAX_ITEMS).map((item) => sanitizeObjectInternal(item, depth + 1, seen));
    }

    if (typeof value === 'object') {
        if (seen.has(value as object)) return '[CIRCULAR]';
        seen.add(value as object);

        const out: Record<string, unknown> = {};
        for (const [key, nested] of Object.entries(value as Record<string, unknown>).slice(0, MAX_ITEMS)) {
            out[key] = SENSITIVE_KEY_RE.test(key)
                ? REDACTED
                : sanitizeObjectInternal(nested, depth + 1, seen);
        }
        return out;
    }

    return String(value);
}

export function sanitizeForLogging<T>(value: T): T {
    return sanitizeObjectInternal(value, 0, new WeakSet<object>()) as T;
}

export function sanitizeConsoleArgs(args: unknown[]): unknown[] {
    return args.map((arg) => sanitizeForLogging(arg));
}

export function sanitizeErrorMessage(message: string): string {
    return redactString(message);
}
