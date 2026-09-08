/**
 * Allowlist لـ redirect_to في استعادة كلمة المرور — يمنع سرقة الرابط عبر origin خبيث.
 */

import { isWifeProduction } from '../security/wifeStoreEnv.ts';

const DEFAULT_HOST_SUFFIXES = ['hami.legal'] as const;
/** مضيفات التطوير — لا تُقبل في الإنتاج */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1'] as const;

/**
 * `http:` للتطوير وحده.
 *
 * رابط الاستعادة يحمل رمزاً يكفي وحده للاستيلاء على الحساب (التدفّق ضمني —
 * `flowType` الافتراضي في auth-js 2.108.2 هو `implicit`، فالرمز يصل في العنوان
 * نفسه لا كرمز قابل للتبادل). تسليمه على `http` نصّاً صريحاً يعرّضه لأي وسيط على
 * الشبكة. وفي الإنتاج لا مبرّر لذلك إطلاقاً.
 */
function parseOrigin(raw: string): URL | null {
    try {
        const u = new URL(raw);
        if (u.protocol === 'https:') return u;
        if (u.protocol === 'http:' && !isWifeProduction()) return u;
        return null;
    } catch {
        return null;
    }
}

function envAllowlist(): string[] {
    const raw =
        process.env.PASSWORD_RESET_ALLOWED_ORIGINS ??
        process.env.PUBLIC_APP_URL ??
        process.env.SITE_URL ??
        '';
    return raw
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function hostAllowed(hostname: string): boolean {
    const host = hostname.toLowerCase();
    /*
     * `localhost` و`127.0.0.1` كانا مسموحين بلا قيد — في الإنتاج أيضاً. وذلك يعني
     * أن `redirect_to=http://localhost:PORT/x` يمرّ، فيُسلَّم رمز الاستعادة إلى
     * أي مُنصِت محلي على جهاز الضحية — وتطبيقٌ خبيث على الجهاز نفسه يستطيع أن
     * يكون ذلك المُنصِت. مفيدة للتطوير، بلا مبرّر في الإنتاج.
     */
    if (!isWifeProduction() && (LOOPBACK_HOSTS as readonly string[]).includes(host)) return true;
    for (const suffix of DEFAULT_HOST_SUFFIXES) {
        if (host === suffix || host.endsWith(`.${suffix}`)) return true;
    }
    for (const entry of envAllowlist()) {
        const u = parseOrigin(entry) ?? (() => {
            try {
                return new URL(`https://${entry}`);
            } catch {
                return null;
            }
        })();
        if (!u) continue;
        if (host === u.hostname.toLowerCase()) return true;
    }
    return false;
}

/**
 * نطاق الرابط العميق المسموح — **واحد فقط**.
 *
 * كانت القائمة تضمّ `com.hami.app://` و`hami://` أيضاً. ولا وجود لهما في
 * المشروع كلّه: `AndroidManifest.xml` يُعلن `iq.hami.legal` وحده، و
 * `applyAuthDeepLink` (passwordRecoveryGate.ts:94) لا يُطبّع إلا
 * `iq.hami.legal://`. أي أن قبولهما كان يسمح بتسليم رمز الاستعادة إلى نطاق
 * **لا يستقبله تطبيق Hami أصلاً** — سطح هجوم صافٍ بلا فائدة مقابلة.
 *
 * ⚠️ والنطاق المخصّص ليس حصرياً على أندرويد: أي تطبيق يستطيع تسجيل النطاق نفسه
 * واعتراض الرابط (وهو ما تحذّر منه RFC 8252 §8.1 صراحةً للتطبيقات الأصلية).
 * والتدفّق ضمني، فالرمز المعترَض يكفي وحده للاستيلاء على الحساب. الحلّ الجذري
 * روابط تطبيق مُتحقَّقة (App Links على `https://` مع assetlinks.json) — يحتاج
 * نطاق الإنتاج. التفصيل في FINDING-011.
 */
function isAllowedAppScheme(raw: string): boolean {
    return raw.toLowerCase().startsWith('iq.hami.legal://');
}

/**
 * يُرجع redirect آمناً أو سلسلة فارغة (تجاهل غير المسموح بدل تمريره).
 * إن وُجد Origin للطلب ومطابق للقائمة يُفضَّل origin الطلب عند غياب redirect.
 */
export function resolvePasswordResetRedirectTo(
    requested: string,
    request: Request,
): string {
    const trimmed = requested.trim();
    if (trimmed) {
        if (isAllowedAppScheme(trimmed)) return trimmed;
        const u = parseOrigin(trimmed);
        if (u && hostAllowed(u.hostname)) {
            return u.origin + (u.pathname === '/' ? '' : u.pathname) + u.search;
        }
        return '';
    }

    const originHeader = request.headers.get('origin')?.trim() ?? '';
    if (originHeader) {
        const u = parseOrigin(originHeader);
        if (u && hostAllowed(u.hostname)) return u.origin;
        return '';
    }

    const fromEnv = envAllowlist()[0];
    if (fromEnv) {
        const u = parseOrigin(fromEnv);
        if (u && hostAllowed(u.hostname)) return u.origin;
    }
    return '';
}
