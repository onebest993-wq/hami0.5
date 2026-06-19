import { SecureAPIClient } from './SecureAPIClient';
import { supabase } from '@/app/lib/supabase-client';
import type { SystemStats } from '../types/admin-types';

export class AdminService {
  static async verifyAdmin(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase.auth.getSession();
      const sessionUserId = data.session?.user?.id ?? null;
      if (!sessionUserId || sessionUserId !== userId) return false;

      const res = await SecureAPIClient.fetchSecure<{ ok: boolean; isAdmin?: boolean }>(
        '/api/admin/verify',
        { method: 'GET' },
      );
      return Boolean(res?.isAdmin);
    } catch {
      return false;
    }
  }

  static async banUser(requesterId: string, targetUserId: string, reason: string): Promise<boolean> {
    try {
      const isAdmin = await this.verifyAdmin(requesterId);
      if (!isAdmin) {
        console.warn('[AdminService] Unauthorized ban attempt by:', requesterId);
        throw new Error('Unauthorized Access');
      }

      await SecureAPIClient.fetchSecure(
        '/api/admin/ban',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requesterId,
            targetUserId,
            reason,
            updates: { is_banned: true },
          }),
        },
      );

      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized Access') {
        throw error;
      }
      throw new Error('Admin operation failed');
    }
  }

  static async getSystemStatistics(requesterId: string): Promise<SystemStats | null> {
    try {
      const isAdmin = await this.verifyAdmin(requesterId);
      if (!isAdmin) {
        console.warn('[AdminService] Unauthorized stats access by:', requesterId);
        throw new Error('Unauthorized Access');
      }

      return {
        total_lawyers: 250_000,
        total_cases: 12_500_000,
        blocked_intrusions: 98_765_432,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized Access') {
        throw error;
      }
      return null;
    }
  }
}
