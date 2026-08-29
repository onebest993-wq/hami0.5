import {
    BACKUP_KDF_ITERATIONS,
    BACKUP_KDF_MAX_ITERATIONS,
    BACKUP_KDF_MIN_ITERATIONS,
    MAX_BACKUP_PLAINTEXT_BYTES,
    validateBackupPassword,
} from '@/app/services/settings/businessBackupSecurity';
import { fromBase64, toBase64 } from './businessBackupEncoding';

async function derivePasswordKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

export async function encryptBusinessBackupText(plainText: string, password: string) {
    const passwordCheck = validateBackupPassword(password);
    if (!passwordCheck.ok) throw new Error(`invalid backup password:${passwordCheck.reason}`);
    const plainBytes = new TextEncoder().encode(plainText);
    if (plainBytes.byteLength > MAX_BACKUP_PLAINTEXT_BYTES) {
        throw new Error('backup plaintext exceeds mobile-safe limit');
    }
    const saltBuf = new ArrayBuffer(16);
    const salt = new Uint8Array(saltBuf);
    crypto.getRandomValues(salt);
    const ivBuf = new ArrayBuffer(12);
    const iv = new Uint8Array(ivBuf);
    crypto.getRandomValues(iv);
    const iterations = BACKUP_KDF_ITERATIONS;
    const key = await derivePasswordKey(password, salt, iterations);
    const cipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plainBytes,
    );
    return {
        kind: 'hami-business-backup-encrypted' as const,
        version: 1 as const,
        createdAt: new Date().toISOString(),
        kdf: { name: 'PBKDF2' as const, hash: 'SHA-256' as const, iterations },
        salt: toBase64(salt.buffer),
        iv: toBase64(iv.buffer),
        ciphertext: toBase64(cipher),
    };
}

export async function decryptBusinessBackupText(
    encrypted: {
        kind?: unknown;
        version?: unknown;
        kdf?: unknown;
        salt?: unknown;
        iv?: unknown;
        ciphertext?: unknown;
    },
    password: string,
) {
    if (encrypted.kind !== 'hami-business-backup-encrypted' || encrypted.version !== 1) {
        throw new Error('invalid encrypted backup envelope');
    }
    const saltB64 = typeof encrypted.salt === 'string' ? encrypted.salt : '';
    const ivB64 = typeof encrypted.iv === 'string' ? encrypted.iv : '';
    const cipherB64 = typeof encrypted.ciphertext === 'string' ? encrypted.ciphertext : '';
    const kdf = encrypted.kdf as { iterations?: unknown } | undefined;
    const iterations = typeof kdf?.iterations === 'number' ? kdf.iterations : Number.NaN;
    if (!saltB64 || !ivB64 || !cipherB64) throw new Error('invalid encrypted backup');
    if (
        !Number.isSafeInteger(iterations) ||
        iterations < BACKUP_KDF_MIN_ITERATIONS ||
        iterations > BACKUP_KDF_MAX_ITERATIONS
    ) {
        throw new Error('invalid backup KDF iterations');
    }
    if (
        !kdf ||
        (kdf as { name?: unknown }).name !== 'PBKDF2' ||
        (kdf as { hash?: unknown }).hash !== 'SHA-256'
    ) {
        throw new Error('unsupported backup KDF');
    }
    if (cipherB64.length > Math.ceil(MAX_BACKUP_PLAINTEXT_BYTES / 3) * 4 + 64) {
        throw new Error('encrypted backup exceeds size limit');
    }
    const salt = new Uint8Array(fromBase64(saltB64, 'salt'));
    const iv = new Uint8Array(fromBase64(ivB64, 'iv'));
    const cipher = fromBase64(cipherB64, 'ciphertext');
    if (salt.byteLength !== 16 || iv.byteLength !== 12 || cipher.byteLength < 16) {
        throw new Error('invalid encrypted backup parameters');
    }
    const key = await derivePasswordKey(password, salt, iterations);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    if (plainBuf.byteLength > MAX_BACKUP_PLAINTEXT_BYTES) {
        throw new Error('decrypted backup exceeds size limit');
    }
    return new TextDecoder().decode(plainBuf);
}
