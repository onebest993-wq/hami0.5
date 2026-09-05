import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/services/CryptoService', () => {
    const plainByCipher = new Map<string, string>();
    let n = 0;
    return {
        CryptoService: {
            initialize: vi.fn(async () => undefined),
            encryptData: vi.fn(async (plain: string) => {
                const cipher = `c${++n}`;
                plainByCipher.set(cipher, plain);
                return cipher;
            }),
            decryptData: vi.fn(async (cipher: string) => plainByCipher.get(cipher) ?? '{}'),
            generateDataSignature: vi.fn(async () => 'sig'),
            verifyDataSignature: vi.fn(async () => true),
        },
    };
});

import {
    isSealedWorkCloudKv,
    sealWorkCloudKvValue,
    unsealWorkCloudKvValue,
} from '@/app/services/cloud/workCloudKvSeal';
import { CryptoService } from '@/app/services/CryptoService';

describe('workCloudKvSeal', () => {
    beforeEach(() => {
        vi.mocked(CryptoService.verifyDataSignature).mockResolvedValue(true);
    });

    it('يختم ويفكّ بدون بقاء النص في الغلاف', async () => {
        const sealed = await sealWorkCloudKvValue({ title: 'شكوى جناية — المتهم فلان' });
        expect(isSealedWorkCloudKv(sealed)).toBe(true);
        expect(JSON.stringify(sealed)).not.toContain('المتهم فلان');
        expect(sealed).not.toHaveProperty('id');
        await expect(unsealWorkCloudKvValue(sealed)).resolves.toEqual({
            title: 'شكوى جناية — المتهم فلان',
        });
    });

    it('يقبل الإرث الصريح كما هو', async () => {
        const legacy = { id: 'd1', title: 'عقد' };
        await expect(unsealWorkCloudKvValue(legacy)).resolves.toEqual(legacy);
        expect(isSealedWorkCloudKv(legacy)).toBe(false);
    });

    it('يرفض غلافاً بتوقيع فاسد', async () => {
        vi.mocked(CryptoService.verifyDataSignature).mockResolvedValueOnce(false);
        const sealed = await sealWorkCloudKvValue({ title: 'سر' });
        await expect(unsealWorkCloudKvValue(sealed)).resolves.toBeNull();
    });
});
