/** معرّف مدير منصّة حامي — آمن للاستيراد من العميل (بلا عميل إدارة). */
export const HAMI_PLATFORM_ADMIN_UUID = 'a2532b41-add9-463f-9447-b6f933a79fea';

export function isHamiPlatformAdminUserId(userId: string | null | undefined): boolean {
  const id = String(userId ?? '').trim();
  return id.length > 0 && id.toLowerCase() === HAMI_PLATFORM_ADMIN_UUID.toLowerCase();
}
