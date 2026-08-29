import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminUser } from '@/app/domain/admin/AdminUser';
import { IAdminRepository } from '@/app/domain/admin/IAdminRepository';

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

const dispatchHqStatusRefresh = vi.fn();
vi.mock('@/app/components/admin/hqStatusEvents', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/components/admin/hqStatusEvents')>();
    return {
        ...actual,
        dispatchHqStatusRefresh: () => dispatchHqStatusRefresh(),
    };
});

import { HQ_DIRECTORY_LOAD_BUDGET_MS, useHeadquarters } from '../useHeadquarters';
import { HQ_STATUS_REFRESH_EVENT, HQ_VERIFICATION_CHANGED_EVENT } from '@/app/components/admin/hqStatusEvents';

const sample: AdminUser = {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    email: 'a@b.c',
    fullName: 'محام',
    familyName: '',
    phone: '',
    governorate: '',
    lawyerBarRoom: '',
    role: 'lawyer',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    freezeUntil: null,
    verificationStatus: 'active',
};

class MemoryRepo extends IAdminRepository {
    users = [sample];
    fetchCalls = 0;
    async fetchDirectory(signal?: AbortSignal): Promise<{
        users: AdminUser[];
        capped: boolean;
        matched: number;
        usersTotal: number;
        hasMore: boolean;
        matchedExact: boolean;
        offset: number;
        limit: number;
    }> {
        this.fetchCalls += 1;
        if (signal?.aborted) {
            const err = new Error('aborted');
            err.name = 'AbortError';
            throw err;
        }
        return {
            users: this.users,
            capped: false,
            matched: this.users.length,
            usersTotal: this.users.length,
            hasMore: false,
            matchedExact: true,
            offset: 0,
            limit: 50,
        };
    }
    async changeUserRole(userId: string, role: AdminUser['role']): Promise<AdminUser> {
        return { ...sample, id: userId, role };
    }
    async freezeAccount(userId: string, durationHours: 0 | 24 | 72 | 168): Promise<AdminUser> {
        expect(durationHours).toBe(24);
        return { ...sample, id: userId, status: 'suspended' };
    }
    async unfreezeAccount(userId: string): Promise<AdminUser> {
        return { ...sample, id: userId, status: 'active' };
    }
    async revokeUserSessions(): Promise<AdminUser | null> {
        return sample;
    }
    async setUserPassword(): Promise<AdminUser | null> {
        return sample;
    }
    async sendSystemNotice(): Promise<{ sent: number; failed: number; capped: boolean }> {
        return { sent: 1, failed: 0, capped: false };
    }
    async lockLogin(userId: string): Promise<AdminUser> {
        return { ...sample, id: userId, loginBlocked: true };
    }
    async unlockLogin(userId: string): Promise<AdminUser> {
        return { ...sample, id: userId, loginBlocked: false, loginUntil: null };
    }
    async softDeleteAccount(userId: string): Promise<AdminUser> {
        return { ...sample, id: userId, isDeleted: true, loginBlocked: true };
    }
    async restoreAccount(userId: string): Promise<AdminUser> {
        return { ...sample, id: userId, isDeleted: false, loginBlocked: false };
    }
    async banForum(userId: string): Promise<AdminUser> {
        return { ...sample, id: userId };
    }
    async unbanForum(userId: string): Promise<AdminUser> {
        return { ...sample, id: userId };
    }
    async setPublicVerifiedBadge(userId: string, shown: boolean): Promise<AdminUser> {
        return { ...sample, id: userId, publicVerifiedBadge: shown };
    }
    async fetchAccountActivity(userId: string): Promise<{ user: AdminUser; activity: import('@/app/domain/admin/HqAccountActivity').HqAccountActivity }> {
        return {
            user: { ...sample, id: userId },
            activity: {
                createdAt: sample.createdAt,
                lastSignInAt: null,
                emailConfirmedAt: null,
                bannedUntil: null,
                sessionCount: null,
                lastDevice: null,
                lastIp: null,
                lastPlace: null,
                connections: [],
                forumPosts: null,
                forumComments: null,
                forumBanned: false,
                forumBanReason: null,
                forumBanExpiresAt: null,
                timeline: [],
                gaps: ['sessions'],
            },
        };
    }
}

describe('useHeadquarters', () => {
    beforeEach(() => {
        dispatchHqStatusRefresh.mockReset();
    });

    it('يحمّل الدليل ويبقي الصفوف عند تحديث فاشل', async () => {
        const repo = new MemoryRepo();
        const { result } = renderHook(() => useHeadquarters(repo));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.users).toHaveLength(1);

        repo.fetchDirectory = async () => {
            throw new Error('down');
        };
        await act(async () => {
            await result.current.refresh();
        });
        expect(result.current.users).toHaveLength(1);
        expect(result.current.error).toMatch(/down|تعذّر/);
        expect(result.current.refreshing).toBe(false);
    });

    it('skipFetch لا يطلب الدليل', async () => {
        const repo = new MemoryRepo();
        const { result } = renderHook(() => useHeadquarters(repo, { skipFetch: true }));
        await act(async () => {
            await Promise.resolve();
        });
        expect(repo.fetchCalls).toBe(0);
        expect(result.current.loading).toBe(false);
    });

    it('بعد التجميد يحدّث نبض الإحصائيات', async () => {
        const repo = new MemoryRepo();
        const { result } = renderHook(() => useHeadquarters(repo));
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => {
            await result.current.freezeAccount(sample.id, 24);
        });
        expect(dispatchHqStatusRefresh).toHaveBeenCalled();
        expect(result.current.users[0]?.status).toBe('suspended');
    });

    it('يعرض مهلة عربية ويبقي القائمة عند تحديث منقطع', async () => {
        const repo = new MemoryRepo();
        const { result } = renderHook(() => useHeadquarters(repo));
        await waitFor(() => expect(result.current.loading).toBe(false));

        repo.fetchDirectory = async () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            throw err;
        };
        await act(async () => {
            await result.current.refresh();
        });
        expect(result.current.users).toHaveLength(1);
        expect(result.current.error).toBe('انتهت مهلة التحديث — تُعرض القائمة السابقة');
    });

    it('يفك الواجهة بعد مهلة التحميل الأولى', async () => {
        vi.useFakeTimers();
        try {
            const repo = new MemoryRepo();
            repo.fetchDirectory = () => new Promise(() => {});
            const { result } = renderHook(() => useHeadquarters(repo));
            await act(async () => {
                await vi.advanceTimersByTimeAsync(HQ_DIRECTORY_LOAD_BUDGET_MS);
            });
            expect(result.current.loading).toBe(false);
            expect(result.current.users).toEqual([]);
            expect(result.current.error).toBe('انتهت مهلة تحميل الدليل');
        } finally {
            vi.useRealTimers();
        }
    });

    it('لا يلغي التحميل الأول عند حدث نبض المقر', async () => {
        const repo = new MemoryRepo();
        let release!: (value: {
            users: AdminUser[];
            capped: boolean;
            matched: number;
            usersTotal: number;
            hasMore: boolean;
            matchedExact: boolean;
            offset: number;
            limit: number;
        }) => void;
        let first = true;
        repo.fetchDirectory = () => {
            repo.fetchCalls += 1;
            if (first) {
                first = false;
                return new Promise((resolve) => {
                    release = resolve;
                });
            }
            return Promise.resolve({
                users: repo.users,
                capped: false,
                matched: repo.users.length,
                usersTotal: repo.users.length,
                hasMore: false,
                matchedExact: true,
                offset: 0,
                limit: 50,
            });
        };
        const { result } = renderHook(() => useHeadquarters(repo));
        await waitFor(() => expect(result.current.loading).toBe(true));
        await act(async () => {
            window.dispatchEvent(new Event(HQ_STATUS_REFRESH_EVENT));
            await Promise.resolve();
        });
        expect(repo.fetchCalls).toBe(1);
        await act(async () => {
            release({
                users: [sample],
                capped: false,
                matched: 1,
                usersTotal: 1,
                hasMore: false,
                matchedExact: true,
                offset: 0,
                limit: 50,
            });
        });
        await waitFor(() => expect(result.current.users).toHaveLength(1));
        expect(result.current.error).toBeNull();
    });

    it('يعيد جلب الدليل بعد اعتماد من تبويب التوثيق', async () => {
        const repo = new MemoryRepo();
        const { result } = renderHook(() => useHeadquarters(repo));
        await waitFor(() => expect(result.current.loading).toBe(false));
        const before = repo.fetchCalls;
        repo.users = [{ ...sample, verificationStatus: 'active' }];
        await act(async () => {
            window.dispatchEvent(new Event(HQ_STATUS_REFRESH_EVENT));
        });
        await waitFor(() => expect(repo.fetchCalls).toBeGreaterThan(before));
        expect(result.current.users[0]?.verificationStatus).toBe('active');
    });

    it('يرقّع حالة التوثيق فوراً من حدث المقر دون انتظار الجلب', async () => {
        const repo = new MemoryRepo();
        repo.users = [{ ...sample, verificationStatus: 'pending' }];
        const { result } = renderHook(() => useHeadquarters(repo));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.users[0]?.verificationStatus).toBe('pending');
        await act(async () => {
            window.dispatchEvent(
                new CustomEvent(HQ_VERIFICATION_CHANGED_EVENT, {
                    detail: { userId: sample.id, status: 'active' },
                }),
            );
        });
        expect(result.current.users[0]?.verificationStatus).toBe('active');
    });
});
