import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { debug } from '@/app/utils/debug';

export async function logAction(action: string, details: unknown): Promise<void> {
  try {
    await SecureAPIClient.fetchSecure('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details }),
    });
  } catch (error) {
    debug.error('[audit] failed to log action:', error);
  }
}
