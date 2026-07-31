import { beforeEach, describe, expect, it, vi } from 'vitest';

const kvGetMock = vi.fn();
const { requireWifeUserMock } = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
}));

vi.mock('../security/bffAuth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../security/bffAuth.ts')>();
    return {
        ...actual,
        requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
    };
});

vi.mock('../security/kvStoreAdmin.ts', () => ({
    kvGet: (...args: unknown[]) => kvGetMock(...args),
    kvSet: vi.fn(),
    kvDel: vi.fn(),
    kvDelByPrefix: vi.fn(),
    kvGetByPrefix: vi.fn(),
    kvKeysByPrefix: vi.fn(),
}));

import { POST } from './route';

function buildGetRequest(key: string): Request {
    return new Request('http://127.0.0.1/api/kv-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', key }),
    });
}

describe('kv-proxy profile get redact', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'visitor-9' });
    });

    it('يفرّغ هاتف ملف الغير قبل إرساله للعميل', async () => {
        kvGetMock.mockResolvedValue({
            header: {
                name: 'أحمد',
                title: 'محامٍ',
                coverImage: '',
                profileImage: '',
                phone: '07501234567',
                profileImagePath: 'secret/path',
            },
            sections: [],
            customization: {
                privacy: {
                    showPhoneMeta: false,
                    showCityMeta: true,
                    showSyndicate: true,
                    showContactChannels: true,
                    showGallery: true,
                    showCustomBlocks: true,
                    hiddenContactIds: [],
                },
                appearance: { accentColor: 'gold', material: 'glass' },
                customBlocks: [],
            },
        });

        const res = await POST(buildGetRequest('profile:owner-1'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ok: boolean; value: { header: { phone: string; profileImagePath?: string } } };
        expect(body.ok).toBe(true);
        expect(body.value.header.phone).toBe('');
        expect(body.value.header.profileImagePath).toBeUndefined();
    });

    it('يُبقي ملف المالك كاملاً', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'owner-1' });
        kvGetMock.mockResolvedValue({
            header: {
                name: 'أحمد',
                title: 'محامٍ',
                coverImage: '',
                profileImage: '',
                phone: '07501234567',
                profileImagePath: 'secret/path',
            },
            sections: [],
        });

        const res = await POST(buildGetRequest('profile:owner-1'));
        const body = (await res.json()) as { value: { header: { phone: string; profileImagePath?: string } } };
        expect(body.value.header.phone).toBe('07501234567');
        expect(body.value.header.profileImagePath).toBe('secret/path');
    });
});
