/**
 * احتياطي تطوير/اختبار فقط — يُستورد من clientEnv داخل فرع
 * `import.meta.env.PROD === false` حتى تسقطه شجرة الإنتاج بالكامل.
 *
 * العلامة أدناه موجودة فقط هنا؛ حارس dist يفشل إن وُجدت في الحزمة.
 */
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import type { ClientSupabaseConfig } from '@/utils/supabase/clientEnv';

/** لا تُنقل ولا تُعاد تسميتها دون تحديث scripts/guard-dist-client-env.mjs */
export const HAMI_DEV_SUPABASE_FALLBACK_MARKER = 'hami-dev-supabase-fallback-v1';

export function getDevFallbackSupabaseConfig(): ClientSupabaseConfig {
    // الإبقاء على مرجع للعلامة حتى لا يحذفها المُصغِّر من وحدة التطوير،
    // بينما تسقط الوحدة كلّها من حزمة الإنتاج عبر DCE.
    void HAMI_DEV_SUPABASE_FALLBACK_MARKER;
    return {
        url: `https://${projectId}.supabase.co`,
        anonKey: publicAnonKey,
        projectId,
    };
}
