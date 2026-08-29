export const DEFAULT_UPLOAD_BUCKET = 'make-f09713ba-legal-docs';
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

function decodeStoragePathFully(raw: string): string | null {
  let current = raw.trim();
  for (let i = 0; i < 4; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) return current;
      current = next;
    } catch {
      return null;
    }
  }
  return current;
}

export function isStoragePathOwnedByUser(rawPath: unknown, userId: string): boolean {
  if (typeof rawPath !== 'string' || !rawPath.trim() || !userId) return false;
  if (rawPath.includes('\\') || rawPath.includes('\0')) return false;

  const decoded = decodeStoragePathFully(rawPath);
  if (decoded == null || decoded.includes('\0') || decoded.includes('\\')) return false;

  const normalized = decoded.replace(/^\/+/, '').replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (segments.length < 2) return false;
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return false;
  return normalized.startsWith(`${userId}/`);
}

/** صورة منتدى مشفّرة عند العميل — ليست JPEG/PNG على السلك. */
export function isForumEncryptedUpload(category: string, fileName: string): boolean {
  if (category !== 'forum-media') return false;
  const name = fileName.trim().toLowerCase();
  if (!name.endsWith('.enc')) return false;
  if (name.endsWith('.svg.enc') || name.includes('.svg.')) return false;
  return true;
}

export function buildCategoryObjectPath(
  userId: string,
  category: string,
  fileName: string,
): string {
  const cleanName = sanitizeUploadFileName(fileName);
  return `${userId}/${category}/${Date.now()}_${cleanName}`;
}
