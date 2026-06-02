/**
 * التحكم في استدعاءات kv-proxy من المتصفح.
 * في التطوير: محلي افتراضياً (مثل urgent-actions-db) لتجنب عاصفة الطلبات.
 */
export function isKvProxyNetworkEnabled(): boolean {
    if (import.meta.env.VITE_ENABLE_KV_PROXY === 'true') return true;
    if (import.meta.env.VITE_ENABLE_KV_PROXY === 'false') return false;
    return !import.meta.env.DEV;
}
