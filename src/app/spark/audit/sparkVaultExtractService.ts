import { supabase } from '@/app/lib/supabase-client';
import { VAULT_EXTRACT_MAX_CHARS } from '@/app/spark/audit/sparkVaultExtractConfig';

export type SparkVaultExtractRequest = {
    mimeType: string;
    base64Data: string;
    fileName?: string;
};

export type SparkVaultExtractResult = {
    text: string;
    summary?: string;
};

type SparkVaultExtractResponse = SparkVaultExtractResult & { error?: string };

/** يستدعي Edge Function `spark-vault-extract` — يفشل بصمت عند غياب الخدمة */
export async function requestSparkVaultExtract(
    input: SparkVaultExtractRequest,
): Promise<SparkVaultExtractResult | null> {
    const base64 = String(input.base64Data ?? '').trim();
    if (base64.length < 32) return null;

    try {
        const { data, error } = await supabase.functions.invoke<SparkVaultExtractResponse>(
            'spark-vault-extract',
            {
                body: {
                    mimeType: input.mimeType || 'image/jpeg',
                    base64Data: base64.slice(0, 8_000_000),
                    fileName: input.fileName ?? '',
                    maxChars: VAULT_EXTRACT_MAX_CHARS,
                },
            },
        );

        if (error || !data || data.error) return null;
        const text = String(data.text ?? '').trim();
        if (!text) return null;
        return {
            text: text.slice(0, VAULT_EXTRACT_MAX_CHARS),
            summary: String(data.summary ?? '').trim() || undefined,
        };
    } catch {
        return null;
    }
}
