import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const lawyerCloudPath = path.join(root, 'src/app/services/lawyer-cloud.ts');

const src = fs.readFileSync(lawyerCloudPath, 'utf8');
const lines = src.split('\n');

/** Remove lines 159-1183 (community block before FORUM STATS) */
const before = lines.slice(0, 158);
const after = lines.slice(1183);

const bridge = `
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

export {
    mergeCommunityPostsById,
    sortCommunityPosts,
    filterDeletedCommunityPosts,
    markCommunityPostDeleted,
    getDeletedCommunityPostIds,
    ForumBookmarkDB,
    getCommunityPosts,
    getCommunityPostsPaginated,
    getCommunityPostById,
    addCommunityPost,
    addCommunityComment,
    deleteCommunityComment,
    editCommunityComment,
    deleteCommunityPost,
    updateCommunityPost,
    toggleLockCommunityPost,
    togglePinCommunityPost,
    reportCommunityPost,
    getCommunityReports,
    dismissCommunityReport,
    BanDB,
    FollowDB,
    getUserPostCount,
    notifyFollowers,
} from '@/app/services/cloud/lawyerCommunityCloud';

/** واجهة توافق — dynamic import لتفادي circular chunk مع monolith */
export const CommunityDB = {
    async listPosts() {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.listPosts();
    },
    async savePost(post: import('@/app/services/cloud/lawyerCommunityTypes').CommunityPost) {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.savePost(post);
    },
    async persistPostsBatch(posts: import('@/app/services/cloud/lawyerCommunityTypes').CommunityPost[]) {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.persistPostsBatch(posts);
    },
    async deletePost(postId: string) {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.deletePost(postId);
    },
    async saveReport(report: import('@/app/services/cloud/lawyerCommunityTypes').CommunityReport) {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.saveReport(report);
    },
};

`;

const next = [...before, bridge.trim(), ...after].join('\n');
fs.writeFileSync(lawyerCloudPath, next, 'utf8');
console.log('Patched lawyer-cloud.ts');
