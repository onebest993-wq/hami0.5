import { describe, expect, it, vi } from 'vitest';
import { requestSparkTextAudit } from '@/app/spark/audit/sparkTextAuditService';

const invokeMock = vi.fn();

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        functions: {
            invoke: (...args: unknown[]) => invokeMock(...args),
        },
    },
}));

describe('sparkTextAuditService', () => {
    it('يعيد null عند حصة Gemini 429 في رد الخادم', async () => {
        invokeMock.mockResolvedValue({
            data: { error: 'Gemini 429: quota exceeded' },
            error: null,
        });

        const result = await requestSparkTextAudit({
            text: 'نص طويل بما يكفي لاختبار رد الخادم عند امتلاء حصة Gemini',
            fieldType: 'petition',
        });

        expect(result).toBeNull();
    });

    it('يعيد null عند خطأ عام بدون 429', async () => {
        invokeMock.mockResolvedValue({
            data: { error: 'GEMINI_API_KEY not configured' },
            error: null,
        });

        const result = await requestSparkTextAudit({
            text: 'نص طويل بما يكفي لاختبار رد الخادم عند خطأ إعدادات',
            fieldType: 'note',
        });

        expect(result).toBeNull();
    });
});
