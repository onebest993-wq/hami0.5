import { supabase } from '@/app/lib/supabase-client';
import {
  applyCsrfTokenToDocument,
  clearCsrfSessionToken,
  readCsrfTokenFromDocument,
  setCsrfSessionTokenFromServer,
} from '@/app/security/csrfSession';
import { getOrCreateDeviceId } from '@/app/security/deviceId';
import {
  buildWifeCanonicalPayload,
  canonicalWifePathAndQuery,
  randomWifeNonce,
  signWifePayloadWithSecret,
} from '@/app/security/wifeRequestSigningShared';
import { clearWifeSigningKeyCache } from '@/app/security/wifeSigningKeyCache';
import { readDevMockAccessToken } from '@/app/utils/authStorage';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { fetchBffWifeSignedHeaders } from '@/app/utils/bffAuthClient';

const WIFE_NATIVE_FETCH = Symbol.for('WIFE_NATIVE_FETCH');

export type WifeClientSession = {
  sessionId: string;
  sessionSecret: string;
  expiresAtMs: number;
};

type WifeSessionBootstrapResponse = {
  ok?: boolean;
  sessionId?: string;
  sessionSecret?: string;
  expiresAtMs?: number;
  csrfToken?: string;
  bootstrapMode?: string;
  error?: string;
};

let inMemoryWifeSession: WifeClientSession | null = null;
let bootstrapInFlight: Promise<WifeClientSession | null> | null = null;

function getNativeFetch(): typeof fetch {
  const g = globalThis as unknown as Record<string | symbol, unknown>;
  const native = g[WIFE_NATIVE_FETCH];
  if (typeof native === 'function') return native as typeof fetch;
  return globalThis.fetch.bind(globalThis);
}

function isSessionValid(session: WifeClientSession | null, now = Date.now()): session is WifeClientSession {
  return Boolean(session && session.expiresAtMs - now > 5_000);
}

export function setWifeClientSession(session: WifeClientSession | null | undefined): void {
  if (!session?.sessionId || !session.sessionSecret) {
    inMemoryWifeSession = null;
    return;
  }
  inMemoryWifeSession = {
    sessionId: session.sessionId.trim(),
    sessionSecret: session.sessionSecret.trim(),
    expiresAtMs: Number(session.expiresAtMs) || Date.now(),
  };
}

export function getWifeClientSession(): WifeClientSession | null {
  return isSessionValid(inMemoryWifeSession) ? inMemoryWifeSession : null;
}

export function hasWifeClientSession(): boolean {
  return Boolean(getWifeClientSession());
}

export function clearWifeClientSession(): void {
  const sessionId = inMemoryWifeSession?.sessionId?.trim() ?? '';
  inMemoryWifeSession = null;
  clearCsrfSessionToken();
  if (sessionId) {
    clearWifeSigningKeyCache(sessionId);
  }
}

export async function revokeWifeClientSession(): Promise<void> {
  const current = getWifeClientSession();
  const bffMode = isBffAuthEnabled();
  if (!current && !bffMode) {
    clearWifeClientSession();
    return;
  }

  try {
    const headers = new Headers({ Accept: 'application/json' });
    const token = await resolveClientToken();
    if (token?.trim()) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const csrfToken = readCsrfTokenFromDocument();
    if (csrfToken?.trim()) {
      headers.set('x-csrf-token', csrfToken);
    }
    headers.set('x-wife-device-id', getOrCreateDeviceId());

    if (bffMode) {
      const signedHeaders = await fetchBffWifeSignedHeaders({
        method: 'DELETE',
        url: '/api/security/wife-session',
        body: '',
        deviceId: getOrCreateDeviceId(),
      });
      Object.entries(signedHeaders).forEach(([key, value]) => headers.set(key, value));
    } else {
      const timestamp = String(Date.now());
      const nonce = randomWifeNonce();
      const payload = buildWifeCanonicalPayload(
        'DELETE',
        canonicalWifePathAndQuery('/api/security/wife-session'),
        timestamp,
        nonce,
        current.sessionId,
        '',
      );
      const signature = await signWifePayloadWithSecret(payload, current.sessionSecret);
      headers.set('X-WIFE-Session', current.sessionId);
      headers.set('X-WIFE-Signature', signature);
      headers.set('X-WIFE-Timestamp', timestamp);
      headers.set('X-WIFE-Nonce', nonce);
    }

    await getNativeFetch()('/api/security/wife-session', {
      method: 'DELETE',
      credentials: 'include',
      headers,
    }).catch(() => null);
  } finally {
    clearWifeClientSession();
  }
}

async function resolveClientToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token?.trim() ?? '';
  if (accessToken) return accessToken;
  return readDevMockAccessToken();
}

export async function bootstrapWifeClientSession(force = false): Promise<WifeClientSession | null> {
  const existing = getWifeClientSession();
  const bffMode = isBffAuthEnabled();
  if (!bffMode && existing && !force) return existing;
  if (bootstrapInFlight) return bootstrapInFlight;

  bootstrapInFlight = (async () => {
    const headers = new Headers({ Accept: 'application/json' });
    const token = await resolveClientToken();
    if (token?.trim()) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('x-wife-device-id', getOrCreateDeviceId());
    if (bffMode) {
      headers.set('x-wife-bootstrap-mode', 'csrf-only');
    }

    const response = await getNativeFetch()('/api/security/wife-session', {
      method: 'GET',
      credentials: 'include',
      headers,
    });
    if (!response.ok) {
      clearWifeClientSession();
      return null;
    }

    const payload = (await response.json().catch(() => null)) as WifeSessionBootstrapResponse | null;
    if (payload?.csrfToken?.trim()) {
      setCsrfSessionTokenFromServer(payload.csrfToken);
      applyCsrfTokenToDocument(payload.csrfToken);
    }
    if (bffMode) {
      clearWifeClientSession();
      return null;
    }

    const sessionId = payload?.sessionId?.trim() ?? '';
    const sessionSecret = payload?.sessionSecret?.trim() ?? '';
    const expiresAtMs = Number(payload?.expiresAtMs ?? 0);
    if (!sessionId || !sessionSecret || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      clearWifeClientSession();
      return null;
    }

    const nextSession: WifeClientSession = { sessionId, sessionSecret, expiresAtMs };
    setWifeClientSession(nextSession);
    return nextSession;
  })().finally(() => {
    bootstrapInFlight = null;
  });

  return bootstrapInFlight;
}
