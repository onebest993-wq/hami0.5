/**
 * Unit Tests لـ useAutoSync Hook
 * 
 * اختبار نظام المزامنة التلقائية (localStorage-only mode)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSync } from '../useAutoSync';
import SecureStoreService from '@/app/services/SecureStoreService';

vi.mock('@/app/utils/debug', () => ({ debug: { log: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/supabase/info', () => ({ projectId: 'test', publicAnonKey: 'test-key' }));

describe('useAutoSync Hook', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        vi.useFakeTimers();
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
    // ========================================
    // Basic Functionality
    // ========================================
    describe('Basic Functionality', () => {
        
        it('should initialize with correct default values', () => {
            const { result } = renderHook(() =>
                useAutoSync('test-key', { test: 'data' }, { enabled: false }),
            );

            expect(result.current.isSyncing).toBe(false);
            expect(result.current.failureCount).toBe(0);
            expect(typeof result.current.syncNow).toBe('function');
        });
        
        it('should call syncNow manually', async () => {
            const { result } = renderHook(() => 
                useAutoSync('test-key', { test: 'data' }, {
                    enabled: true,
                    interval: 999999,
                    saveOnChange: false
                })
            );
            
            await act(async () => {
                await result.current.syncNow();
            });
            
            const stored = SecureStoreService.getItemSync('local_test-key');
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored!);
            expect(parsed.data).toEqual({ test: 'data' });
            expect(parsed.timestamp).toEqual(expect.any(Number));
        });
    });
    
    // ========================================
    // Auto-Sync Interval
    // ========================================
    describe('Auto-Sync Interval', () => {
        
        it('should sync automatically at specified interval', async () => {
            const interval = 5000;
            
            renderHook(() => 
                useAutoSync('test-key', { test: 'data' }, {
                    enabled: true,
                    interval,
                    saveOnChange: false
                })
            );
            
            // Initial sync writes to localStorage
            await act(async () => {});
            
            let stored = SecureStoreService.getItemSync('local_test-key');
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored!).data).toEqual({ test: 'data' });
            
            // Clear to verify interval re-syncs
            SecureStoreService.deleteItemSync('local_test-key');
            
            await act(async () => {
                vi.advanceTimersByTime(interval);
            });
            
            stored = SecureStoreService.getItemSync('local_test-key');
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored!).data).toEqual({ test: 'data' });
        });
        
        it('should not sync when disabled', async () => {
            renderHook(() => 
                useAutoSync('test-key', { test: 'data' }, { enabled: false })
            );
            
            await act(async () => {
                vi.advanceTimersByTime(60000);
            });
            
            expect(SecureStoreService.getItemSync('local_test-key')).toBeNull();
        });
    });
    
    // ========================================
    // Save on Change
    // ========================================
    describe('Save on Change', () => {
        
        it('should sync when data changes', async () => {
            const { rerender } = renderHook(
                ({ data }) => useAutoSync('test-key', data, {
                    enabled: true,
                    saveOnChange: true,
                    interval: 999999
                }),
                { initialProps: { data: { count: 1 } } }
            );
            
            await act(async () => {});
            
            let stored = SecureStoreService.getItemSync('local_test-key');
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored!).data).toEqual({ count: 1 });
            
            rerender({ data: { count: 2 } });
            
            await act(async () => {
                vi.advanceTimersByTime(1000);
            });
            
            stored = SecureStoreService.getItemSync('local_test-key');
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored!).data).toEqual({ count: 2 });
        });
        
        it('should not sync if saveOnChange is false', async () => {
            const { rerender } = renderHook(
                ({ data }) => useAutoSync('test-key', data, {
                    enabled: false,
                    saveOnChange: false,
                }),
                { initialProps: { data: { count: 1 } } }
            );
            
            expect(SecureStoreService.getItemSync('local_test-key')).toBeNull();
            
            rerender({ data: { count: 2 } });
            
            await act(async () => {
                vi.advanceTimersByTime(2000);
            });
            
            expect(SecureStoreService.getItemSync('local_test-key')).toBeNull();
        });
    });
    
    // ========================================
    // Error Handling
    // ========================================
    describe('Error Handling', () => {
        
        it('should sync successfully via localStorage with failureCount staying 0', async () => {
            const onSyncSuccess = vi.fn();
            
            const { result } = renderHook(() => 
                useAutoSync('test-key', { test: 'data' }, {
                    enabled: true,
                    interval: 999999,
                    onSyncSuccess
                })
            );
            
            await act(async () => {});
            
            expect(result.current.failureCount).toBe(0);
            expect(onSyncSuccess).toHaveBeenCalledWith(expect.any(Number));
            
            const stored = SecureStoreService.getItemSync('local_test-key');
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored!).data).toEqual({ test: 'data' });
        });
        
        it('does not block reload with synchronous emergency backup on beforeunload', () => {
            const testData = { important: 'data' };
            
            renderHook(() => 
                useAutoSync('test-key', testData, {
                    enabled: true,
                    interval: 999999,
                    saveOnChange: false
                })
            );
            
            window.dispatchEvent(new Event('beforeunload'));
            
            const backup = SecureStoreService.getItemSync('emergency_backup_test-key');
            expect(backup).toBeFalsy();
        });
    });
    
    // ========================================
    // Callbacks
    // ========================================
    describe('Callbacks', () => {
        
        it('should call onSyncSuccess on successful sync', async () => {
            const onSyncSuccess = vi.fn();
            
            renderHook(() => 
                useAutoSync('test-key', { test: 'data' }, {
                    enabled: true,
                    interval: 999999,
                    onSyncSuccess
                })
            );
            
            await act(async () => {});
            
            expect(onSyncSuccess).toHaveBeenCalledWith(expect.any(Number));
        });
        
        it('should not call onSyncError since cloud sync is disabled', async () => {
            const onSyncError = vi.fn();
            
            renderHook(() => 
                useAutoSync('test-key', { test: 'data' }, {
                    enabled: true,
                    interval: 999999,
                    onSyncError
                })
            );
            
            await act(async () => {});
            
            await act(async () => {
                vi.advanceTimersByTime(5000);
            });
            
            expect(onSyncError).not.toHaveBeenCalled();
        });
    });
    
    // ========================================
    // Emergency Backup
    // ========================================
    describe('Emergency Backup', () => {
        
        it('does not write emergency backup on beforeunload (avoids reload freeze)', () => {
            const testData = { critical: 'information' };
            
            renderHook(() => 
                useAutoSync('test-key', testData, { enabled: true })
            );
            
            window.dispatchEvent(new Event('beforeunload'));
            
            const emergencyBackup = SecureStoreService.getItemSync('emergency_backup_test-key');
            expect(emergencyBackup).toBeFalsy();
            
            if (emergencyBackup) {
                const parsed = JSON.parse(emergencyBackup);
                expect(parsed.data).toEqual(testData);
                expect(parsed.timestamp).toEqual(expect.any(Number));
            }
        });
    });
});
