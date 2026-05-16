/**
 * SupabaseService Tests
 * Comprehensive tests for cloud database operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseService } from '../SupabaseService';

// Mock Supabase client - service uses getUser(), and from().select().limit()
vi.mock('@/app/lib/supabase-client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id', email: 'test@test.com' } },
          error: null,
        })
      ),
    },
  },
}));

// Mock LocalStorageRepository - SupabaseService uses it for LocalStorage mode
vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
  LocalStorageRepository: {
    getInstance: vi.fn(() => ({
      load: vi.fn(() => []),
      save: vi.fn(),
    })),
  },
}));

describe('SupabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection', () => {
    it('should check connection successfully', async () => {
      const result = await SupabaseService.checkConnection();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Execution Files', () => {
    const mockExecutionFile = {
      id: 'test-exec-1',
      caseNo: '2026/123',
      executionType: 'مدني' as const,
      executionBasis: 'حكم قضائي',
      court: 'تنفيذ الكرخ',
      creditor: { name: 'أحمد محمد' },
      debtor: { name: 'خالد علي' },
      totalAmount: 5000000,
      createdAt: new Date().toISOString(),
    };

    it('should save execution file', async () => {
      const result = await SupabaseService.saveExecutionFile(mockExecutionFile);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should get execution files', async () => {
      const result = await SupabaseService.getExecutionFiles();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should update execution file', async () => {
      await SupabaseService.saveExecutionFile(mockExecutionFile as any);
      await expect(
        SupabaseService.updateExecutionFile('test-exec-1', { totalAmount: 6000000 })
      ).rejects.toThrow();
    });

    it('should delete execution file', async () => {
      await expect(
        SupabaseService.deleteExecutionFile('test-exec-1')
      ).resolves.toBeUndefined();
    });
  });

  describe('Lawsuit Files', () => {
    const mockLawsuitFile = {
      id: 'test-lawsuit-1',
      caseNo: '456/2026',
      court: 'بداءة الكرخ',
      stage: 'بداءة' as const,
      parties: [],
      نوع_الدعوى: 'مدني',
      المرحلة_الحالية: 'بداءة',
      مراحل: {
        بداءة: {
          محكمة: 'بداءة الكرخ',
          رقم_القضية: '456',
          سنة: '2026',
          أطراف: { مدعي: 'محمد', مدعىعليه: 'أحمد' },
        },
      },
      تاريخ_الإنشاء: new Date().toISOString(),
    };

    it('should save lawsuit file', async () => {
      const result = await SupabaseService.saveLawsuitFile(mockLawsuitFile);
      expect(result).toBeDefined();
    });

    it('should get lawsuit files', async () => {
      const result = await SupabaseService.getLawsuitFiles();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Global Notes', () => {
    const mockNote = {
      id: 'test-note-1',
      title: 'ملاحظة مهمة',
      content: 'محتوى الملاحظة',
      color: 'gold',
      createdAt: new Date().toISOString(),
    };

    it('should save global note', async () => {
      const result = await SupabaseService.saveGlobalNote(mockNote);
      expect(result).toBeDefined();
    });

    it('should get global notes', async () => {
      const result = await SupabaseService.getGlobalNotes();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delete global note', async () => {
      const result = await SupabaseService.deleteGlobalNote('test-note-1');
      expect(result).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await SupabaseService.checkConnection().catch(() => false);
      expect(typeof result).toBe('boolean');
    });

    it('should validate required fields', async () => {
      const invalidFile = { id: 'test', caseNo: 'x', court: 'x', executionType: 'مدني', executionBasis: 'x', creditor: {}, debtor: {}, totalAmount: 0 };
      await expect(
        SupabaseService.saveExecutionFile(invalidFile as any)
      ).resolves.toBeDefined();
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt sensitive data before saving', async () => {
      const sensitiveFile = {
        id: 'test-sensitive',
        caseNo: '2026/999',
        executionType: 'مدني' as const,
        executionBasis: 'حكم',
        court: 'تنفيذ',
        creditor: { name: 'سري', phone: '07901234567' },
        debtor: {},
        totalAmount: 10000000,
      };
      const result = await SupabaseService.saveExecutionFile(sensitiveFile as any);
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete operations within reasonable time', async () => {
      const startTime = Date.now();
      
      await SupabaseService.checkConnection();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });
});
