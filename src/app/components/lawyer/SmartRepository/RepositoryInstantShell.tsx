import React from 'react';
import { createPortal } from 'react-dom';
import { HomeChevronLeftIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    REPO_ADD_MENU_BTN,
    REPO_CUSTOM_CAT_CHIP,
    REPO_CUSTOM_CAT_CHIP_ACTIVE,
    REPO_FILTER_RAIL,
    REPO_HEADER,
    REPO_ICON_BTN,
    REPO_OVERLAY,
    REPO_PANEL,
    REPO_ROOM_CHIP,
} from './smartRepositoryTheme';
import './repositoryChrome.css';

type RepositoryInstantShellProps = {
    onClose: () => void;
};

const BOOT_FILTERS = ['الكل', 'بطاقة', 'مسح', 'صورة', 'PDF', 'تسجيل'] as const;

/**
 * قشرة أوامر حقيقية أثناء تحميل chunk المودال.
 * البحث + إضافة + شريط الفلاتر فورية؛ التغذية هادئة حتى وصول المحتوى.
 */
export function RepositoryInstantShell({ onClose }: RepositoryInstantShellProps): React.ReactElement | null {
    useBodyScrollLock(true);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            className={`${REPO_OVERLAY} hami-repository-overlay-layer hami-repository-overlay-layer--visible hami-repository-overlay-layer--snap flex flex-col`}
            dir="rtl"
            data-testid="smart-repository-instant-shell"
            data-repository-instant-shell="1"
            role="dialog"
            aria-modal="true"
            aria-label="المستودع الذكي"
            aria-busy="true"
        >
            <div className={`${REPO_PANEL} flex flex-col`}>
                <div className="pointer-events-none absolute inset-0 hami-repository-ambient" aria-hidden />
                <div className={REPO_HEADER}>
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            data-testid="smart-repository-close"
                            className={REPO_ICON_BTN}
                            aria-label="إغلاق"
                        >
                            <HomeChevronLeftIcon size={18} />
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="font-bold text-lg text-[#F4F0E8] truncate">المستودع الذكي</h2>
                        </div>
                    </div>
                </div>

                <div className="hami-repository-controls shrink-0 relative z-[1]">
                    <div className="px-5 pt-3 pb-1 flex items-center gap-2" dir="rtl" aria-hidden>
                        <div className="flex-1 min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04]" />
                        <span className={`${REPO_ADD_MENU_BTN} opacity-70 pointer-events-none`}>+ إضافة</span>
                    </div>
                    <div className={REPO_FILTER_RAIL} aria-hidden>
                        <span className={`${REPO_ROOM_CHIP} opacity-70`}>العام ▾</span>
                        {BOOT_FILTERS.map((label, i) => (
                            <span
                                key={label}
                                className={`${i === 0 ? REPO_CUSTOM_CAT_CHIP_ACTIVE : REPO_CUSTOM_CAT_CHIP} px-3 inline-flex items-center`}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden px-5 py-4 space-y-3" aria-hidden>
                    <div className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
                    <div className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
                    <div className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
                </div>

                <span className="sr-only">جاري تجهيز المستودع الذكي</span>
            </div>
        </div>,
        document.body,
    );
}
