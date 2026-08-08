export const DEFAULT_UPLOAD_BUCKET = 'make-f09713ba';
export const FORUM_MEDIA_BUCKET = 'forum-media';
export const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

export const ALLOWED_UPLOAD_CATEGORIES = new Set([
  'scans',
  'audio',
  'drafts',
  'repository',
  'vault',
  'forum-media',
]);

export function resolveUploadBucket(): string {
  const fromEnv = (process.env.SUPABASE_UPLOAD_BUCKET ?? '').trim();
  return fromEnv || DEFAULT_UPLOAD_BUCKET;
}

export function resolveUploadBucketForCategory(category: string): string {
  if (category === 'forum-media') return FORUM_MEDIA_BUCKET;
  return resolveUploadBucket();
}

export function sanitizeUploadFileName(originalName: string): string {
  return originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export function isStoragePathOwnedByUser(rawPath: unknown, userId: string): boolean {
  if (typeof rawPath !== 'string' || !rawPath.trim() || !userId) return false;
  if (rawPath.includes('..') || rawPath.includes('\\')) return false;
  const normalized = rawPath.replace(/^\/+/, '').trim();
  return normalized.startsWith(`${userId}/`);
}

export function buildCategoryObjectPath(
  userId: string,
  category: string,
  fileName: string,
): string {
  const cleanName = sanitizeUploadFileName(fileName);
  return `${userId}/${category}/${Date.now()}_${cleanName}`;
}
