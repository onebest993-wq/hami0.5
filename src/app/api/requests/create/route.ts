import {
  enforceTokenActorBinding,
  extractUserTokenFromRequest,
  isTokenAuthorized,
  assertWifeSignatureRequest,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';

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
    return parsed.filter(isLegalRequestRow) as LegalRequestRow[];
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

function isLegalRequestRow(value: unknown): value is LegalRequestRow {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.client_id) &&
    isString(value.lawyer_id) &&
    isString(value.title) &&
    isString(value.encrypted_details) &&
    isString(value.data_signature) &&
    isString(value.status) &&
    isString(value.created_at)
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }
        const wifeBlock = await assertWifeSignatureRequest(request, userToken);
    if (wifeBlock) return wifeBlock;

    const payload = sanitizePayload((await request.json().catch(() => null)) as unknown);

    if (isRecord(payload) && isString(payload.payload) && isString(payload.signature)) {
      return new Response(JSON.stringify({ ok: false, error: 'Encrypted envelope not supported by mock route' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (!isLegalRequestRow(payload)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid request payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    if (!(await enforceTokenActorBinding(userToken, payload))) {
      return wifeForbiddenResponse({ request, reason: 'actor_binding_failed' });
    }

    const requests = loadPersistedRequests();
    const idx = requests.findIndex((r) => r.id === payload.id);
    const next = idx >= 0 ? requests.map((r) => (r.id === payload.id ? payload : r)) : [...requests, payload];
    savePersistedRequests(next);

    return new Response(JSON.stringify({ ok: true, id: payload.id }), {
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
