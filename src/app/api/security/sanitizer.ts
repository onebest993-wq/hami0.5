import DOMPurify from 'isomorphic-dompurify';

type JsonPrimitive = string | number | boolean | null | undefined;
type JsonLike = JsonPrimitive | JsonLike[] | { [key: string]: JsonLike };

const SANITIZE_CONFIG: Readonly<Record<string, unknown>> = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

const POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** كائن JSON عادي — يستثني المصفوفات حتى لا تُعامل كمُدخل سجلّ. */
export function isJsonObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

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
    const out: Record<string, unknown> = Object.create(null);
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (POLLUTION_KEYS.has(key)) continue;
      out[key] = sanitizePayload(value);
    }
    return out as T;
  }

  return payload;
}

