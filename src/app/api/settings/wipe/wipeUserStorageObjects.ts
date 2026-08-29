import type { SupabaseClient } from '@supabase/supabase-js';
import {
    FORUM_MEDIA_BUCKET,
    resolveUploadBucket,
} from '@/app/api/upload/uploadStorageUtils';

const PAGE_SIZE = 1_000;
const REMOVE_BATCH_SIZE = 100;

const DEFAULT_BUCKET_CATEGORIES = ['scans', 'audio', 'drafts', 'repository', 'vault'] as const;
// Direct encrypted forum uploads use /images; BFF fallback uploads use /forum-media.
const FORUM_BUCKET_CATEGORIES = ['images', 'forum-media'] as const;

function isMissingBucketError(error: { message?: string; statusCode?: string | number } | null): boolean {
    if (!error) return false;
    const status = Number(error.statusCode);
    const message = String(error.message ?? '').toLowerCase();
        return (
            status === 404 ||
            message.includes('bucket not found') ||
            message.includes('bucket does not exist')
        );
}

async function listCategoryPaths(
    admin: SupabaseClient,
    bucket: string,
    userId: string,
    category: string,
): Promise<string[]> {
    const prefix = `${userId}/${category}`;
    const paths: string[] = [];
    let offset = 0;

    while (true) {
        const { data, error } = await admin.storage.from(bucket).list(prefix, {
            limit: PAGE_SIZE,
            offset,
            sortBy: { column: 'name', order: 'asc' },
        });
        if (error) {
            if (isMissingBucketError(error)) return [];
            throw new Error(`storage_list_failed:${bucket}:${category}:${error.message}`);
        }

        const page = (data ?? [])
            .filter(
                (entry: { id: string | null; name: string }) =>
                    Boolean(entry.id) && typeof entry.name === 'string' && entry.name.length > 0,
            )
            .map((entry: { name: string }) => `${prefix}/${entry.name}`);
        paths.push(...page);

        if ((data?.length ?? 0) < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return paths;
}

async function removePaths(
    admin: SupabaseClient,
    bucket: string,
    paths: string[],
): Promise<number> {
    let removed = 0;
    for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
        const batch = paths.slice(i, i + REMOVE_BATCH_SIZE);
        const { data, error } = await admin.storage.from(bucket).remove(batch);
        if (error) {
            throw new Error(`storage_remove_failed:${bucket}:${error.message}`);
        }
        removed += data?.length ?? batch.length;
    }
    return removed;
}

export async function wipeUserStorageObjects(
    admin: SupabaseClient,
    userId: string,
): Promise<{ deleted: number; buckets: Record<string, number> }> {
    const targets = [
        { bucket: resolveUploadBucket(), categories: DEFAULT_BUCKET_CATEGORIES },
        { bucket: FORUM_MEDIA_BUCKET, categories: FORUM_BUCKET_CATEGORIES },
    ] as const;

    const bucketCounts: Record<string, number> = {};
    for (const target of targets) {
        const allPaths = (
            await Promise.all(
                target.categories.map((category) =>
                    listCategoryPaths(admin, target.bucket, userId, category),
                ),
            )
        ).flat();
        const uniquePaths = [...new Set(allPaths)];
        bucketCounts[target.bucket] =
            (bucketCounts[target.bucket] ?? 0) +
            (await removePaths(admin, target.bucket, uniquePaths));
    }

    return {
        deleted: Object.values(bucketCounts).reduce((sum, count) => sum + count, 0),
        buckets: bucketCounts,
    };
}
