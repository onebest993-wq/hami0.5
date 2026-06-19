import SecureStoreService from '@/app/services/SecureStoreService';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { SecureAPIClient, getCurrentAccessToken } from '@/app/services/SecureAPIClient';

const KV_PROXY_URL = '/api/kv-proxy';
const LOCAL_PREFIX = 'hami:push-subscription:';

const kv = {
    async set(key: string, value: unknown) {
        if (!isKvProxyNetworkEnabled()) throw new Error('kv_local_only');
        const token = await getCurrentAccessToken();
        if (!token) throw new Error('kv_local_only');
        await SecureAPIClient.fetchSecure(KV_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set', key, value }),
        });
    },
};

export async function savePushSubscription(lawyerId: string, subscription: unknown): Promise<void> {
    if (!lawyerId) return;
    try {
        await kv.set(`hami:push:${lawyerId}`, {
            subscription,
            updatedAt: new Date().toISOString(),
        });
    } catch {
        await SecureStoreService.setItem(`${LOCAL_PREFIX}${lawyerId}`, JSON.stringify(subscription));
    }
}
