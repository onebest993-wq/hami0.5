import { supabase } from '@/app/lib/supabase-client';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { stripImageMetadata } from '@/app/utils/stripMetadata';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';

const WORK_LOCAL_UPLOAD_CATEGORIES = new Set(['vault', 'scans']);

export const LawyerStorage = {
    /**
     * Uploads a file via WIFE-protected /api/upload (malware scan + ownership on server).
     */
    async uploadSmartFile(
        userId: string,
        file: File,
        category: 'scans' | 'audio' | 'drafts' | 'repository' | 'vault' | 'forum-media',
    ) {
        const sessionUserId = (await supabase.auth.getSession()).data.session?.user?.id ?? null;
        if (!sessionUserId || sessionUserId !== userId) {
            throw new Error('Unauthorized upload: session user mismatch');
        }
        if (WORK_LOCAL_UPLOAD_CATEGORIES.has(category) && !isLawyerWorkCloudLive()) {
            throw new Error('work_cloud_upload_disabled');
        }

        const looksLikeImage =
            file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
        let uploadFile = file;
        if (looksLikeImage) {
            try {
                uploadFile = await stripImageMetadata(file);
            } catch {
                uploadFile = file;
            }
        }

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('category', category);

        const response = await SecureAPIClient.fetchSecureResponse('/api/upload', {
            method: 'POST',
            body: formData,
        });
        const text = await response.text().catch(() => '');
        let body: Record<string, unknown> = {};
        try {
            body = JSON.parse(text) as Record<string, unknown>;
        } catch {
            /* ignore */
        }
        if (!response.ok) {
            const message =
                typeof body.error === 'string' && body.error.trim()
                    ? body.error.trim()
                    : `Upload failed (${response.status})`;
            throw new Error(message);
        }

        const path = typeof body.path === 'string' ? body.path : '';
        const downloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl : null;
        const bucket = typeof body.bucket === 'string' ? body.bucket : undefined;
        if (!path) {
            throw new Error('Upload response missing path');
        }

        return {
            path,
            fullPath: path,
            downloadUrl,
            bucket,
        };
    },

    async getSignedUrl(path: string): Promise<string | null> {
        const category = path.replace(/^\/+/, '').split('/')[1] ?? '';
        if (WORK_LOCAL_UPLOAD_CATEGORIES.has(category) && !isLawyerWorkCloudLive()) {
            return null;
        }
        try {
            const res = await SecureAPIClient.fetchSecure<{ ok: boolean; downloadUrl?: string }>(
                '/api/upload/signed-url',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path }),
                },
            );
            return res?.downloadUrl?.trim() || null;
        } catch {
            return null;
        }
    },
};
