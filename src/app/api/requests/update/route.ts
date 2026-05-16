import {
  enforceTokenActorBinding,
  extractUserTokenFromRequest,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator';
import { sanitizePayload } from '../../security/sanitizer';

type LegalRequestRow = {
  id: string;
  client_id: string;
  lawyer_id: string;
  title: string;
  encrypted_details: string;
  data_signature: string;
  status: string;
  created_at: string;
};

type RequestsStore = {
  requests: LegalRequestRow[];
};

const STORE_KEY = Symbol.for('HAMI_MOCK_REQUESTS_STORE_V1');
const DEV_STORAGE_KEY = 'hami:dev:requests:v1';

function getStore(): RequestsStore {
  const g = globalThis as unknown as Record<string | symbol, unknown>;
  const existing = g[STORE_KEY];
  if (existing && typeof existing === 'object') return existing as RequestsStore;
  const store: RequestsStore = { requests: [] };
  g[STORE_KEY] = store;
  return store;
}

function getSessionStorage(): Storage | null {
  const g = globalThis as unknown as Record<string, unknown>;
  const ss = g.sessionStorage;
  if (!ss || typeof ss !== 'object') return null;
  const candidate = ss as Storage;
  return typeof candidate.getItem === 'function' && typeof candidate.setItem === 'function' ? candidate : null;
}

function loadPersistedRequests(): LegalRequestRow[] {
  const ss = getSessionStorage();
  if (!ss) return getStore().requests;
  const raw = ss.getItem(DEV_STORAGE_KEY);
  if (!raw) return getStore().requests;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return getStore().requests;
    return parsed.filter((x) => x && typeof x === 'object') as LegalRequestRow[];
  } catch {
    return getStore().requests;
  }
}

function savePersistedRequests(requests: LegalRequestRow[]): void {
  const ss = getSessionStorage();
  if (!ss) {
    getStore().requests = requests;
    return;
  }
  try {
    ss.setItem(DEV_STORAGE_KEY, JSON.stringify(requests));
  } catch {
    getStore().requests = requests;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse();
    }
    if (!(await verifyWifeSignature(request, userToken))) {
      return wifeForbiddenResponse();
    }

    const payload = sanitizePayload((await request.json().catch(() => null)) as unknown);

    if (isRecord(payload) && isString(payload.payload) && isString(payload.signature)) {
      return new Response(JSON.stringify({ ok: false, error: 'Encrypted envelope not supported by mock route' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (!isRecord(payload) || !isString(payload.lawyer_id) || !isString(payload.request_id) || !isString(payload.status)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid update payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    if (!(await enforceTokenActorBinding(userToken, payload))) {
      return wifeForbiddenResponse();
    }
    const nextStatus: string = payload.status;

    const requests = loadPersistedRequests();
    const idx = requests.findIndex((r) => r.id === payload.request_id);
    if (idx < 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const current = requests[idx];
    if (current.lawyer_id !== payload.lawyer_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const next = requests.map((r) => (r.id === payload.request_id ? { ...r, status: nextStatus } : r));
    savePersistedRequests(next);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
