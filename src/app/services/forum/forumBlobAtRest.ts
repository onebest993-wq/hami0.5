import type { CryptoService as CryptoServiceType } from '@/app/services/CryptoService';

type ForumBlobAtRestRow = {
    blob: Blob;
    mimeType: string;
    encrypted?: boolean;
};

async function loadCrypto(): Promise<typeof CryptoServiceType> {
    const { CryptoService } = await import('@/app/services/CryptoService');
    return CryptoService;
}

async function ensureMasterKey(): Promise<boolean> {
    const CryptoService = await loadCrypto();
    return CryptoService.hasMasterKey();
}

async function blobToBase64(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunk = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunk) {
        const end = Math.min(i + chunk, bytes.length);
        let slice = '';
        for (let j = i; j < end; j++) slice += String.fromCharCode(bytes[j]);
        binary += slice;
    }
    return btoa(binary);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

/** يشفّر إن وُجد مفتاح الجلسة؛ وإلا يُبقي الملف كما هو (لا يفشل الحفظ). */
export async function wrapForumBlobForAtRest(plain: Blob): Promise<{ blob: Blob; encrypted: boolean }> {
    if (!(await ensureMasterKey())) {
        return { blob: plain, encrypted: false };
    }
    try {
        const CryptoService = await loadCrypto();
        const cipher = await CryptoService.encryptData(await blobToBase64(plain));
        return { blob: new Blob([cipher], { type: 'application/octet-stream' }), encrypted: true };
    } catch {
        return { blob: plain, encrypted: false };
    }
}

/** الصفوف بلا encrypted تُعاد كما كُتبت. المشفر بلا مفتاح لا يُعرض كنص واضح. */
export async function unwrapForumBlobFromAtRest(row: ForumBlobAtRestRow): Promise<Blob | null> {
    if (!row.encrypted) return row.blob;
    if (!(await ensureMasterKey())) return null;
    try {
        const CryptoService = await loadCrypto();
        const cipher = (await row.blob.text()).trim();
        if (!cipher) return null;
        return base64ToBlob(await CryptoService.decryptData(cipher), row.mimeType);
    } catch {
        return null;
    }
}
