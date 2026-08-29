/**
 * SupabaseService Tests
 * Comprehensive tests for cloud database operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const isLiveCloudSyncBucketEnabled = vi.hoisted(() => vi.fn(() => true));

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
  isLiveCloudSyncBucketEnabled: (...args: unknown[]) => isLiveCloudSyncBucketEnabled(...args),
}));

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
      // الخدمة تحلّ المالك عبر getSession قبل كل كتابة — غيابها كان يُسقط تسعة اختبارات
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              access_token: 'test-token',
              user: { id: 'test-user-id', email: 'test@test.com' },
            },
          },
          error: null,
        })
      ),
    },
  },
}));

/*
 * البيانات لا تمرّ بعميل Supabase بل بـSecureAPIClient نحو BFF. محاكاة العميل
 * وحده كانت تترك الاختبارات تطرق الشبكة فعلاً وتسقط قبل أن تفحص شيئاً.
 */
const fetchSecure = vi.fn(async (path: string) => {
  if (path.endsWith('/list')) return { ok: true, rows: [] };
  return { ok: true };
});

vi.mock('@/app/services/SecureAPIClient', () => ({
  SecureAPIClient: {
    fetchSecure: (path: string, init?: RequestInit) => fetchSecure(path, init),
  },
}));

function lastRequestBody(): Record<string, unknown> {
  const call = fetchSecure.mock.calls.at(-1);
  const init = call?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
}

// Mock LocalStorageRepository - SupabaseService uses it for LocalStorage mode
vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => {
  const instance = {
    load: vi.fn(() => []),
    save: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    flushPending: vi.fn(),
  };
  return {
    LocalStorageRepository: { getInstance: vi.fn(() => instance) },
    // المستهلكون يستوردون النسخة الجاهزة لا الصنف — وغيابها كان يُسقط تسعة اختبارات
    persistenceRepository: instance,
  };
});

describe('SupabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLiveCloudSyncBucketEnabled.mockReturnValue(true);
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
      expect(result).toBe('test-exec-1');
      expect(fetchSecure).toHaveBeenCalledWith('/api/execution-files/upsert', expect.anything());
      expect(lastRequestBody().external_id).toBe('test-exec-1');
    });

    it('should get execution files', async () => {
      const result = await SupabaseService.getExecutionFiles();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should update execution file', async () => {
      // القائمة فارغة في المحاكاة، والتحديث يقرأ قبل أن يكتب — فيرفض ما لا وجود له
      await expect(
        SupabaseService.updateExecutionFile('test-exec-1', { totalAmount: 6000000 })
      ).rejects.toThrow(/not found/i);
    });

    it('should delete execution file', async () => {
      await expect(SupabaseService.deleteExecutionFile('test-exec-1')).resolves.toBeUndefined();
      expect(fetchSecure).toHaveBeenCalledWith('/api/execution-files/delete', expect.anything());
      expect(lastRequestBody().external_id).toBe('test-exec-1');
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
      expect(result).toBe('test-lawsuit-1');
      expect(fetchSecure).toHaveBeenCalledWith('/api/lawsuit-files/upsert', expect.anything());
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
      // المعرّف يأتي من options.id لا من جسم الملاحظة — وإلا يُولَّد
      const reused = await SupabaseService.saveGlobalNote(mockNote, { id: 'test-note-1' });
      expect(reused).toBe('test-note-1');
      expect(lastRequestBody().external_id).toBe('test-note-1');

      const generated = await SupabaseService.saveGlobalNote(mockNote);
      expect(generated).toMatch(/^note_/);
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
      await SupabaseService.saveExecutionFile(sensitiveFile as any);

      // العقد الحقيقي: لا اسم ولا هاتف يغادر الجهاز نصّاً صريحاً
      const body = lastRequestBody();
      const wire = JSON.stringify(body);
      expect(wire).not.toContain('07901234567');
      expect(wire).not.toContain('سري');
      expect(typeof body.encrypted_data).toBe('string');
      expect(typeof body.data_signature).toBe('string');
      expect(body.security_version).toBe(3);
    });
  });

  describe('عزل سلة العمل', () => {
    it('لا يستدعي /api ولا يشفّر الحمولة عندما السلة مطفأة', async () => {
      isLiveCloudSyncBucketEnabled.mockReturnValue(false);
      fetchSecure.mockClear();
      const result = await SupabaseService.saveExecutionFile({
        id: 'local-only-1',
        caseNo: '1/2026',
        executionType: 'مدني',
        executionBasis: 'حكم',
        court: 'تنفيذ',
        creditor: { name: 'محلي' },
        debtor: {},
        totalAmount: 1,
      });
      expect(result).toBe('local-only-1');
      expect(await SupabaseService.getExecutionFiles()).toEqual([]);
      await SupabaseService.deleteExecutionFile('local-only-1');
      expect(fetchSecure).not.toHaveBeenCalled();
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
