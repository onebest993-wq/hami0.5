import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const SHA256_HEX = /^[0-9a-f]{64}$/i;

/** SHA-256 UTF-8 hex — يطابق CryptoService.generateDataSignature على العميل */
export function sha256HexUtf8(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
}

function dossierPayloadMacSecret(): string {
    return String(process.env.HAMI_DOSSIER_PAYLOAD_MAC_SECRET ?? '').trim();
}

/** إنتاج Vercel أو HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE — صف بلا MAC يُرفض عند وجود السر */
export function dossierPayloadMacEnforced(): boolean {
    if (!dossierPayloadMacSecret()) return false;
    const flag = String(process.env.HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE ?? '').trim().toLowerCase();
    if (flag === '1' || flag === 'true' || flag === 'yes') return true;
    return String(process.env.VERCEL_ENV ?? '').trim().toLowerCase() === 'production';
}

/** HMAC-SHA256 hex إن وُجد سر الخادم — يكتشف عبث الصف خارج BFF */
export function computeDossierPayloadMac(encryptedData: string): string | null {
    const secret = dossierPayloadMacSecret();
    if (!secret) return null;
    return createHmac('sha256', secret).update(encryptedData, 'utf8').digest('hex');
}

export function dossierPayloadMacMatches(encryptedData: string, payloadMac: string): boolean {
    const expected = computeDossierPayloadMac(encryptedData);
    const got = String(payloadMac ?? '').trim().toLowerCase();
    if (!expected || !SHA256_HEX.test(got) || !SHA256_HEX.test(expected)) return false;
    try {
        return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(got, 'hex'));
    } catch {
        return false;
    }
}

/**
 * صف بلا MAC: يُقبل إن لم يُفرض التحقق. صف له MAC لا يطابق السر يُستبعد.
 * إن غاب السر لا تُصفّى الصفوف.
 */
export function retainCloudRowIfPayloadMacOk(row: {
    encrypted_data?: string | null;
    payload_mac?: string | null;
}): boolean {
    if (!dossierPayloadMacSecret()) return true;
    const mac = String(row.payload_mac ?? '').trim();
    if (!mac) return !dossierPayloadMacEnforced();
    return dossierPayloadMacMatches(String(row.encrypted_data ?? ''), mac);
}

/**
 * سلامة الحمولة المشفّرة المخزّنة: data_signature يجب أن يساوي SHA-256(encrypted_data).
 * ليس HMAC بمفتاح — يمنع تخزين توقيع لا يطابق النص المشفر (عبث أثناء النقل/عميل تالف).
 */
export function encryptedPayloadSignatureMatches(
    encryptedData: string,
    dataSignature: string,
): boolean {
    const expected = sha256HexUtf8(encryptedData);
    const got = String(dataSignature ?? '').trim().toLowerCase();
    if (!SHA256_HEX.test(got) || !SHA256_HEX.test(expected)) return false;
    try {
        return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(got, 'hex'));
    } catch {
        return false;
    }
}

