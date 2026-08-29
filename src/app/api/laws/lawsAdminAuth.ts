import type { WifeAuthResult } from '../security/bffAuth.ts';
import { requireTrustedHeadquartersAdmin } from '../security/requireTrustedHeadquartersAdmin.ts';

/** طفرات مكتبة القوانين من مقر القيادة عن بعد — نفس بوابة الحظر/الأدوار (Wife + مدير + جهاز OTP). */
export async function requirePlatformAdmin(
  request: Request,
  options?: { stepUp?: boolean },
): Promise<WifeAuthResult> {
  const gate = await requireTrustedHeadquartersAdmin(request, options);
  if (!gate.ok) {
    return { ok: false as const, response: gate.response };
  }
  return { ok: true as const, userId: gate.userId };
}
