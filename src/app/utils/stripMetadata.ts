const STRIP_TIMEOUT = 15_000;
const MAX_DIMENSION = 4096;

export async function stripImageMetadata(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return await new Promise<File>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Image processing timed out'));
        }, STRIP_TIMEOUT);

        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        const cleanup = () => {
            clearTimeout(timeoutId);
            URL.revokeObjectURL(objectUrl);
        };

        image.onload = () => {
            try {
                let w = image.naturalWidth || image.width;
                let h = image.naturalHeight || image.height;
                if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
                    const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;

                const context = canvas.getContext('2d');
                if (!context) {
                    cleanup();
                    reject(new Error('Failed to initialize canvas context.'));
                    return;
                }

                context.drawImage(image, 0, 0, w, h);

                const preferredType = file.type || 'image/jpeg';
                const quality = preferredType === 'image/png' ? undefined : 0.9;

                canvas.toBlob(
                    (blob) => {
                        cleanup();
                        if (!blob) {
                            reject(new Error('Failed to export sanitized image.'));
                            return;
                        }

                        const cleanedFile = new File([blob], file.name, {
                            type: blob.type || preferredType,
                            lastModified: Date.now(),
                        });
                        resolve(cleanedFile);
                    },
                    preferredType,
                    quality,
                );
            } catch (error) {
                cleanup();
                reject(error instanceof Error ? error : new Error('Unknown image processing error.'));
            }
        };

        image.onerror = () => {
            cleanup();
            reject(new Error('Failed to load image for metadata stripping.'));
        };

        image.src = objectUrl;
    });
}

export const stripMetadata = stripImageMetadata;
