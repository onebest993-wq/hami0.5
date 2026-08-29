/**
 * UnifiedDossierCard — بطاقة إضبارة تحريرية كثيفة:
 * رقم/عنوان بارز · أطراف واضحة · إجراءات خفيفة · بلا فراغات ميتة.
 * رسم أصلي (بلا Framer layout/spring) — الشبكة مسار حرج على الموبايل.
 */

import { useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { prepareLawsuitDossierChrome, prepareLawsuitDossierChromeOnce } from '@/app/runtime/lawsuitOpenContract';
import { caseNoTextDir } from '@/app/components/lawyer/smart-modal/smart-header/smartHeaderPresentation';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';

export type DossierKind = 'criminal' | 'civil' | 'personal' | 'transaction' | 'urgent';

const DEFAULT_KIND_LABEL: Record<DossierKind, string> = {
    criminal: 'جزائية',
    civil: 'مدنية',
    personal: 'أحوال',
    transaction: 'معاملة',
    urgent: 'مستعجل',
};

const KIND_BAR: Record<DossierKind, string> = {
    criminal: 'bg-rose-500/70',
    civil: 'bg-[#E6C673]/75',
    personal: 'bg-violet-400/70',
    transaction: 'bg-sky-400/70',
    urgent: 'bg-rose-400/50',
};

const KIND_BADGE: Record<DossierKind, string> = {
    criminal:
        'border-rose-400/45 bg-rose-500/15 text-rose-100',
    civil: 'border-[#E6C673]/50 bg-[#E6C673]/14 text-[#F3E4B8]',
    personal:
        'border-violet-400/45 bg-violet-500/15 text-violet-100',
    transaction:
        'border-sky-400/45 bg-sky-500/15 text-sky-100',
    urgent: 'border-white/10 bg-white/[0.06] text-white/70',
};

const KIND_GLOW: Record<DossierKind, string> = {
    criminal: 'rgba(244,63,94,0.12)',
    civil: 'rgba(230,198,115,0.14)',
    personal: 'rgba(167,139,250,0.12)',
    transaction: 'rgba(56,189,248,0.12)',
    urgent: 'transparent',
};

export type UnifiedDossierFooterIcon = {
    id: string;
    icon: ReactNode;
    label: string;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    tone?: 'default' | 'danger' | 'success' | 'warning';
    testId?: string;
};

type UnifiedDossierStatusBadge = {
    label: ReactNode;
    className?: string;
    title?: string;
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
    const actions = footerIcons ?? [];

    /** hover/intent — تسخين إضبارة مرة؛ بلا إعادة hydrate للمخزن */
    const warmDossierShell = () => {
        if (prefetchFiredRef.current) return;
        prefetchFiredRef.current = true;
        if (kind === 'criminal') {
            void import('@/app/utils/lazyComponentsIntent')
                .then((m) => m.prefetchCriminalListPath())
                .catch(() => undefined);
        } else {
            prepareLawsuitDossierChromeOnce();
        }
    };

    const openDossier = (event?: { target?: EventTarget | null; defaultPrevented?: boolean }) => {
        if (event?.defaultPrevented) return;
        const target = event?.target;
        if (target instanceof Element && target.closest('[data-dossier-card-actions]')) return;
        if (kind === 'criminal') {
            void import('@/app/utils/lazyComponentsIntent')
                .then((m) => m.prefetchCriminalDashboard())
                .catch(() => undefined);
        } else {
            prepareLawsuitDossierChrome();
        }
        onOpen();
    };

    const press = useScrollSafePress({
        onPress: () => openDossier(),
        onPointerDown: () => {
            if (kind !== 'criminal') prepareLawsuitDossierChrome();
        },
    });

    const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDossier(event);
        }
    };

    const statusLabel = statusBadge ? stripLeadingEmoji(statusBadge.label) : null;
    const kindLabel = typeBadgeLabel ?? DEFAULT_KIND_LABEL[kind];
    const isUrgent = kind === 'urgent';

    return (
        <div
            data-testid={testId}
            role="button"
            tabIndex={0}
            aria-label={openLabel}
            onClick={press.onClick}
            onKeyDown={handleCardKeyDown}
            onPointerEnter={warmDossierShell}
            onPointerDown={press.onPointerDown}
            onPointerMove={press.onPointerMove}
            onPointerUp={press.onPointerUp}
            onPointerCancel={press.onPointerCancel}
            onFocus={warmDossierShell}
            className={`group relative w-full cursor-pointer overflow-hidden border border-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 touch-manipulation ${
                isUrgent ? 'rounded-xl' : 'rounded-[1.15rem]'
            } ${wrapperClassName ?? ''}`}
            style={
                isUrgent
                    ? { background: '#0B1021' }
                    : {
                          background: `
                    radial-gradient(120% 80% at 100% 0%, ${KIND_GLOW[kind]}, transparent 55%),
                    linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(12,18,32,0.96) 42%, rgba(8,12,20,0.98) 100%)
                `,
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 28px rgba(0,0,0,0.28)',
                      }
            }
            dir="rtl"
        >
            <div aria-hidden className={`absolute inset-x-0 top-0 h-px ${KIND_BAR[kind]}`} />

            {overlayBadge}

            <div
                className={`relative flex flex-col ${
                    isUrgent ? 'gap-2 px-2.5 py-2' : 'gap-1.5 px-2.5 pb-2.5 pt-2.5 sm:px-3 sm:pb-3 sm:pt-2.5'
                }`}
            >
                <div className="flex items-center justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                        {isUrgent ? (
                            statusLabel ? (
                                <p
                                    className={`truncate text-[11px] font-bold ${statusTextClass(statusBadge?.className)}`}
                                    title={
                                        statusBadge?.title
                                        ?? (typeof statusLabel === 'string' ? statusLabel : undefined)
                                    }
                                >
                                    {statusLabel}
                                </p>
                            ) : null
                        ) : (
                            <>
                                <div className="mb-0.5 flex flex-wrap items-center gap-1">
                                    <span
                                        className={`rounded-md border px-2 py-0.5 text-[10px] font-black tracking-wide ${KIND_BADGE[kind]}`}
                                    >
                                        {kindLabel}
                                    </span>
                                    {statusLabel ? (
                                        <span
                                            className={`text-[10px] font-bold ${statusTextClass(statusBadge?.className)}`}
                                            title={
                                                statusBadge?.title
                                                ?? (typeof statusLabel === 'string' ? statusLabel : undefined)
                                            }
                                        >
                                            {statusLabel}
                                        </span>
                                    ) : null}
                                </div>
                                <h3
                                    className="min-w-0 w-full truncate whitespace-nowrap text-base font-black leading-tight tracking-tight text-white transition-colors group-hover:text-[#F3E4B8]"
                                    dir={typeof title === 'string' ? caseNoTextDir(title) : 'rtl'}
                                    style={{ unicodeBidi: 'plaintext' }}
                                >
                                    {title}
                                </h3>
                                {subtitle ? (
                                    <p className="mt-0.5 truncate text-[11px] font-medium text-white/50">
                                        {subtitle}
                                    </p>
                                ) : null}
                            </>
                        )}
                    </div>

                    <div
                        className="flex shrink-0 items-center gap-0 opacity-70 transition-opacity group-hover:opacity-100"
                        data-dossier-card-actions
                        onPointerDown={(e) => e.stopPropagation()}
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
                                    event.preventDefault();
                                    event.stopPropagation();
                                    action.onClick(event);
                                }}
                                className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/45 transition-colors touch-manipulation ${toneToHoverClass(action.tone)}`}
                            >
                                {action.icon}
                            </button>
                        ))}
                    </div>
                </div>

                {isUrgent ? (
                    <h3
                        className="min-w-0 w-full truncate text-[15px] font-black leading-tight tracking-tight text-white"
                        dir={typeof title === 'string' ? caseNoTextDir(title) : 'rtl'}
                        style={{ unicodeBidi: 'plaintext' }}
                    >
                        {title}
                    </h3>
                ) : null}

                {bodyExtra ? (
                    <div className="border-t border-white/[0.07] pt-1.5">{bodyExtra}</div>
                ) : null}

                {footerNote ? <div className="text-[11px] font-bold">{footerNote}</div> : null}
            </div>
        </div>
    );
};
