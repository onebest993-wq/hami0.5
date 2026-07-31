import { beforeEach, describe, expect, it, vi } from 'vitest';

const removeMock = vi.fn();
const { requireWifeUserMock } = vi.hoisted(() => ({
  requireWifeUserMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        remove: removeMock,
      }),
    },
  }),
}));

vi.mock('../../security/bffAuth.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../security/bffAuth.ts')>();
  return {
    ...actual,
    requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
  };
});

import { POST } from './route';

function buildRemoveRequest(paths: string[]): Request {
  return new Request('http://127.0.0.1/api/upload/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  });
}

describe('upload remove route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'user-1' });
    removeMock.mockResolvedValue({ error: null });
  });

  it('returns 403 when path belongs to another user', async () => {
    const res = await POST(buildRemoveRequest(['user-2/vault/file.pdf']));
    expect(res.status).toBe(403);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('returns 200 and removes owned paths', async () => {
    const res = await POST(buildRemoveRequest(['user-1/vault/old.pdf']));
    expect(res.status).toBe(200);
    expect(removeMock).toHaveBeenCalledWith(['user-1/vault/old.pdf']);
  });
});
