import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { getForumOverlayPortalRoot } from '../forumOverlayPortal';
import { FORUM_ICON_BTN } from '../forumPlumTheme';
import { useUploadDocumentModalForm } from '../hooks/useUploadDocumentModalForm';
import { UploadDocumentModalFields } from './UploadDocumentModalFields';

interface UploadDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        title: string;
        type: string;
        description: string;
        file: File | null;
        tags: string[];
    }) => Promise<void>;
    authorName?: string;
    isSubmitting: boolean;
    editDoc?: RepositoryDocument | null;
}

export const UploadDocumentModal = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    editDoc,
}: UploadDocumentModalProps) => {
    const form = useUploadDocumentModalForm({ isOpen, editDoc, onSubmit });

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[120] bg-black/70 pointer-events-auto"
                onClick={onClose}
                aria-hidden
            />
            <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
                <div
                    className="w-full max-w-[min(32rem,100%)] max-h-[min(92dvh,100%)] overflow-y-auto hami-forum-modal-glass rounded-2xl pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                >
                    <form onSubmit={(e) => void form.handleSubmit(e)}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <h3 className="text-white font-bold text-base">
                                {editDoc ? 'تعديل المستند' : 'رفع مستند جديد'}
                            </h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className={FORUM_ICON_BTN}
                                aria-label="إغلاق"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <UploadDocumentModalFields form={form} isEditing={Boolean(editDoc)} />

                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm text-white/50 hover:text-white transition-colors touch-manipulation"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#E6C673] hover:bg-[#d4b560] disabled:bg-[#E6C673]/50 disabled:cursor-not-allowed text-black text-sm font-bold transition-colors flex items-center gap-2 touch-manipulation"
                            >
                                {isSubmitting ? (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : null}
                                {editDoc ? 'حفظ التعديلات' : form.uploadKind === 'image' ? 'رفع الصورة' : 'رفع الملف'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>,
        getForumOverlayPortalRoot(),
    );
};
