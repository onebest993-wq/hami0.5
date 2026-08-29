export function validateWallpaperFile(file: File): string | null {
    const mime = String(file.type || '').toLowerCase();
    const name = String(file.name || '').toLowerCase();
    const looksLikeImage =
        mime.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(name);
    if (!looksLikeImage) return 'يرجى اختيار ملف صورة (JPG / PNG / WebP)';
    if (file.size > 8_000_000) return 'الصورة كبيرة جداً — الحد 8 ميغابايت';
    return null;
}
