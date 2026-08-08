/** Wave 6 — استخراج نص المرفقات عبر Gemini multimodal (صور) */
export function isSparkVaultExtractEnabled(): boolean {
    return import.meta.env.VITE_SPARK_VAULT_EXTRACT_ENABLED === 'true';
}

export const VAULT_EXTRACT_MAX_CHARS = 12_000;
