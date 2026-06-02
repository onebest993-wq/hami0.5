import SecureStoreService from '@/app/services/SecureStoreService';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { SecureAPIClient, getCurrentAccessToken } from '@/app/services/SecureAPIClient';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba`;
const LOCAL_PREFIX = 'hami:push-subscription:';

const kv = {
    async set(key: string, value: unknown) {
        if (!isKvProxyNetworkEnabled()) throw new Error('kv_local_only');
        const token = await getCurrentAccessToken();
        if (!token) throw new Error('kv_local_only');
        await SecureAPIClient.fetchSecure(`${SERVER_URL}/kv-proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': publicAnonKey,
            },
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
