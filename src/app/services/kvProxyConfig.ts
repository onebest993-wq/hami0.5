/**
 * التحكم في استدعاءات kv-proxy من المتصفح.
 * في التطوير: محلي افتراضياً (مثل urgent-actions-db) لتجنب عاصفة الطلبات.
 * على الاستضافة الثابتة: لا نستدعي الشبكة إلا بعد تأكيد توفر /api.
 */
import { getSameOriginApiState } from '@/app/runtime/sameOriginApiProbe';

export function isKvProxyNetworkEnabled(): boolean {
    if (import.meta.env.VITE_ENABLE_KV_PROXY === 'false') return false;
    if (import.meta.env.DEV) return false;
    return getSameOriginApiState() === 'available';
}
