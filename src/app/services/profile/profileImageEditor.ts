/** نسبة إطار خلفية لوحة الكتابة في الملف المهني */
export const PROFILE_CANVAS_BACKGROUND_ASPECT = 16 / 9;

/** أقصى حافة للتصدير — بدون تقليل إلا إذا تجاوزت المصدر */
export const PROFILE_CANVAS_EXPORT_MAX_EDGE = 3840;

export const PROFILE_CANVAS_EXPORT_JPEG_QUALITY = 0.96;

export type ProfileBackgroundEditState = {
    /** 1 = أقل تكبير يغطي الإطار بالكامل */
    scale: number;
    /** -1..1 أفقي */
    panX: number;
    /** -1..1 عمودي */
    panY: number;
};

export function defaultProfileBackgroundEditState(): ProfileBackgroundEditState {
    return { scale: 1, panX: 0, panY: 0 };
}

export function clampProfileBackgroundEditState(
    state: ProfileBackgroundEditState,
): ProfileBackgroundEditState {
    return {
        scale: Math.min(4, Math.max(1, state.scale)),
        panX: Math.min(1, Math.max(-1, state.panX)),
        panY: Math.min(1, Math.max(-1, state.panY)),
    };
}

export type ProfileBackgroundCropRect = {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
};

/** يحسب مستطيل الاقتصاص في إحداثيات الصورة الأصلية */
export function computeProfileBackgroundCropRect(
    srcW: number,
    srcH: number,
    state: ProfileBackgroundEditState,
    aspect = PROFILE_CANVAS_BACKGROUND_ASPECT,
): ProfileBackgroundCropRect {
    const safe = clampProfileBackgroundEditState(state);
    const srcAspect = srcW / srcH;

    let baseW: number;
    let baseH: number;
    if (srcAspect > aspect) {
        baseH = srcH;
        baseW = baseH * aspect;
    } else {
        baseW = srcW;
        baseH = baseW / aspect;
    }

    const zoom = safe.scale;
    const sw = baseW / zoom;
    const sh = baseH / zoom;
    const maxPanX = Math.max(0, (srcW - sw) / 2);
    const maxPanY = Math.max(0, (srcH - sh) / 2);
    const cx = srcW / 2 + safe.panX * maxPanX;
    const cy = srcH / 2 + safe.panY * maxPanY;

    let sx = cx - sw / 2;
    let sy = cy - sh / 2;
    sx = Math.max(0, Math.min(srcW - sw, sx));
    sy = Math.max(0, Math.min(srcH - sh, sy));

    return { sx, sy, sw, sh };
}

export async function loadProfileImageBitmap(file: File): Promise<ImageBitmap> {
    if (typeof createImageBitmap === 'function') {
        return createImageBitmap(file, { imageOrientation: 'from-image' });
    }
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('image load failed'));
            img.src = objectUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas unavailable');
        ctx.drawImage(image, 0, 0);
        return createImageBitmap(canvas);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export type ExportProfileBackgroundOptions = {
    aspect?: number;
    maxEdge?: number;
    quality?: number;
    preferPng?: boolean;
};

/** يصدّر الصورة المحرَّرة بأعلى دقة ممكنة ضمن الحد الآمن */
export async function exportProfileBackgroundImage(
    bitmap: ImageBitmap,
    state: ProfileBackgroundEditState,
    sourceName: string,
    opts?: ExportProfileBackgroundOptions,
): Promise<File> {
    const aspect = opts?.aspect ?? PROFILE_CANVAS_BACKGROUND_ASPECT;
    const maxEdge = opts?.maxEdge ?? PROFILE_CANVAS_EXPORT_MAX_EDGE;
    const quality = opts?.quality ?? PROFILE_CANVAS_EXPORT_JPEG_QUALITY;
    const preferPng = opts?.preferPng ?? false;

    const { sx, sy, sw, sh } = computeProfileBackgroundCropRect(
        bitmap.width,
        bitmap.height,
        state,
        aspect,
    );

    const longest = Math.max(sw, sh);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const outW = Math.max(1, Math.round(sw * scale));
    const outH = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);

    const usePng = preferPng;
    const mime = usePng ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), mime, usePng ? undefined : quality);
    });
    if (!blob) throw new Error('export failed');

    const base = sourceName.replace(/\.[^.]+$/, '') || 'profile-bg';
    const ext = usePng ? 'png' : 'jpg';
    return new File([blob], `${base}-edited.${ext}`, { type: mime });
}
