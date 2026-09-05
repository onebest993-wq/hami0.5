import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { useVaultDocDisplayUrl } from '@/app/components/lawyer/SmartRepository/useVaultDocDisplayUrl';

vi.mock('@/app/services/vault/vaultDocResolve', () => ({
    resolveVaultDocUrl: vi.fn(async (doc: { signedUrl?: string | null }) => {
        const raw = (doc.signedUrl || '').trim();
        if (raw.startsWith('javascript:') || raw.startsWith('data:text/html')) {
            return 'https://files.example/safe.jpg';
        }
        return raw || 'https://files.example/safe.jpg';
    }),
}));

vi.mock('@/app/services/vaultBlobStore', () => ({
    isVaultIdbStoragePath: (path: string) => path.startsWith('idb:vault:'),
}));

function doc(over: Partial<SmartVaultDoc> = {}): SmartVaultDoc {
    return {
        id: 'd1',
        title: 'صورة',
        type: 'image',
        tags: [],
        authorId: 'u1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        fileSize: 10,
        fileName: 'a.jpg',
        mimeType: 'image/jpeg',
        storagePath: 'u1/vault/a.jpg',
        signedUrl: null,
        ...over,
    };
}

describe('useVaultDocDisplayUrl', () => {
    it('لا يزرع javascript: في src', async () => {
        const { result } = renderHook(() =>
            useVaultDocDisplayUrl(doc({ signedUrl: 'javascript:alert(1)' })),
        );
        expect(result.current).toBeNull();
        await waitFor(() => {
            expect(result.current).toBe('https://files.example/safe.jpg');
        });
    });

    it('يقبل https آمناً فوراً', async () => {
        const { result } = renderHook(() =>
            useVaultDocDisplayUrl(doc({ signedUrl: 'https://cdn.example/a.jpg' })),
        );
        expect(result.current).toBe('https://cdn.example/a.jpg');
        await waitFor(() => {
            expect(result.current).toBe('https://cdn.example/a.jpg');
        });
    });
});
