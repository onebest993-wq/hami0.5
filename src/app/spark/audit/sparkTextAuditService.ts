import { supabase } from '@/app/lib/supabase-client';
import type { SparkTextAuditRequest, SparkTextAuditResult } from '@/app/spark/audit/types';

type SparkTextAuditResponse = SparkTextAuditResult & { error?: string };

function extractInvokeErrorMessage(error: unknown, data: SparkTextAuditResponse | null): string {
    const parts: string[] = [];
    if (error && typeof error === 'object' && 'message' in error) {
        parts.push(String((error as { message?: string }).message ?? ''));
    }
    if (data?.error) parts.push(String(data.error));
    return parts.filter(Boolean).join(' | ');
}

/** يستدعي Edge Function `spark-text-audit` — يفشل بصمت عند غياب الخدمة */
export async function requestSparkTextAudit(
    input: SparkTextAuditRequest,
): Promise<SparkTextAuditResult | null> {
    const text = String(input.text ?? '').trim();
    if (text.length < 24) return null;

    try {
        const { data, error } = await supabase.functions.invoke<SparkTextAuditResponse>(
            'spark-text-audit',
            {
                body: {
                    text: text.slice(0, 12_000),
                    fieldType: input.fieldType,
                    caseNo: input.caseNo ?? '',
                    court: input.court ?? '',
                },
            },
        );

        const errorMessage = extractInvokeErrorMessage(error, data ?? null);
        if (error || !data || data.error) {
            return null;
        }
        if (!Array.isArray(data.present) || !Array.isArray(data.missing)) return null;

        return {
            present: data.present.map(String).filter(Boolean).slice(0, 8),
            missing: data.missing.map(String).filter(Boolean).slice(0, 8),
            summary: String(data.summary ?? '').trim(),
        };
    } catch {
        return null;
    }
}
