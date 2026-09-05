import { UserRole } from '../types/admin-types';
export { uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
export { LawyerDB } from '@/app/services/lawyerDbRuntime';
import { LawyerStorage } from '@/app/services/storage/lawyerStorageRuntime';
import {
    BanDB as CommunityBanDB,
    CommunityDB as CommunityRuntimeDB,
    getCommunityReports,
} from '@/app/services/cloud/lawyerCommunityCloud';
import { CalendarDB as CalendarRuntimeDB } from '@/app/services/cloud/lawyerCalendarCloud';
import {
    TransactionDB as TransactionsRuntimeDB,
    TransactionsThreadingDB as TransactionsThreadingRuntimeDB,
} from '@/app/services/cloud/lawyerTransactionsCloud';
import {
    RepositoryDB,
    type RepositoryDocument,
} from '@/app/services/cloud/lawyerRepositoryCloud';

export type { RepositoryDocument } from '@/app/services/cloud/lawyerRepositoryCloud';
export {
    listRepositoryDocumentsSync,
    RepositoryDB,
    getRepositoryDocuments,
    addRepositoryDocument,
} from '@/app/services/cloud/lawyerRepositoryCloud';

export type {
    CommunityAttachment,
    ForumEditHistoryEntry,
    CommunityComment,
    CommunityPost,
    NotificationType,
    ForumNotification,
    BanRecord,
    CommunityReport,
    FollowRecord,
} from '@/app/services/cloud/lawyerCommunityTypes';

/** واجهة توافق — موصولة مباشرة بمخزن المجتمع المحلي. */
export const CommunityDB = CommunityRuntimeDB;

// NotificationDB: استورد من notificationForumStorage مباشرة — لا إعادة تصدير هنا (دورة SAC↔store)
export { LawyerStorage };

// --- FORUM STATS ---

export async function getForumStats(): Promise<{
    totalPosts: number;
    totalComments: number;
    totalUpvotes: number;
    totalReports: number;
    pendingReports: number;
    totalDocuments: number;
    totalBannedUsers: number;
    topTags: { tag: string; count: number }[];
}> {
    const posts = await CommunityDB.listPosts();
    const reports = await getCommunityReports();
    const banned = await CommunityBanDB.listBannedUsers();
    const docs = await RepositoryDB.listDocuments();

    const tagCount = new Map<string, number>();
    for (const p of posts) {
        for (const t of p.tags) {
            tagCount.set(t, (tagCount.get(t) || 0) + 1);
        }
    }
    const topTags = Array.from(tagCount.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
        totalPosts: posts.length,
        totalComments: posts.reduce((sum, p) => sum + p.comments.length, 0),
        totalUpvotes: posts.reduce((sum, p) => sum + p.upvoterIds.length, 0),
        totalReports: reports.length,
        pendingReports: reports.filter((r) => r.status === 'pending').length,
        totalDocuments: docs.length,
        totalBannedUsers: banned.length,
        topTags,
    };
}

export async function deleteRepositoryDocument(
    docId: string,
    requesterId?: string,
    requesterRole?: UserRole,
): Promise<void> {
    if (requesterId) {
        const docs = await RepositoryDB.listDocuments();
        const doc = docs.find((d) => d.id === docId);
        if (!doc) throw new Error('المستند غير موجود');
        if (
            requesterId !== doc.authorId &&
            requesterRole !== UserRole.SUPER_ADMIN &&
            requesterRole !== UserRole.MODERATOR
        ) {
            throw new Error('ليس لديك صلاحية لحذف هذا المستند');
        }
    }
    await RepositoryDB.deleteDocument(docId);
}

export async function updateRepositoryDocument(
    doc: RepositoryDocument,
    requesterId?: string,
    requesterRole?: UserRole,
): Promise<void> {
    if (requesterId) {
        const docs = await RepositoryDB.listDocuments();
        const existing = docs.find((d) => d.id === doc.id);
        if (!existing) throw new Error('المستند غير موجود');
        if (
            requesterId !== existing.authorId &&
            requesterRole !== UserRole.SUPER_ADMIN &&
            requesterRole !== UserRole.MODERATOR
        ) {
            throw new Error('ليس لديك صلاحية لتعديل هذا المستند');
        }
    }
    await RepositoryDB.saveDocument(doc);
}

// ============================================================
//  SMARTER VAULT — المخزن الذكي (Smart Vault)
// ============================================================

export type { SmartVaultDocType, SmartVaultFilterTag, SmartVaultDoc } from '@/app/services/vault/vaultTypes';

export type { CalendarEventType, CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
export const CalendarDB = CalendarRuntimeDB;

export type { TransactionsThreadingState } from '@/app/services/cloud/lawyerTransactionTypes';
export const TransactionDB = TransactionsRuntimeDB;
export const TransactionsThreadingDB = TransactionsThreadingRuntimeDB;

export { UrgentActionsDB } from './urgent-actions-db';

export { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
export type {
    LawyerProfileHeader,
    ProfileStat,
    ProfileLocationMode,
    ProfileAction,
    LawyerProfileSection,
    LawyerProfileData,
    ProfileGalleryItem,
} from '@/app/services/cloud/lawyerProfileTypes';

/** واجهة توافق — dynamic import لتفادي circular chunk مع monolith */
export const ProfileDB = {
    async getProfile(userId: string) {
        const mod = await import('@/app/services/cloud/lawyerProfileCloud');
        return mod.ProfileDB.getProfile(userId);
    },
    async saveProfile(
        userId: string,
        profile: import('@/app/services/cloud/lawyerProfileTypes').LawyerProfileData,
        writerId: string,
    ) {
        const mod = await import('@/app/services/cloud/lawyerProfileCloud');
        return mod.ProfileDB.saveProfile(userId, profile, writerId);
    },
};
