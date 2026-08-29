import {
    MAX_BACKUP_VAULT_BINARY_BYTES,
    MAX_BACKUP_VAULT_BLOB_COUNT,
    type BusinessBackupVaultBlob,
} from './businessBackupTypes';

export function toBase64(buf: ArrayBuffer) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

export function fromBase64(b64: string, label: string) {
    if (!/^[A-Za-z0-9+/]*={0,2}$/u.test(b64) || b64.length % 4 !== 0) {
        throw new Error(`invalid ${label} encoding`);
    }
    const binary = atob(b64);
    const buf = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return buf;
}

function decodedBase64ByteLength(value: string): number {
    if (value.length === 0) return 0;
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
    return (value.length / 4) * 3 - padding;
}

export function validateVaultBlobRecords(value: unknown): BusinessBackupVaultBlob[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > MAX_BACKUP_VAULT_BLOB_COUNT) {
        throw new Error('invalid vault blob manifest');
    }
    const records: BusinessBackupVaultBlob[] = [];
    const seen = new Set<string>();
    let totalBytes = 0;
    for (const candidate of value) {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
            throw new Error('invalid vault blob record');
        }
        const record = candidate as Record<string, unknown>;
        const authorId = typeof record.authorId === 'string' ? record.authorId : '';
        const docId = typeof record.docId === 'string' ? record.docId : '';
        const mimeType = typeof record.mimeType === 'string' ? record.mimeType : '';
        const sha256 = typeof record.sha256 === 'string' ? record.sha256 : '';
        const data = typeof record.data === 'string' ? record.data : '';
        const size = record.size;
        if (
            !authorId ||
            authorId !== authorId.trim() ||
            authorId.length > 128 ||
            authorId.includes(':') ||
            /[\u0000-\u001f\u007f]/u.test(authorId) ||
            !docId ||
            docId !== docId.trim() ||
            docId.length > 512 ||
            /[\u0000-\u001f\u007f]/u.test(docId) ||
            !/^[\w.+-]+\/[\w.+-]+$/iu.test(mimeType) ||
            mimeType.length > 200 ||
            !/^[a-f0-9]{64}$/u.test(sha256) ||
            !Number.isSafeInteger(size) ||
            (size as number) < 0 ||
            !/^[A-Za-z0-9+/]*={0,2}$/u.test(data) ||
            data.length % 4 !== 0 ||
            decodedBase64ByteLength(data) !== size
        ) {
            throw new Error('invalid vault blob record');
        }
        const identity = `${authorId}:${docId}`;
        if (seen.has(identity)) throw new Error('duplicate vault blob record');
        seen.add(identity);
        totalBytes += size as number;
        if (totalBytes > MAX_BACKUP_VAULT_BINARY_BYTES) {
            throw new Error('vault blobs exceed the mobile-safe backup limit');
        }
        records.push({
            authorId,
            docId,
            mimeType,
            size: size as number,
            sha256,
            data,
        });
    }
    return records;
}

export async function sha256Hex(value: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', value);
    return [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}
