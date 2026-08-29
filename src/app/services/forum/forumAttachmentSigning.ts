import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { FORUM_MEDIA_BUCKET, SIGNED_URL_TTL_SEC, resolveUploadBucket } from '@/app/api/upload/uploadStorageUtils';
import { isCloudForumStoragePath } from '@/app/services/forum/forumPostCreateGuard';
import { loadForumSupabaseAdmin } from '@/app/services/forum/loadForumSupabaseAdmin';

function resolveAttachmentBucket(attachment: NonNullable<CommunityPost['attachment']>): string {
    if (attachment.bucket === FORUM_MEDIA_BUCKET || attachment.encrypted === true) {
        return FORUM_MEDIA_BUCKET;
    }
    if (attachment.bucket?.trim()) return attachment.bucket.trim();
    if (attachment.type === 'image') return FORUM_MEDIA_BUCKET;
    return resolveUploadBucket();
}

/** يوقع روابط المرفقات للمشاهدين — لا يُخزَّن الرابط الموقّع في Postgres. */
export async function signForumPostAttachments(posts: CommunityPost[]): Promise<CommunityPost[]> {
    const admin = await loadForumSupabaseAdmin();
    if (!admin) return posts;

    return Promise.all(
        posts.map(async (post) => {
            const attachment = post.attachment;
            if (!attachment || !isCloudForumStoragePath(attachment.storagePath)) return post;
            const { data } = await admin.storage
                .from(resolveAttachmentBucket(attachment))
                .createSignedUrl(attachment.storagePath!, SIGNED_URL_TTL_SEC);
            if (!data?.signedUrl) return post;
            return {
                ...post,
                attachment: {
                    ...attachment,
                    url: data.signedUrl,
                },
            };
        }),
    );
}
