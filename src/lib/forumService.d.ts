import type {
    CommunityAttachment,
    CommunityComment,
    CommunityPost,
} from '@/app/services/cloud/lawyerCommunityTypes';

export const FORUM_MEDIA_BUCKET: string;
export function isForumMediaAttachment(attachment: unknown): boolean;
export function buildForumMediaStoragePath(userId: string, fileName: string): string;
export function encryptForumImageFile(file: File): Promise<Blob>;
export function createForumMediaSignedUrl(storagePath: string): Promise<string | null>;
export function resolveEncryptedForumImageUrl(
    attachment: Pick<CommunityAttachment, 'storagePath' | 'mimeType'> | null | undefined,
): Promise<string | null>;
export function uploadEncryptedForumImage(
    userId: string,
    file: File,
): Promise<CommunityAttachment>;
export function publishForumPost(post: CommunityPost): Promise<CommunityPost>;
export function publishForumComment(
    postId: string,
    comment: CommunityComment,
): Promise<CommunityPost>;
export function fetchForumPostById(postId: string): Promise<CommunityPost | null | undefined>;
export function subscribeToPostComments(
    postId: string,
    onUpdate: (comments: unknown[], post: unknown) => void,
): () => void;
