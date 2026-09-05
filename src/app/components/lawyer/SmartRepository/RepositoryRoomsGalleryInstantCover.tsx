import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { REPO_TOUCH_ICON } from './smartRepositoryTheme';

/** غطاء Suspense لمعرض الغرف — نفس إطار الحوار الموجود، بلا نص تحميل. */
export function RepositoryRoomsGalleryInstantCover({ onClose }: { onClose: () => void }) {
    const layer = (
        <>
            <button
                type="button"
                className="fixed inset-0 z-[138] bg-[#0A0F1C]/55"
                aria-label="إغلاق معرض الغرف"
                data-testid="repository-rooms-gallery-backdrop"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-busy="true"
                aria-label="معرض الغرف المخصصة"
                data-testid="repository-rooms-gallery"
                dir="rtl"
                className="fixed z-[139] inset-x-3 top-[max(12px,env(safe-area-inset-top))] bottom-[max(12px,env(safe-area-inset-bottom))] sm:inset-auto sm:top-[12%] sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(26rem,92vw)] sm:max-h-[72dvh] sm:bottom-auto flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0A0F1C]"
            >
                <div className="flex items-start justify-between gap-2 shrink-0 border-b border-white/[0.07] px-3 pb-2 pt-2.5">
                    <h2 className="text-sm font-medium text-[#F4F4F5]">كل الغرف</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${REPO_TOUCH_ICON} rounded-full border-0 text-white/50`}
                        aria-label="إغلاق"
                    >
                        <X size={15} />
                    </button>
                </div>
                <div className="space-y-2 px-3 py-3" aria-hidden>
                    <div className="h-11 rounded-xl border border-white/10 bg-white/[0.04]" />
                    <div className="h-14 rounded-xl border border-white/10 bg-white/[0.04]" />
                    <div className="h-14 rounded-xl border border-white/10 bg-white/[0.04]" />
                </div>
            </div>
        </>
    );

    if (typeof document === 'undefined') return layer;
    return createPortal(layer, document.body);
}
