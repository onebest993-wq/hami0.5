import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

const store = vi.hoisted(() => {
    const items = new Map<string, string>();
    let releaseSetItem: (() => void) | null = null;
    let holdSetItem = false;
    return {
        items,
        setHoldSetItem(next: boolean) {
            holdSetItem = next;
        },
        release() {
            releaseSetItem?.();
            releaseSetItem = null;
        },
        setItem: vi.fn(async (key: string, value: string) => {
            if (holdSetItem) {
                await new Promise<void>((resolve) => {
                    releaseSetItem = resolve;
                });
            }
            items.set(key, value);
        }),
        setItemSync: vi.fn((key: string, value: string) => {
            items.set(`sync:${key}`, value);
            return true;
        }),
        waitForPendingSetItem: undefined as undefined | ((key?: string) => Promise<void>),
        getItemSync: vi.fn((key: string) => items.get(key) ?? items.get(`sync:${key}`) ?? null),
        getItem: vi.fn(async (key: string) => items.get(key) ?? items.get(`sync:${key}`) ?? null),
    };
});

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: (...args: unknown[]) => store.getItemSync(...(args as [string])),
        getItem: (...args: unknown[]) => store.getItem(...(args as [string])),
        setItemSync: (...args: unknown[]) => store.setItemSync(...(args as [string, string])),
        setItem: (...args: unknown[]) => store.setItem(...(args as [string, string])),
        waitForPendingSetItem: (key?: string) =>
            store.waitForPendingSetItem ? store.waitForPendingSetItem(key) : store.setItem(key ?? '', ''),
    },
}));

vi.mock('@/app/services/profileMediaService', () => ({
    refreshProfileMediaUrl: vi.fn(async (_path: string, current?: string) => current ?? ''),
    refreshProfileCustomizationMedia: vi.fn(async (c) => c),
}));

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'owner-1' } } } })) } },
}));

vi.mock('@/app/services/calendar/bridge/lite', () => ({
    resolveCalendarUserId: vi.fn((id: string) => id),
}));

const kv = vi.hoisted(() => ({
    get: vi.fn(async () => null),
    set: vi.fn(async () => {
        throw new Error('kv_local_only');
    }),
}));

vi.mock('@/app/services/cloud/lawyerCloudKv', () => ({
    lawyerCloudKv: {
        get: (...args: unknown[]) => kv.get(...args),
        set: (...args: unknown[]) => kv.set(...args),
    },
}));

const profile: LawyerProfileData = {
    header: { name: 'محامٍ محلي', title: 'محامٍ', coverImage: '', profileImage: '' },
    sections: [
        {
            id: 'actions-1',
            type: 'actions',
            data: [{ id: 'call', type: 'call', label: 'هاتف', value: '07801234567' }],
        },
        {
            id: 'gallery-1',
            type: 'gallery',
            data: [{ url: 'https://cdn.example.com/g.jpg', focusX: 50, focusY: 50, zoom: 100 }],
        },
    ],
};

describe('ProfileDB local persist durability', () => {
    beforeEach(() => {
        store.items.clear();
        store.setHoldSetItem(false);
        kv.get.mockClear();
        kv.set.mockClear();
        store.setItem.mockClear();
        store.setItemSync.mockClear();
        store.waitForPendingSetItem = async (key?: string) => {
            await store.setItem(key ?? 'hami:profile:v1:owner-1', store.items.get(`sync:${key}`) ?? '');
        };
        vi.resetModules();
    });

    it('لا يُكمل saveProfile قبل setItem', async () => {
        store.setHoldSetItem(true);
        store.waitForPendingSetItem = async () => {
            await store.setItem('hami:profile:v1:owner-1', JSON.stringify(profile));
        };
        const { ProfileDB } = await import('@/app/services/cloud/lawyerProfileCloud');
        let settled = false;
        const pending = ProfileDB.saveProfile('owner-1', profile, 'owner-1').then((result) => {
            settled = true;
            return result;
        });
        await Promise.resolve();
        await Promise.resolve();
        expect(settled).toBe(false);
        store.release();
        const result = await pending;
        expect(result.localPersisted).toBe(true);
        expect(result.profile?.sections.find((s) => s.type === 'actions')?.data).toEqual(
            expect.arrayContaining([expect.objectContaining({ value: '07801234567' })]),
        );
    });
});
