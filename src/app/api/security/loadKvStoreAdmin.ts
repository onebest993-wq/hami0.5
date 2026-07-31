/**
 * تحميل وحدة KV الإدارية للخادم فقط — لا تُدرَج في حزم العميل (@vite-ignore).
 */
export type KvStoreAdminApi = {
  kvSet: (key: string, value: unknown) => Promise<void>;
  kvGet: (key: string) => Promise<unknown>;
  kvDel: (key: string) => Promise<void>;
  kvGetByPrefix: (prefix: string) => Promise<unknown[]>;
  kvDelByPrefix: (prefix: string) => Promise<number>;
  kvKeysByPrefix: (prefix: string) => Promise<string[]>;
};

export async function loadKvStoreAdmin(): Promise<KvStoreAdminApi | null> {
  if (typeof window !== 'undefined') return null;
  try {
    const spec = '@/app/api/security/kvStoreAdmin.ts';
    return (await import(/* @vite-ignore */ spec)) as KvStoreAdminApi;
  } catch {
    return null;
  }
}
