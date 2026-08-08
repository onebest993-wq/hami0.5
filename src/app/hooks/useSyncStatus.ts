/**
 * 🔄 useSyncStatus Hook
 * 
 * Hook لمراقبة حالة المزامنة مع Supabase
 * - Real-time online/offline detection
 * - Sync queue monitoring
 * - Auto-sync on reconnect
 */

import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../services/DataService';

interface SyncStatus {
  isOnline: boolean;
  queueLength: number;
  lastSync: Date | null;
  syncing: boolean;
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    queueLength: 0,
    lastSync: null,
    syncing: false,
  });

  // Update status
  const updateStatus = useCallback(() => {
    const { isOnline, queueLength } = dataService.getSyncStatus();
    setStatus(prev => ({
      ...prev,
      isOnline,
      queueLength,
    }));
  }, []);

  // Force sync
  const sync = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, syncing: true }));
      
      await dataService.forceSync();
      
      setStatus(prev => ({
        ...prev,
        syncing: false,
        lastSync: new Date(),
      }));
      
      updateStatus();
      
      console.log('✅ [useSyncStatus] Manual sync completed');
    } catch (err) {
      console.error('[useSyncStatus] Sync error:', err);
      setStatus(prev => ({ ...prev, syncing: false }));
      throw err;
    }
  }, [updateStatus]);

  // Listen to connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 [useSyncStatus] Connection restored');
      setStatus(prev => ({ ...prev, isOnline: true }));
      
      // Auto-sync on reconnect
      sync().catch(console.error);
    };

    const handleOffline = () => {
      console.log('📴 [useSyncStatus] Connection lost');
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial update
    updateStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync, updateStatus]);

  // Periodic status update
  useEffect(() => {
    const interval = setInterval(updateStatus, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, [updateStatus]);

  return {
    ...status,
    sync,
    refresh: updateStatus,
  };
}