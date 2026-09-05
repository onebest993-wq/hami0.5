import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    FORUM_ICON_BTN,
    FORUM_LAYER,
    FORUM_MODAL,
    FORUM_PANEL,
    FORUM_REPO_SEARCH_BAR,
    FORUM_SEARCH_HEADER,
    FORUM_SEARCH_SHELL,
    FORUM_SHEET,
    FORUM_TEXT_PRIMARY,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { getForumOverlayPortalRoot } from '@/app/components/lawyer/CommunityScreen/forumOverlayPortal';

const BONE = 'rounded-xl border border-white/[0.08] bg-white/[0.035]';
const SWIPE = 'mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20';

type CoverClose = { onClose: () => void };

function portalLayer(layer: ReactNode): ReactElement {
    if (typeof document === 'undefined') return <>{layer}</>;
    return createPortal(layer, getForumOverlayPortalRoot());
}

function Backdrop({ zClass, dim, onClose }: { zClass: string; dim: string; onClose: () => void }) {
    return (
        <button
            type="button"
            className={`fixed inset-0 ${zClass} ${dim}`}
            aria-label="إغلاق"
            onClick={onClose}
        />
    );
}

/** ورقة طرح استشارة — نفس طبقة الزجاج الحي، بلا motion. */
export function ForumPublishSheetInstantCover({ onClose }: CoverClose) {
    return (
        <div role="dialog" aria-modal="true" aria-busy="true" aria-label="طرح استشارة">
            <Backdrop zClass="z-[70]" dim="bg-black/70" onClose={onClose} />
            <div
                data-testid="forum-add-question-sheet"
                className={`fixed bottom-0 left-0 right-0 z-[70] ${FORUM_PANEL} rounded-t-2xl px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/[0.1]`}
            >
                <div className={SWIPE} aria-hidden />
                <div className={`min-h-[44px] ${BONE}`} aria-hidden />
                <div className={`mt-3 min-h-[72px] ${BONE}`} aria-hidden />
                <div className={`mt-3 min-h-[44px] ${BONE}`} aria-hidden />
            </div>
        </div>
    );
}

/** ورقة التعليقات — بوابة طبقة المنتدى كالحية. */
export function ForumCommentSheetInstantCover({ onClose }: CoverClose) {
    return portalLayer(
        <div
            className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center pointer-events-none"
            data-testid="forum-comment-sheet"
            role="dialog"
            aria-modal="true"
            aria-busy="true"
            aria-label="التعليقات"
        >
            <button
                type="button"
                className="absolute inset-0 bg-black/55 pointer-events-auto"
                aria-label="إغلاق"
                onClick={onClose}
            />
            <div
                className={`${FORUM_SHEET} w-full max-w-2xl max-h-[min(78dvh,100%)] h-[70vh] flex flex-col pointer-events-auto relative z-10 border-t-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]`}
            >
                <div className={SWIPE} aria-hidden />
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.08]">
                    <p className={`${FORUM_TEXT_PRIMARY} font-bold text-lg`}>التعليقات</p>
                    <button type="button" className={FORUM_ICON_BTN} aria-label="إغلاق" onClick={onClose} />
                </div>
                <div className="space-y-3 overflow-hidden px-4 py-3" aria-hidden>
                    <div className={`min-h-[44px] ${BONE}`} />
                    <div className={`min-h-[72px] ${BONE}`} />
                    <div className={`min-h-[44px] ${BONE}`} />
                </div>
            </div>
        </div>,
    );
}

/** إنشاء مجموعة — نفس الورقة السفلية الحية. */
export function ForumCreateGroupSheetInstantCover({ onClose }: CoverClose) {
    return portalLayer(
        <>
            <Backdrop zClass="z-[120]" dim="bg-black/70 pointer-events-auto" onClose={onClose} />
            <div
                className={`fixed bottom-0 left-0 right-0 z-[120] pointer-events-auto ${FORUM_PANEL} rounded-t-2xl p-4 border-t border-white/[0.1] pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[min(92dvh,100%)]`}
                role="dialog"
                aria-modal="true"
                aria-busy="true"
                aria-label="إنشاء مجموعة تخصصية"
            >
                <div className={SWIPE} aria-hidden />
                <p className={`${FORUM_TEXT_PRIMARY} text-lg font-bold mb-5`}>إنشاء مجموعة تخصصية</p>
                <div className={`min-h-[44px] ${BONE}`} aria-hidden />
                <div className={`mt-3 min-h-[72px] ${BONE}`} aria-hidden />
                <div className={`mt-3 min-h-[44px] ${BONE}`} aria-hidden />
            </div>
        </>,
    );
}

/** تعديل منشور — زجاج المودال الحي. */
export function ForumEditPostModalInstantCover({ onClose }: CoverClose) {
    return (
        <>
            <Backdrop zClass="z-[120]" dim="bg-black/70" onClose={onClose} />
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
                <div
                    data-testid="forum-edit-post-modal"
                    className={`w-full max-w-xl ${FORUM_MODAL} p-4 pointer-events-auto`}
                    role="dialog"
                    aria-modal="true"
                    aria-busy="true"
                    aria-label="تعديل المنشور"
                >
                    <div className="flex items-center justify-between mb-4">
                        <p className={`${FORUM_TEXT_PRIMARY} font-bold text-lg`}>تعديل المنشور</p>
                        <button type="button" className={FORUM_ICON_BTN} aria-label="إغلاق التعديل" onClick={onClose} />
                    </div>
                    <div className={`min-h-[72px] ${BONE}`} aria-hidden />
                    <div className={`mt-3 min-h-[44px] ${BONE}`} aria-hidden />
                </div>
            </div>
        </>
    );
}

/** بحث المنتدى — صدفة البحث الحية. */
export function ForumSearchOverlayInstantCover({ onClose }: CoverClose) {
    return (
        <div
            data-testid="forum-search-overlay"
            className={`${FORUM_LAYER} z-[98] ${FORUM_SEARCH_SHELL}`}
            data-forum-silk="1"
            role="dialog"
            aria-modal="true"
            aria-busy="true"
            aria-label="بحث المنتدى"
            dir="rtl"
        >
            <div className={FORUM_SEARCH_HEADER}>
                <button type="button" onClick={onClose} aria-label="إغلاق البحث" className={`${FORUM_ICON_BTN} shrink-0`} />
                <div className={`flex-1 min-w-0 ${FORUM_REPO_SEARCH_BAR}`} aria-hidden />
            </div>
            <div className="space-y-3 px-4 py-3" aria-hidden>
                <div className={`min-h-[44px] ${BONE}`} />
                <div className={`min-h-[72px] ${BONE}`} />
                <div className={`min-h-[44px] ${BONE}`} />
            </div>
        </div>
    );
}

/** عظام داخل صدفة ملف الزميل — بلا سبينر. */
export function ForumProfileOverlayBodySlots({ onClose }: CoverClose) {
    return (
        <div className="h-full min-h-[100dvh] bg-[#0A0F1C]" aria-busy="true">
            <div className="flex items-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
                <button type="button" className={FORUM_ICON_BTN} aria-label="رجوع" onClick={onClose} />
                <div className="h-5 w-32 rounded-md border border-white/[0.09] bg-white/[0.035]" aria-hidden />
            </div>
            <div className="space-y-3 px-4" aria-hidden>
                <div className={`min-h-[72px] ${BONE}`} />
                <div className={`min-h-[44px] ${BONE}`} />
                <div className={`min-h-[44px] ${BONE}`} />
            </div>
        </div>
    );
}

/** ملف زميل من المنتدى — طبقة كاملة بلا سبينر الملف. */
export function ForumProfileOverlayInstantCover({ onClose }: CoverClose) {
    return (
        <div
            className="fixed inset-0 z-[200]"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-busy="true"
            aria-label="ملف مهني"
            data-testid="forum-member-profile"
        >
            <ForumProfileOverlayBodySlots onClose={onClose} />
        </div>
    );
}

/** رفع/معاينة/حذف المستودع — زجاج المودال الحي. */
export function ForumRepositoryModalInstantCover({
    onClose,
    label,
    testId,
}: CoverClose & { label: string; testId?: string }) {
    return portalLayer(
        <>
            <Backdrop zClass="z-[120]" dim="bg-black/70 pointer-events-auto" onClose={onClose} />
            <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
                <div
                    data-testid={testId}
                    className={`w-full max-w-[min(32rem,100%)] ${FORUM_MODAL} p-4 pointer-events-auto`}
                    role="dialog"
                    aria-modal="true"
                    aria-busy="true"
                    aria-label={label}
                >
                    <div className="flex items-center justify-between mb-4">
                        <p className={`${FORUM_TEXT_PRIMARY} font-bold text-base`}>{label}</p>
                        <button type="button" className={FORUM_ICON_BTN} aria-label="إغلاق" onClick={onClose} />
                    </div>
                    <div className={`min-h-[44px] ${BONE}`} aria-hidden />
                    <div className={`mt-3 min-h-[72px] ${BONE}`} aria-hidden />
                    <div className={`mt-3 min-h-[44px] ${BONE}`} aria-hidden />
                </div>
            </div>
        </>,
    );
}
