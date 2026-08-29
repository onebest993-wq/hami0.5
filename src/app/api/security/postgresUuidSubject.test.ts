import { describe, expect, it } from 'vitest';
import {
  emptyUuidScopedRows,
  isPostgresUuidSubject,
  rejectNonUuidCloudWrite,
} from './postgresUuidSubject.ts';

describe('postgresUuidSubject', () => {
  it('يقبل UUID حقيقي ويرفض ضيف التطوير', () => {
    expect(isPostgresUuidSubject('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(true);
    expect(isPostgresUuidSubject('guest-lawyer-1')).toBe(false);
    expect(isPostgresUuidSubject('dev-access-token-guest-lawyer-1')).toBe(false);
  });

  it('القراءة للضيف ترجع قائمة فارغة بلا استعلام', async () => {
    const res = emptyUuidScopedRows('guest-lawyer-1');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    const body = (await res!.json()) as { rows?: unknown[] };
    expect(body.rows).toEqual([]);
  });

  it('الكتابة للضيف تُرفض', async () => {
    const res = rejectNonUuidCloudWrite('guest-lawyer-1');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
