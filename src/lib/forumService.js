export const FORUM_MEDIA_BUCKET = 'forum-media';
const SIGNED_URL_TTL_SEC = 60 * 60;
const COMMENT_POLL_MS = 4_000;

let supabasePromise = null;

async function getSupabaseClient() {
    if (!supabasePromise) {
        supabasePromise = import('./supabaseClient.js').then((mod) => mod.supabase);
    }
    return supabasePromise;
}

export function isForumMediaAttachment(attachment) {
    if (!attachment || typeof attachment !== 'object') return false;
    return attachment.bucket === FORUM_MEDIA_BUCKET || attachment.encrypted === true;
}

function sanitizeFileName(name) {
    return String(name || 'forum-image.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
}

export function buildForumMediaStoragePath(userId, fileName) {
    return `${userId}/images/${Date.now()}_${sanitizeFileName(fileName)}.enc`;
}

async function fileToBase64(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

async function base64ToObjectUrl(base64, mimeType = 'image/jpeg') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export async function encryptForumImageFile(file) {
    const { CryptoService } = await import('@/app/services/CryptoService');
    await CryptoService.initialize();
    const base64 = await fileToBase64(file);
    const encrypted = await CryptoService.encryptData(base64);
    return new Blob([encrypted], { type: 'application/octet-stream' });
}

export async function createForumMediaSignedUrl(storagePath) {
    const path = String(storagePath || '').trim();
    if (!path) return null;

    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.storage
            .from(FORUM_MEDIA_BUCKET)
            .createSignedUrl(path, SIGNED_URL_TTL_SEC);
        if (!error && data?.signedUrl) return data.signedUrl;
    } catch {
        /* fallback to BFF */
    }

    try {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        const res = await SecureAPIClient.fetchSecure(
            '/api/upload/signed-url',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, bucket: FORUM_MEDIA_BUCKET }),
            },
        );
        return res?.downloadUrl?.trim() || null;
    } catch {
        return null;
    }
}

export async function resolveEncryptedForumImageUrl(attachment) {
    const storagePath = attachment?.storagePath?.trim();
    if (!storagePath) return null;

    const signed = await createForumMediaSignedUrl(storagePath);
    if (!signed) return null;

    const res = await fetch(signed);
    if (!res.ok) return null;

    const encryptedText = await res.text();
    const { CryptoService } = await import('@/app/services/CryptoService');
    await CryptoService.initialize();
    const base64 = await CryptoService.decryptData(encryptedText);
    return base64ToObjectUrl(base64, attachment?.mimeType || 'image/jpeg');
}

export async function uploadEncryptedForumImage(userId, file) {
    const encryptedBlob = await encryptForumImageFile(file);
    const storagePath = buildForumMediaStoragePath(userId, file.name);
    const uploadName = `${Date.now()}_${sanitizeFileName(file.name)}.enc`;

    try {
        const supabase = await getSupabaseClient();
        const { error } = await supabase.storage.from(FORUM_MEDIA_BUCKET).upload(storagePath, encryptedBlob, {
            contentType: 'application/octet-stream',
            upsert: false,
        });
        if (!error) {
            return {
                type: 'image',
                name: file.name,
                mimeType: file.type || 'image/jpeg',
                storagePath,
                bucket: FORUM_MEDIA_BUCKET,
                encrypted: true,
            };
        }
    } catch {
        /* fallback to BFF */
    }

    const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
    const formData = new FormData();
    formData.append('file', new File([encryptedBlob], uploadName, { type: 'application/octet-stream' }));
    formData.append('category', 'forum-media');

    const response = await SecureAPIClient.fetchSecureResponse('/api/upload', {
        method: 'POST',
        body: formData,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message =
            typeof body.error === 'string' && body.error.trim()
                ? body.error.trim()
                : 'تعذر رفع الصورة المشفرة';
        throw new Error(message);
    }

    const path = typeof body.path === 'string' ? body.path : storagePath;
    return {
        type: 'image',
        name: file.name,
        mimeType: file.type || 'image/jpeg',
        storagePath: path,
        bucket: FORUM_MEDIA_BUCKET,
        encrypted: true,
        url: typeof body.downloadUrl === 'string' ? body.downloadUrl : undefined,
    };
}

export async function publishForumPost(post) {
    const { ForumApiService } = await import('@/app/services/forumApiService');
    return ForumApiService.createPost(post);
}

export async function publishForumComment(postId, comment) {
    const { ForumApiService } = await import('@/app/services/forumApiService');
    return ForumApiService.addComment(postId, comment);
}

export async function fetchForumPostById(postId) {
    const { ForumApiService } = await import('@/app/services/forumApiService');
    return ForumApiService.getPostById(postId);
}

/**
 * تحديث تعليقات المنشور بشكل فوري (polling خفيف عبر BFF).
 * @param {string} postId
 * @param {(comments: unknown[], post: unknown) => void} onUpdate
 */
export function subscribeToPostComments(postId, onUpdate) {
    let stopped = false;
    let timer = null;

    const poll = async () => {
        if (stopped || !postId) return;
        try {
            const post = await fetchForumPostById(postId);
            if (post?.comments) onUpdate(post.comments, post);
        } catch {
            /* صامت — المحلي يبقى مصدراً احتياطياً */
        }
        if (!stopped) {
            timer = window.setTimeout(() => {
                void poll();
            }, COMMENT_POLL_MS);
        }
    };

    void poll();

    return () => {
        stopped = true;
        if (timer != null) window.clearTimeout(timer);
    };
}
