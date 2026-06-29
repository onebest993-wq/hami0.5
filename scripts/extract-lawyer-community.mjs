import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const lawyerCloudPath = path.join(root, 'src/app/services/lawyer-cloud.ts');
const outPath = path.join(root, 'src/app/services/cloud/lawyerCommunityCloud.ts');

const src = fs.readFileSync(lawyerCloudPath, 'utf8');
const lines = src.split('\n');

/** 1-based inclusive: persistence + CommunityDB through notifyFollowers */
const startLine = 237;
const endLine = 1183;
const body = lines.slice(startLine - 1, endLine).join('\n');

const header = `import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { UserRole } from '@/app/types/admin-types';
import SecureStoreService from '@/app/services/SecureStoreService';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { lawyerCloudKv as kv, uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
import { isVaultIdbStoragePath } from '@/app/services/vaultBlobStore';
import { compareCommunityPostsForFeed } from '@/app/services/forum/forumUrgentConsultation';
import type {
    BanRecord,
    CommunityAttachment,
    CommunityComment,
    CommunityPost,
    CommunityReport,
    FollowRecord,
    ForumEditHistoryEntry,
    ForumNotification,
    NotificationType,
} from '@/app/services/cloud/lawyerCommunityTypes';

export type {
    BanRecord,
    CommunityAttachment,
    CommunityComment,
    CommunityPost,
    CommunityReport,
    FollowRecord,
    ForumEditHistoryEntry,
    ForumNotification,
    NotificationType,
} from '@/app/services/cloud/lawyerCommunityTypes';

function isRemoteStorageObjectPath(path: string): boolean {
    const p = path.trim();
    if (!p) return false;
    if (p.startsWith('idb:') || p.startsWith('local:')) return false;
    if (isVaultIdbStoragePath(p)) return false;
    return true;
}

async function removeStoragePathsBestEffort(paths: string[]): Promise<void> {
    const toRemove = [...new Set(paths.map((p) => p.trim()).filter(isRemoteStorageObjectPath))];
    if (toRemove.length === 0) return;
    try {
        await SecureAPIClient.fetchSecure('/api/upload/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: toRemove }),
        });
    } catch {
        console.warn('[LawyerStorage] فشل حذف ملف(ات) من المخزن:', toRemove.join(', '));
    }
}

`;

fs.writeFileSync(outPath, header + body + '\n', 'utf8');
console.log('Wrote', outPath);
