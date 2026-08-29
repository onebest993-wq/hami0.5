/**
 * قراءة حقول الجلسة من توكن Supabase.
 *
 * الحقل المميِّز للجلسة هنا هو `session_id` لا `jti`.
 * توكنات Supabase تُصدر `session_id` دائماً (حقل مطلوب في مخطّط GoTrue)، بينما
 * `jti` اختياري ولا تُصدره الخدمة افتراضياً. اشتراط `jti` كان يعني أن هذه الدالة
 * تُعيد `null` لكل توكن حقيقي في الإنتاج — فيسقط معها كشف التوكن المسروق/المنسوخ
 * وتحقّق CSRF المربوط بالمشترك، بلا أي أثر ظاهر: الاختبارات كانت تبني توكنات
 * تحمل `jti` فتمرّ، والإنتاج يمرّر توكنات بلا `jti` فيُعاد `valid` صامتاً.
 */

export interface JwtSessionFields {
  sub: string;
  /** معرّف الجلسة: `session_id` من Supabase، أو `jti` حين يوفّره مُصدِر آخر */
  sessionId: string;
  iat: number;
  exp: number;
}

export function decodeJwtPayloadBase64(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readTrimmedString(payload: Record<string, unknown>, field: string): string {
  const value = payload[field];
  return typeof value === 'string' ? value.trim() : '';
}

export function extractJwtSessionFields(token: string): JwtSessionFields | null {
  const payload = decodeJwtPayloadBase64(token);
  if (!payload) return null;
  const sub = readTrimmedString(payload, 'sub');
  // `session_id` أوّلاً لأنه المضمون من Supabase؛ `jti` احتياط لمُصدِرين آخرين
  const sessionId = readTrimmedString(payload, 'session_id') || readTrimmedString(payload, 'jti');
  const iatSec = typeof payload.iat === 'number' ? payload.iat : 0;
  const expSec = typeof payload.exp === 'number' ? payload.exp : 0;
  if (!sub || !sessionId || !iatSec || !expSec) return null;
  return { sub, sessionId, iat: iatSec * 1000, exp: expSec * 1000 };
}
