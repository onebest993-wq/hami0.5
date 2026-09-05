/**
 * ختم حمولة KV لأقسام العمل عند المزامنة السحابية.
 * المحلي يبقى في SecureStore؛ هذا الغلاف يمنع عناوين الموكّلين ونصوص OCR
 * من الجلوس نصاً صريحاً خلف kv-proxy حتى مع توقيع WIFE.
 */
import { CryptoService } from '@/app/services/CryptoService';

export const WORK_CLOUD_KV_SEAL_VERSION = 1 as const;

export type SealedWorkCloudKv = {
    v: typeof WORK_CLOUD_KV_SEAL_VERSION;
    encrypted_data: string;
    data_signature: string;
};

export function isSealedWorkCloudKv(value: unknown): value is SealedWorkCloudKv {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const o = value as Record<string, unknown>;
    return (
        o.v === WORK_CLOUD_KV_SEAL_VERSION &&
        typeof o.encrypted_data === 'string' &&
        o.encrypted_data.length > 0 &&
        typeof o.data_signature === 'string' &&
        o.data_signature.length > 0 &&
        typeof o.id !== 'string'
    );
}

export async function sealWorkCloudKvValue(payload: unknown): Promise<SealedWorkCloudKv> {
    await CryptoService.initialize();
    const json = JSON.stringify(payload ?? null);
    const encrypted_data = await CryptoService.encryptData(json);
    const data_signature = await CryptoService.generateDataSignature(encrypted_data);
    return { v: WORK_CLOUD_KV_SEAL_VERSION, encrypted_data, data_signature };
}

/** إرث صريح يُعاد كما هو؛ الغلاف المختوم يُفكّ أو يُرفض */
export async function unsealWorkCloudKvValue(raw: unknown): Promise<unknown> {
    if (!isSealedWorkCloudKv(raw)) return raw;
    await CryptoService.initialize();
    const intact = await CryptoService.verifyDataSignature(raw.encrypted_data, raw.data_signature);
    if (!intact) return null;
    try {
        return JSON.parse(await CryptoService.decryptData(raw.encrypted_data)) as unknown;
    } catch {
        return null;
    }
}
