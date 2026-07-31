import type { ProfileGalleryItem } from '@/app/services/cloud/lawyerProfileTypes';
import {
    sanitizeProfileMediaUrl,
    sanitizeProfileStoragePath,
} from '@/app/services/profile/profileUrlSanitize';

const PLACEHOLDER_HOST_FRAGMENTS = ['images.unsplash.com', 'picsum.photos', 'placeholder.com', 'via.placeholder'];

function isPlaceholderImageUrl(url: string): boolean {
    if (url.startsWith('data:image/')) return false;
    const lower = url.toLowerCase();
    return PLACEHOLDER_HOST_FRAGMENTS.some((h) => lower.includes(h));
}

function clampFocus(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function clampZoom(value: number) {
    return Math.max(50, Math.min(400, Math.round(value)));
}

/** يطبّع عنصر معرض — متوافق مع URL نصي أو كائن focus/zoom */
export function normalizeProfileGalleryItem(raw: unknown): ProfileGalleryItem | null {
    if (typeof raw === 'string') {
        const url = sanitizeProfileMediaUrl(raw.trim());
        if (!url || isPlaceholderImageUrl(url)) return null;
        return { url, focusX: 50, focusY: 50, zoom: 100 };
    }
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const rawUrl =
        typeof record.url === 'string'
            ? record.url.trim()
            : typeof record.src === 'string'
              ? record.src.trim()
              : '';
    const url = sanitizeProfileMediaUrl(rawUrl);
    const storagePath = sanitizeProfileStoragePath(
        typeof record.storagePath === 'string' ? record.storagePath : undefined,
    );
    /* مسار صالح يكفي — الرابط يُعاد بناؤه لاحقاً عبر resolve/resign */
    if (storagePath) {
        return {
            url: url && !isPlaceholderImageUrl(url) ? url : '',
            focusX: typeof record.focusX === 'number' ? clampFocus(record.focusX) : 50,
            focusY: typeof record.focusY === 'number' ? clampFocus(record.focusY) : 50,
            zoom: typeof record.zoom === 'number' ? clampZoom(record.zoom) : 100,
            storagePath,
        };
    }
    if (!url || isPlaceholderImageUrl(url)) return null;
    return {
        url,
        focusX: typeof record.focusX === 'number' ? clampFocus(record.focusX) : 50,
        focusY: typeof record.focusY === 'number' ? clampFocus(record.focusY) : 50,
        zoom: typeof record.zoom === 'number' ? clampZoom(record.zoom) : 100,
    };
}

export function coerceGalleryItems(raw: unknown): ProfileGalleryItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((entry) => normalizeProfileGalleryItem(entry))
        .filter((entry): entry is ProfileGalleryItem => entry !== null);
}
