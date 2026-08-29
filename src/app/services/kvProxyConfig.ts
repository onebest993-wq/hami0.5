/**
 * التحكم في استدعاءات kv-proxy من المتصفح.
 * في التطوير: محلي افتراضياً (مثل urgent-actions-db) لتجنب عاصفة الطلبات.
 * فعّل بـ VITE_ENABLE_KV_PROXY=true عندما يُراد حفظ التقويم/المعاملات سحابياً على Vite.
 * على الاستضافة الثابتة: لا نستدعي الشبكة إلا بعد تأكيد توفر /api.
 */
import { getSameOriginApiState } from '@/app/runtime/sameOriginApiProbe';

export function isKvProxyNetworkEnabled(): boolean {
    if (import.meta.env.VITE_ENABLE_KV_PROXY === 'false') return false;
    const optedIn = import.meta.env.VITE_ENABLE_KV_PROXY === 'true';
    if (import.meta.env.DEV && !optedIn) return false;
    return getSameOriginApiState() === 'available';
}
