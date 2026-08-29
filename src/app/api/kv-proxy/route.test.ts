import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireWifeUserMock, kvGetMock, kvDelByPrefixMock, kvKeysByPrefixMock } = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    kvGetMock: vi.fn(),
    kvDelByPrefixMock: vi.fn(),
    kvKeysByPrefixMock: vi.fn(),
}));

vi.mock('../security/bffAuth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../security/bffAuth.ts')>();
    return {
        ...actual,
        requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
        requireWifeCloudWrite: (...args: unknown[]) => requireWifeUserMock(...args),
    };
});

vi.mock('../security/kvStoreAdmin.ts', () => ({
    kvGet: (...args: unknown[]) => kvGetMock(...args),
    kvSet: vi.fn(),
    kvDel: vi.fn(),
    kvDelByPrefix: (...args: unknown[]) => kvDelByPrefixMock(...args),
    kvGetByPrefix: vi.fn(),
    kvKeysByPrefix: (...args: unknown[]) => kvKeysByPrefixMock(...args),
}));

import { POST } from './route';

function buildGetRequest(key: string): Request {
    return new Request('http://127.0.0.1/api/kv-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', key }),
    });
}

function buildActionRequest(body: Record<string, unknown>): Request {
    return new Request('http://127.0.0.1/api/kv-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

describe('kv-proxy public prefix authorization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'user-1' });
    });

    it('يرفض تفريغ منشورات المجتمع من KV العام', async () => {
        const res = await POST(
            buildActionRequest({ action: 'listKeysByPrefix', prefix: 'community:posts:' }),
        );

        expect(res.status).toBe(403);
        expect(kvKeysByPrefixMock).not.toHaveBeenCalled();
    });

    it('يرفض تفريغ المستودع لكل المحامين من KV العام', async () => {
        const res = await POST(
            buildActionRequest({ action: 'listKeysByPrefix', prefix: 'repository:docs:' }),
        );

        expect(res.status).toBe(403);
        expect(kvKeysByPrefixMock).not.toHaveBeenCalled();
    });

    it.each(['community:posts:', 'community:reports:', 'repository:docs:'])(
        'يرفض الحذف الجماعي للبادئة العامة %s',
        async (prefix) => {
            const res = await POST(buildActionRequest({ action: 'delByPrefix', prefix }));

            expect(res.status).toBe(403);
            expect(kvDelByPrefixMock).not.toHaveBeenCalled();
        },
    );

    it('يرفض قراءة بلاغات المجتمع من KV العام', async () => {
        const res = await POST(
            buildActionRequest({ action: 'listKeysByPrefix', prefix: 'community:reports:' }),
        );

        expect(res.status).toBe(403);
        expect(kvKeysByPrefixMock).not.toHaveBeenCalled();
    });
});
