/**
 * UnifiedDossierCard
 * ===================
 * الحاوية الزجاجية الماسية الموحَّدة لبطاقات الأضابير (جزائية/مدنية/أحوال شخصية/معاملة).
 *
 * هدف هذا المكوّن: توحيد التصميم البصري لجميع البطاقات في `ArchivePortal`
 * مع احترام اختلاف البيانات (المتغيرات في props كما هي — لا تُغيَّر).
 *
 * هيكل البطاقة الصارم:
 *   ┌─────────────────────────────────────────────┐
 *   │  [type pill]            [pin] [status pill] │  ← Header
 *   │                                             │
 *   │  Title (court / case name)                  │  ← Body
 *   │  Subtitle (case number / year)              │
 *   │  Extra lines (parties, articles, timers)    │
 *   │                                             │
 *   │  [open btn]            [trash][archive]…    │  ← Footer
 *   └─────────────────────────────────────────────┘
 */

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { motion } from 'motion/react';

export type DossierKind = 'criminal' | 'civil' | 'personal' | 'transaction';

const DEFAULT_KIND_LABEL: Record<DossierKind, string> = {
    criminal: 'جزائية',
    civil: 'مدنية',
    personal: 'أحوال شخصية',
    transaction: 'معاملة',
};

export type UnifiedDossierFooterIcon = {
    /** معرّف داخلي للزر (key). */
    id: string;
    /** أيقونة من lucide (تُمرَّر كعنصر). */
    icon: ReactNode;
    /** نصّ aria-label + title. */
    label: string;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    /** نغمة الـ hover. */
    tone?: 'default' | 'danger' | 'success' | 'warning';
    /** data-testid اختياري. */
    testId?: string;
};

export type UnifiedDossierStatusBadge = {
    /** نصّ الحالة (يدعم emoji). */
    label: ReactNode;
    /** كلاسات Tailwind إضافية للون (bg/border/text). افتراضياً: زجاج أبيض شفّاف. */
    className?: string;
};

export type UnifiedDossierCardProps = {
    /** نوع الإضبارة — يحدّد التسمية الافتراضية للشارة العلوية اليمنى. */
    kind: DossierKind;
    /** يلغي تسمية kind الافتراضية (مثل: «إضبارة جزائية» بدل «جزائية»). */
    typeBadgeLabel?: string;

    /** شارة الحالة (المرحلة/الحالة الزمنية) — أعلى اليسار. */
    statusBadge?: UnifiedDossierStatusBadge;
    /** زر التثبيت (Pin) — يُمرَّر كـ ReactNode من المستدعي مع e.stopPropagation. */
    pinNode?: ReactNode;

    /** العنوان الرئيسي (اسم المحكمة أو عنوان الدعوى). */
    title: string;
    /** السطر الفرعي (رقم الدعوى/السنة أو سطر ثانوي). */
    subtitle?: ReactNode;
    /** أسطر إضافية في الجسم (مثل: المشتكي/المتهم أو المدعي/المدعى عليه أو المؤقتات). */
    bodyExtra?: ReactNode;
    /** ملاحظة قصيرة بلون تنبيهي (مثل: «يُحذف خلال X يوم»). */
    footerNote?: ReactNode;

    /** نقرة «فتح» — الزر الذهبي/الماسي. */
    onOpen: () => void;
    /** نصّ زر الفتح (افتراضي: «فتح الإضبارة»). */
    openLabel?: string;

    /** أزرار أيقونية في يسار الذيل (سلة المهملات، أرشيف، استرجاع…). */
    footerIcons?: UnifiedDossierFooterIcon[];

    /** عنصر يُلصَق فوق البطاقة (مثل checkbox سلة المهملات). */
    overlayBadge?: ReactNode;

    /** كلاسات إضافية للحاوية الخارجية (مثل ring للسلة، opacity للأرشيف). */
    wrapperClassName?: string;
    /** data-testid على الحاوية الخارجية. */
    testId?: string;
};

const toneToHoverClass = (tone: UnifiedDossierFooterIcon['tone']): string => {
    switch (tone) {
        case 'danger':
            return 'hover:text-rose-300';
        case 'success':
            return 'hover:text-emerald-300';
        case 'warning':
            return 'hover:text-amber-300';
        default:
            return 'hover:text-white';
    }
};

export const UnifiedDossierCard = ({
    kind,
    typeBadgeLabel,
    statusBadge,
    pinNode,
    title,
    subtitle,
    bodyExtra,
    footerNote,
    onOpen,
    openLabel = 'فتح الإضبارة',
    footerIcons,
    overlayBadge,
    wrapperClassName,
    testId,
}: UnifiedDossierCardProps) => {
    const handleOpenClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onOpen();
    };

    const handleCardClick = () => {
        onOpen();
    };

    const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen();
        }
    };

    return (
        <motion.div
            layout
            data-testid={testId}
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={`relative flex flex-col justify-between w-full p-5 rounded-2xl bg-[#ffffff05] backdrop-blur-md border border-white/10 hover:bg-[#ffffff0a] hover:border-white/20 hover:shadow-[0_0_15px_rgba(212,175,55,0.05)] transition-all duration-300 min-h-[220px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 ${wrapperClassName ?? ''}`}
            dir="rtl"
        >
            {overlayBadge}

            <div className="flex justify-between items-start w-full mb-4 gap-2">
                <span className="bg-white/5 border border-white/10 text-xs px-3 py-1 rounded-full text-gray-300 whitespace-nowrap shrink-0">
                    {typeBadgeLabel ?? DEFAULT_KIND_LABEL[kind]}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                    {pinNode}
                    {statusBadge ? (
                        <span
                            className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap truncate max-w-[12rem] ${
                                statusBadge.className ?? 'bg-white/5 border-white/10 text-gray-300'
                            }`}
                            title={typeof statusBadge.label === 'string' ? statusBadge.label : undefined}
                        >
                            {statusBadge.label}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-4 flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white truncate leading-tight">{title}</h3>
                {subtitle ? (
                    <p className="text-gray-400 text-sm truncate font-mono">{subtitle}</p>
                ) : null}
                {bodyExtra}
                {footerNote ? <div className="mt-1">{footerNote}</div> : null}
            </div>

            <div className="flex justify-between items-center w-full pt-4 border-t border-white/10 gap-2">
                <button
                    type="button"
                    onClick={handleOpenClick}
                    className="px-6 py-2 rounded-xl bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 hover:bg-[#d4af37]/20 font-medium transition-all text-sm whitespace-nowrap"
                >
                    {openLabel}
                </button>
                {footerIcons && footerIcons.length > 0 ? (
                    <div className="flex items-center gap-1">
                        {footerIcons.map((action) => (
                            <button
                                key={action.id}
                                type="button"
                                aria-label={action.label}
                                title={action.label}
                                data-testid={action.testId}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    action.onClick(event);
                                }}
                                className={`text-gray-500 transition-colors p-2 rounded-lg hover:bg-white/5 ${toneToHoverClass(action.tone)}`}
                            >
                                {action.icon}
                            </button>
                        ))}
                    </div>
                ) : (
                    <span />
                )}
            </div>
        </motion.div>
    );
};
