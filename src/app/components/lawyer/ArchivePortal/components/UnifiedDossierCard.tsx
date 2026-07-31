/**
 * UnifiedDossierCard — بطاقة إضبارة تحريرية كثيفة:
 * رقم/عنوان بارز · أطراف واضحة · إجراءات خفيفة · بلا فراغات ميتة.
 */

import { useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { prefetchCriminalDashboard, warmLawsuitWorkspace } from '@/app/utils/lazyComponentsIntent';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

export type DossierKind = 'criminal' | 'civil' | 'personal' | 'transaction';

const DEFAULT_KIND_LABEL: Record<DossierKind, string> = {
    criminal: 'جزائية',
    civil: 'مدنية',
    personal: 'أحوال',
    transaction: 'معاملة',
};

const KIND_BAR: Record<DossierKind, string> = {
    criminal: 'bg-rose-500/70',
    civil: 'bg-[#E6C673]/75',
    personal: 'bg-violet-400/70',
    transaction: 'bg-sky-400/70',
};

const KIND_BADGE: Record<DossierKind, string> = {
    criminal:
        'border-rose-400/45 bg-rose-500/15 text-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.18)]',
    civil: 'border-[#E6C673]/50 bg-[#E6C673]/14 text-[#F3E4B8] shadow-[0_0_14px_rgba(230,198,115,0.16)]',
    personal:
        'border-violet-400/45 bg-violet-500/15 text-violet-100 shadow-[0_0_14px_rgba(167,139,250,0.16)]',
    transaction:
        'border-sky-400/45 bg-sky-500/15 text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.16)]',
};

const KIND_GLOW: Record<DossierKind, string> = {
    criminal: 'rgba(244,63,94,0.12)',
    civil: 'rgba(230,198,115,0.14)',
    personal: 'rgba(167,139,250,0.12)',
    transaction: 'rgba(56,189,248,0.12)',
};

export type UnifiedDossierFooterIcon = {
    id: string;
    icon: ReactNode;
    label: string;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    tone?: 'default' | 'danger' | 'success' | 'warning';
    testId?: string;
};

export type UnifiedDossierStatusBadge = {
    label: ReactNode;
    className?: string;
};

export type UnifiedDossierCardProps = {
    kind: DossierKind;
    typeBadgeLabel?: string;
    statusBadge?: UnifiedDossierStatusBadge;
    pinNode?: ReactNode;
    title: string;
    subtitle?: ReactNode;
    bodyExtra?: ReactNode;
    footerNote?: ReactNode;
    onOpen: () => void;
    openLabel?: string;
    footerIcons?: UnifiedDossierFooterIcon[];
    overlayBadge?: ReactNode;
    wrapperClassName?: string;
    testId?: string;
};

const toneToHoverClass = (tone: UnifiedDossierFooterIcon['tone']): string => {
    switch (tone) {
        case 'danger':
            return 'hover:text-rose-200 hover:bg-rose-500/15';
        case 'success':
            return 'hover:text-emerald-200 hover:bg-emerald-500/15';
        case 'warning':
            return 'hover:text-amber-200 hover:bg-amber-500/15';
        default:
            return 'hover:text-white hover:bg-white/10';
    }
};

function stripLeadingEmoji(label: ReactNode): ReactNode {
    if (typeof label !== 'string') return label;
    return label.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, '').trim() || label;
}

function statusTextClass(className?: string): string {
    if (!className) return 'text-emerald-300';
    const hit = className.split(/\s+/).find((c) => c.startsWith('text-'));
    return hit || 'text-emerald-300';
}

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
    const prefetchFiredRef = useRef(false);
    const reduceMotion = useReduceMotion();
    const actions = footerIcons ?? [];

    const warmDossierShell = () => {
        if (prefetchFiredRef.current) return;
        prefetchFiredRef.current = true;
        if (kind === 'criminal') {
            prefetchCriminalDashboard();
        } else {
            warmLawsuitWorkspace({ includeSecondary: false });
        }
    };

    const openDossier = () => {
        warmDossierShell();
        onOpen();
    };

    const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDossier();
        }
    };

    const statusLabel = statusBadge ? stripLeadingEmoji(statusBadge.label) : null;
    const kindLabel = typeBadgeLabel ?? DEFAULT_KIND_LABEL[kind];

    return (
        <motion.div
            layout={!reduceMotion}
            data-testid={testId}
            role="button"
            tabIndex={0}
            aria-label={openLabel}
            onClick={openDossier}
            onKeyDown={handleCardKeyDown}
            onPointerEnter={warmDossierShell}
            onFocus={warmDossierShell}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            transition={
                reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 30 }
            }
            className={`group relative w-full cursor-pointer overflow-hidden rounded-[1.15rem] border border-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 ${wrapperClassName ?? ''}`}
            style={{
                background: `
                    radial-gradient(120% 80% at 100% 0%, ${KIND_GLOW[kind]}, transparent 55%),
                    linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(12,18,32,0.96) 42%, rgba(8,12,20,0.98) 100%)
                `,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 28px rgba(0,0,0,0.28)',
            }}
            dir="rtl"
        >
            <div aria-hidden className={`absolute inset-x-0 top-0 h-[2px] ${KIND_BAR[kind]}`} />

            {overlayBadge}

            <div className="relative flex flex-col gap-2.5 px-4 pb-3.5 pt-3.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-lg border px-2.5 py-1 text-[11px] font-black tracking-wide ${KIND_BADGE[kind]}`}
                            >
                                {kindLabel}
                            </span>
                            {statusLabel ? (
                                <span
                                    className={`text-[11px] font-bold ${statusTextClass(statusBadge?.className)}`}
                                    title={typeof statusLabel === 'string' ? statusLabel : undefined}
                                >
                                    {statusLabel}
                                </span>
                            ) : null}
                        </div>

                        <h3 className="text-[1.05rem] font-black leading-[1.35] tracking-tight text-white line-clamp-2 transition-colors group-hover:text-[#F3E4B8]">
                            {title}
                        </h3>
                        {subtitle ? (
                            <p className="mt-1 truncate text-[13px] font-medium text-white/50">
                                {subtitle}
                            </p>
                        ) : null}
                    </div>

                    <div
                        className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        {pinNode}
                        {actions.map((action) => (
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
                                className={`rounded-lg p-1.5 text-white/45 transition-colors ${toneToHoverClass(action.tone)}`}
                            >
                                {action.icon}
                            </button>
                        ))}
                    </div>
                </div>

                {bodyExtra ? (
                    <div className="border-t border-white/[0.07] pt-2.5">{bodyExtra}</div>
                ) : null}

                {footerNote ? <div className="text-[11px] font-bold">{footerNote}</div> : null}
            </div>
        </motion.div>
    );
};
