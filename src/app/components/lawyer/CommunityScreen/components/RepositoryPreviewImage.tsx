import { X } from '@/app/components/ui/icons/X';
import { FileImage } from '@/app/components/ui/icons/FileImage';

type RepositoryPreviewImageProps = {
    title: string;
    signedUrl: string | null;
    isLoading: boolean;
    isOpenMode: boolean;
    onClose: () => void;
};

export function RepositoryPreviewImage({
    title,
    signedUrl,
    isLoading,
    isOpenMode,
    onClose,
}: RepositoryPreviewImageProps) {
    return (
        <>
            <div className="fixed inset-0 z-[120] bg-black/95" onClick={onClose} aria-hidden />
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] min-h-[44px] min-w-[44px] touch-manipulation rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors pointer-events-auto"
                    aria-label="إغلاق"
                >
                    <X size={22} />
                </button>
                {isLoading ? (
                    <svg
                        className="animate-spin h-8 w-8 text-white/30 pointer-events-auto"
                        viewBox="0 0 24 24"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : signedUrl ? (
                    <img
                        src={signedUrl}
                        alt={title}
                        className={`max-w-full ${isOpenMode ? 'max-h-[92vh]' : 'max-h-[min(85vh,720px)]'} w-auto h-auto object-contain pointer-events-auto select-none`}
                        onClick={(e) => e.stopPropagation()}
                        draggable={false}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-white/40 pointer-events-auto">
                        <FileImage size={40} />
                        <p className="text-sm">الصورة غير متاحة</p>
                    </div>
                )}
            </div>
        </>
    );
}
