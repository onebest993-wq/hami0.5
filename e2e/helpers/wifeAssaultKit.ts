import { createHash } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import {
  wifeLiveAuthHeaders,
  WIFE_LIVE_GUEST_TOKEN,
  WIFE_LIVE_LAWYER_UUID,
  WIFE_LIVE_UUID_TOKEN,
} from './wifeLiveSign';

export const ASSAULT_ORIGIN = 'http://localhost:8080';
export const VICTIM_UUID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

export function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function apiHealthy(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.get('/api/public/healthz');
    const type = res.headers()['content-type'] ?? '';
    if (!type.includes('json')) return false;
    const body = (await res.json()) as { ok?: boolean };
    return res.ok && body.ok === true;
  } catch {
    return false;
  }
}

export async function issueLiveCsrf(
  request: APIRequestContext,
  token: string = WIFE_LIVE_GUEST_TOKEN,
): Promise<string> {
  const headers = await wifeLiveAuthHeaders({
    method: 'GET',
    url: `${ASSAULT_ORIGIN}/api/security/csrf`,
    token,
  });
  const res = await request.get('/api/security/csrf', { headers });
  if (res.status() !== 200) {
    throw new Error(`csrf bootstrap ${res.status()}: ${await res.text()}`);
  }
  const body = (await res.json()) as { csrfToken?: string };
  if (!body.csrfToken || body.csrfToken.length < 16) {
    throw new Error('csrf token missing');
  }
  return body.csrfToken;
}

export async function signedJsonPost(
  request: APIRequestContext,
  path: string,
  body: string,
  csrf: string,
  token: string = WIFE_LIVE_GUEST_TOKEN,
) {
  const headers = await wifeLiveAuthHeaders({
    method: 'POST',
    url: `${ASSAULT_ORIGIN}${path}`,
    body,
    csrf,
    token,
  });
  return request.post(path, { headers, data: body });
}

export async function signedJsonGet(
  request: APIRequestContext,
  path: string,
  token: string = WIFE_LIVE_GUEST_TOKEN,
) {
  const headers = await wifeLiveAuthHeaders({
    method: 'GET',
    url: `${ASSAULT_ORIGIN}${path}`,
    token,
  });
  return request.get(path, { headers });
}

export async function signedMultipartUpload(
  request: APIRequestContext,
  input: {
    csrf: string;
    fileBytes: Buffer;
    fileName: string;
    mimeType: string;
    category: string;
  },
) {
  const hash = sha256Hex(input.fileBytes);
  const headers = await wifeLiveAuthHeaders({
    method: 'POST',
    url: `${ASSAULT_ORIGIN}/api/upload`,
    body: hash,
    csrf: input.csrf,
  });
  headers['x-wife-content-hash'] = hash;
  delete headers['content-type'];

  return request.post('/api/upload', {
    headers,
    multipart: {
      file: {
        name: input.fileName,
        mimeType: input.mimeType,
        buffer: input.fileBytes,
      },
      category: input.category,
    },
  });
}

export function assertWall(status: number, label: string): void {
  if (status >= 200 && status < 400) {
    throw new Error(`${label}: unexpected success ${status}`);
  }
  if (status >= 500) {
    throw new Error(`${label}: server error ${status}`);
  }
}

export { WIFE_LIVE_GUEST_TOKEN, WIFE_LIVE_UUID_TOKEN, WIFE_LIVE_LAWYER_UUID };
