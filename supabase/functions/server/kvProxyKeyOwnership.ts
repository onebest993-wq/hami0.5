/** @generated — do not edit. Source: src/app/security/kvProxyKeyOwnership.ts */
export function isKeyOwnedBy(rawKey: unknown, userId: string, op: 'read' | 'write'): boolean {
  if (typeof rawKey !== 'string' || !rawKey || !userId) return false;
  const k = rawKey;
  const u = userId;

  if (k.startsWith(`user:${u}:`)) return true;
  if (k.startsWith(`calendar:${u}:`)) return true;
  if (k.startsWith(`lawyer_files:${u}:`)) return true;
  if (k.startsWith(`urgentActions:${u}:`)) return true;
  if (k.startsWith(`transactions:${u}:`)) return true;
  if (k.startsWith(`transactionsThreading:${u}:`)) return true;
  if (k.startsWith(`notifications:${u}:`)) return true;
  if (k === `notifications_${u}`) return true;
  if (k.startsWith(`vault:docs:${u}:`)) return true;
  if (k === `hami:push:${u}`) return true;
  if (k === `hami:calendar:events:${u}:v1`) return true;
  if (k === `profile:${u}`) return true;
  if (k.startsWith(`follow:${u}:`)) return true;

  if (op === 'read') {
    if (k.startsWith('community:posts:')) return true;
    if (k.startsWith('community:reports:')) return true;
    if (k.startsWith('repository:docs:')) return true;
    if (k.startsWith('banned:users:')) return true;
    if (k.startsWith('follow:')) return true;
  }

  return false;
}

export function isPrefixOwnedBy(rawPrefix: unknown, userId: string): boolean {
  if (typeof rawPrefix !== 'string' || !rawPrefix || !userId) return false;
  const p = rawPrefix;
  const u = userId;

  if (p.startsWith(`user:${u}:`)) return true;
  if (p.startsWith(`calendar:${u}:`)) return true;
  if (p.startsWith(`lawyer_files:${u}:`)) return true;
  if (p.startsWith(`urgentActions:${u}:`)) return true;
  if (p.startsWith(`transactions:${u}:`)) return true;
  if (p.startsWith(`transactionsThreading:${u}:`)) return true;
  if (p.startsWith(`notifications:${u}:`)) return true;
  if (p.startsWith(`vault:docs:${u}:`)) return true;
  if (p === 'community:posts:' || p.startsWith('community:posts:')) return true;
  if (p === 'community:reports:' || p.startsWith('community:reports:')) return true;
  if (p === 'repository:docs:' || p.startsWith('repository:docs:')) return true;
  return false;
}
