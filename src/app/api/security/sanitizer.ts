import DOMPurify from 'isomorphic-dompurify';

type JsonPrimitive = string | number | boolean | null | undefined;
type JsonLike = JsonPrimitive | JsonLike[] | { [key: string]: JsonLike };

const SANITIZE_CONFIG: Readonly<Record<string, unknown>> = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

function sanitizeString(value: string): string {
  return DOMPurify.sanitize(value, SANITIZE_CONFIG);
}

export function sanitizePayload<T = JsonLike>(payload: T): T {
  if (typeof payload === 'string') {
    return sanitizeString(payload) as T;
  }

  if (payload === null || payload === undefined) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item)) as T;
  }

  if (typeof payload === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      out[key] = sanitizePayload(value);
    }
    return out as T;
  }

  return payload;
}

