import { describe, expect, it } from 'vitest';
import {
    composeLawyerDirectoryName,
    isAdminUserRole,
    isAdminUserStatus,
    isHeadquartersAssignableRole,
    type AdminUser,
} from '@/app/domain/admin/AdminUser';
import { IAdminRepository } from '@/app/domain/admin/IAdminRepository';

describe('AdminUser domain', () => {
    it('validates roles and statuses', () => {
        expect(isAdminUserRole('admin')).toBe(true);
        expect(isAdminUserRole('super')).toBe(false);
        expect(isHeadquartersAssignableRole('admin')).toBe(false);
        expect(isHeadquartersAssignableRole('moderator')).toBe(true);
        expect(isHeadquartersAssignableRole('client')).toBe(false);
        expect(isAdminUserRole('client')).toBe(false);
        expect(isAdminUserStatus('active')).toBe(true);
        expect(isAdminUserStatus('banned')).toBe(false);
        expect(composeLawyerDirectoryName('علي محمد حسن', 'العبودي', 'x@y.z')).toBe(
            'علي محمد حسن العبودي',
        );
        expect(composeLawyerDirectoryName('', '', 'lawyer@gmail.com')).toBe('lawyer');
    });
});

describe('IAdminRepository contract', () => {
    it('can be implemented by a concrete repository', async () => {
        const sample: AdminUser = {
            id: 'u1',
            email: 'a@b.c',
            fullName: 'اختبار',
            familyName: '',
            phone: '',
            governorate: '',
            lawyerBarRoom: '',
            role: 'lawyer',
            status: 'active',
            createdAt: new Date().toISOString(),
            freezeUntil: null,
            verificationStatus: 'none',
        };

        class MemoryAdminRepository extends IAdminRepository {
            async fetchDirectory(): Promise<{
                users: AdminUser[];
                capped: boolean;
                matched: number;
                usersTotal: number;
                hasMore: boolean;
                matchedExact: boolean;
                offset: number;
                limit: number;
            }> {
                return {
                    users: [sample],
                    capped: false,
                    matched: 1,
                    usersTotal: 1,
                    hasMore: false,
                    matchedExact: true,
                    offset: 0,
                    limit: 50,
                };
            }
            async changeUserRole(userId: string, role: AdminUser['role']): Promise<AdminUser> {
                expect(userId).toBe('u1');
                return { ...sample, role };
            }
            async freezeAccount(userId: string, durationHours: 0 | 24 | 72 | 168): Promise<AdminUser> {
                expect(userId).toBe('u1');
                expect(durationHours).toBe(24);
                return {
                    ...sample,
                    status: 'suspended',
                    freezeUntil: new Date(Date.now() + 24 * 3600_000).toISOString(),
                };
            }
            async unfreezeAccount(userId: string): Promise<AdminUser> {
                expect(userId).toBe('u1');
                return { ...sample, status: 'active', freezeUntil: null };
            }
            async revokeUserSessions(userId: string): Promise<AdminUser | null> {
                expect(userId).toBe('u1');
                return sample;
            }
            async setUserPassword(userId: string, password: string): Promise<AdminUser | null> {
                expect(userId).toBe('u1');
                expect(password).toBe('HamiLaw9x');
                return sample;
            }
            async sendSystemNotice(): Promise<{ sent: number; failed: number; capped: boolean }> {
                return { sent: 1, failed: 0, capped: false };
            }
            async lockLogin(userId: string): Promise<AdminUser> {
                return { ...sample, id: userId, loginBlocked: true };
            }
            async unlockLogin(userId: string): Promise<AdminUser> {
                return { ...sample, id: userId };
            }
            async softDeleteAccount(userId: string): Promise<AdminUser> {
                return { ...sample, id: userId, isDeleted: true };
            }
            async restoreAccount(userId: string): Promise<AdminUser> {
                return { ...sample, id: userId, isDeleted: false };
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
            async fetchAccountActivity(userId: string) {
                return {
                    user: { ...sample, id: userId },
                    activity: {
                        createdAt: sample.createdAt,
                        lastSignInAt: null,
                        emailConfirmedAt: null,
                        bannedUntil: null,
                        sessionCount: 0,
                        lastDevice: null,
                        lastIp: null,
                        lastPlace: null,
                        connections: [],
                        forumPosts: 0,
                        forumComments: 0,
                        forumBanned: false,
                        forumBanReason: null,
                        forumBanExpiresAt: null,
                        timeline: [],
                        gaps: [],
                    },
                };
            }
        }

        const repo = new MemoryAdminRepository();
        await expect(repo.fetchAllUsers()).resolves.toEqual([sample]);
        await expect(repo.changeUserRole('u1', 'moderator')).resolves.toMatchObject({
            role: 'moderator',
        });
        await expect(repo.freezeAccount('u1', 24)).resolves.toMatchObject({ status: 'suspended' });
        await expect(repo.setUserPassword('u1', 'HamiLaw9x')).resolves.toMatchObject({ id: 'u1' });
    });
});
