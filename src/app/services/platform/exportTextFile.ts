import { whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

export type ExportTextFileResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

function isAbortError(err: unknown): boolean {
    return err instanceof Error && err.name === 'AbortError';
}

async function tryWebShareFile(filename: string, content: string, mimeType: string): Promise<ExportTextFileResult | null> {
    if (typeof navigator === 'undefined' || typeof File === 'undefined') return null;
    const file = new File([content], filename, { type: mimeType });
    if (!navigator.canShare?.({ files: [file] })) return null;
    try {
        await navigator.share({ files: [file], title: filename });
        return 'shared';
    } catch (err) {
        if (isAbortError(err)) return 'cancelled';
        return null;
    }
}

async function tryCapacitorShareFile(
    filename: string,
    content: string,
    dialogTitle: string,
): Promise<ExportTextFileResult | null> {
    if (!isCapacitorNativePlatform()) return null;

    try {
        await whenNativeBridgeReady();
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isPluginAvailable('Filesystem') || !Capacitor.isPluginAvailable('Share')) {
            return null;
        }

        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const safeName = filename.replace(/[^\w.\-]+/g, '_');
        const path = `hami-export/${Date.now()}-${safeName}`;

        await Filesystem.writeFile({
            path,
            data: content,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
            recursive: true,
        });

        const { uri } = await Filesystem.getUri({
            directory: Directory.Cache,
            path,
        });

        await Share.share({
            title: filename,
            files: [uri],
            dialogTitle,
        });
        return 'shared';
    } catch (err) {
        if (isAbortError(err)) return 'cancelled';
        return null;
    }
}

function tryAnchorDownload(filename: string, content: string, mimeType: string): ExportTextFileResult {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
    return 'downloaded';
}

/**
 * تصدير ملف نصي — على الموبايل: مشاركة عبر Share/Filesystem؛ على الويب: تنزيل أو Web Share.
 */
export async function exportTextFile(options: {
    filename: string;
    content: string;
    mimeType?: string;
    dialogTitle?: string;
}): Promise<ExportTextFileResult> {
    const { filename, content, mimeType = 'application/json', dialogTitle = 'حفظ الملف' } = options;

    const webShare = await tryWebShareFile(filename, content, mimeType);
    if (webShare) return webShare;

    const nativeShare = await tryCapacitorShareFile(filename, content, dialogTitle);
    if (nativeShare) return nativeShare;

    if (typeof document === 'undefined') return 'failed';

    try {
        return tryAnchorDownload(filename, content, mimeType);
    } catch {
        return 'failed';
    }
}
