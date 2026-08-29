/**
 * تهيئة جلسة CSRF للطلبات الموقّعة (WIFE).
 * مشتركة بين SecurityInitializer ومقر القيادة حتى لا يفشل POST بسبب كوكي قديم.
 */
import {
  applyCsrfTokenToDocument,
  getOrCreateCsrfSessionToken,
  setCsrfSessionTokenFromServer,
} from '@/app/security/csrfSession';
import { CSRF_TOKEN_RE } from '@/app/security/csrfConstants';
import { shouldUseServerSignedAuth } from '@/app/utils/authStorage';

let csrfBootstrapInFlight: Promise<void> | null = null;
let csrfSessionReady = false;
/** نجح GET CSRF من الخادم — لا DELETE على الخروج إن لم تُنشأ كوكي */
let csrfServerSessionEstablished = false;

/** سقف انتظار جلسة Supabase حتى لا يعلّق نبض المقر على getSession. */
export const CSRF_ACCESS_TOKEN_BUDGET_MS = 4_000;

function withBudget<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function invalidateCsrfSessionReady(): void {
  csrfSessionReady = false;
  csrfServerSessionEstablished = false;
  csrfBootstrapInFlight = null;
}

export function wasCsrfServerSessionEstablished(): boolean {
  return csrfServerSessionEstablished;
}

function markServerCsrfReady(): void {
  csrfSessionReady = true;
  csrfServerSessionEstablished = true;
}

/** بعد إقلاع مقر التطوير: التوكن جاء من الخادم — لا تُبطِل ثم تُعيد GET فيُسبق الكوكي. */
export function markCsrfSessionReadyFromServer(token: string): boolean {
  const t = token.trim();
  if (!CSRF_TOKEN_RE.test(t)) return false;
  setCsrfSessionTokenFromServer(t);
  markServerCsrfReady();
  csrfBootstrapInFlight = null;
  return true;
}

export async function ensureCsrfSessionReady(options?: { force?: boolean }): Promise<void> {
  if (options?.force) {
    csrfSessionReady = false;
    csrfServerSessionEstablished = false;
  }
  if (csrfSessionReady) return;
  if (csrfBootstrapInFlight) return csrfBootstrapInFlight;
  csrfBootstrapInFlight = (async () => {
    try {
      const { getCurrentAccessToken, SecureAPIClient } = await import('@/app/services/SecureAPIClient');
      const accessToken = await withBudget(getCurrentAccessToken(), CSRF_ACCESS_TOKEN_BUDGET_MS, null);
      if (!shouldUseServerSignedAuth(accessToken)) {
        const token = getOrCreateCsrfSessionToken();
        applyCsrfTokenToDocument(token);
        csrfSessionReady = true;
        return;
      }
      // لا نستدعي الخادم قبل جاهزية الجلسة — يتجنّب 403 صاخبة عند الإقلاع
      if (!accessToken?.trim()) {
        const token = getOrCreateCsrfSessionToken();
        applyCsrfTokenToDocument(token);
        csrfSessionReady = true;
        return;
      }
      const res = await SecureAPIClient.fetchSecure<{ ok?: boolean; csrfToken?: string }>(
        '/api/security/csrf',
        { method: 'GET' },
      );
      if (res?.ok && res?.csrfToken) {
        setCsrfSessionTokenFromServer(res.csrfToken);
        markServerCsrfReady();
        return;
      }
    } catch {
      /* fallback محلي — الطلبات GET لا تحتاج CSRF؛ POST يعتمد على مسار التطوير */
    }
    const token = getOrCreateCsrfSessionToken();
    applyCsrfTokenToDocument(token);
    csrfSessionReady = true;
  })().finally(() => {
    csrfBootstrapInFlight = null;
  });
  return csrfBootstrapInFlight;
}
