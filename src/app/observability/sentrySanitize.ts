/**
 * تنقية أحداث Sentry قبل الإرسال — سرية المهنة (لا PII/رموز في الطرف الثالث).
 */

type SentryPrimitive = string | number | boolean | null | undefined;
type SentryValue = SentryPrimitive | SentryValue[] | { [key: string]: SentryValue };

export type SentryLikeEvent = {
    level?: string;
    request?: {
        headers?: Record<string, string>;
        cookies?: string | Record<string, string>;
        query_string?: string | Record<string, string>;
        data?: unknown;
    };
    user?: Record<string, unknown>;
    extra?: Record<string, unknown>;
    contexts?: Record<string, unknown>;
    breadcrumbs?: Array<{ data?: Record<string, unknown>; message?: string }>;
    tags?: Record<string, string>;
};

const REDACTED = '[Filtered]';

const SENSITIVE_KEY_RE =
    /(password|passwd|secret|token|authorization|cookie|csrf|session|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|wife|jwt|email|phone|mobile|national|iqama|ssn|iban|card|cvv)/i;

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?964|0)?7[0-9]{9}\b/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

const SENSITIVE_HEADER_RE =
    /^(authorization|cookie|set-cookie|x-csrf-token|x-wife-session|x-wife-device-id|x-api-key)$/i;

function scrubString(value: string): string {
    return value.replace(EMAIL_RE, REDACTED).replace(PHONE_RE, REDACTED).replace(JWT_RE, REDACTED);
}

function scrubValue(key: string, value: unknown, depth = 0): unknown {
    if (depth > 6) return REDACTED;
    if (value == null) return value;
    if (typeof value === 'string') {
        return SENSITIVE_KEY_RE.test(key) ? REDACTED : scrubString(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return SENSITIVE_KEY_RE.test(key) ? REDACTED : value;
    }
    if (Array.isArray(value)) {
        return value.map((item, index) => scrubValue(`${key}[${index}]`, item, depth + 1));
    }
    if (typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
            out[childKey] = scrubValue(childKey, childValue, depth + 1);
        }
        return out;
    }
    return REDACTED;
}

function scrubHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
    if (!headers) return headers;
    const out: Record<string, string> = {};
    for (const [name, raw] of Object.entries(headers)) {
        out[name] = SENSITIVE_HEADER_RE.test(name) ? REDACTED : scrubString(raw);
    }
    return out;
}

/** يُطبَّق داخل beforeSend — يعيد الحدث بعد التنقية أو null للإسقاط. */
export function sanitizeSentryEvent<T extends SentryLikeEvent>(event: T): T | null {
    if (event.request) {
        event.request.headers = scrubHeaders(event.request.headers);
        if (typeof event.request.cookies === 'string') {
            event.request.cookies = REDACTED;
        } else if (event.request.cookies && typeof event.request.cookies === 'object') {
            event.request.cookies = Object.fromEntries(
                Object.keys(event.request.cookies).map((k) => [k, REDACTED]),
            );
        }
        if (event.request.data !== undefined) {
            event.request.data = scrubValue('request.data', event.request.data);
        }
        if (typeof event.request.query_string === 'string') {
            event.request.query_string = scrubString(event.request.query_string);
        }
    }

    if (event.user) {
        event.user = scrubValue('user', event.user) as Record<string, unknown>;
    }
    if (event.extra) {
        event.extra = scrubValue('extra', event.extra) as Record<string, unknown>;
    }
    if (event.contexts) {
        event.contexts = scrubValue('contexts', event.contexts) as Record<string, unknown>;
    }
    if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
            ...crumb,
            message: crumb.message ? scrubString(crumb.message) : crumb.message,
            data: crumb.data
                ? (scrubValue('breadcrumb', crumb.data) as Record<string, unknown>)
                : crumb.data,
        }));
    }

    return event;
}
