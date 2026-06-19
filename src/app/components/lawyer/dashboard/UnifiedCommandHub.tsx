import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Scale, FileText, ArrowLeft } from 'lucide-react';
import { HOME_GLASS, SOV_GOLD, SOV_GOLD_DIM, SOV_PEARL } from './lawyerHomeTheme';

type HubCard = {
    id: string;
    label: string;
    icon: typeof Scale;
    accent: string;
    index: number;
};

type UnifiedCommandHubProps = {
    theme?: { primary?: string; secondary?: string };
    shapeClass?: string;
    onOpenArchive: (id: string) => void;
    onPrefetchExecution?: () => void;
};

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.09, delayChildren: 0.04 },
    },
};

const item = {
    hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
    show: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { type: 'spring' as const, stiffness: 260, damping: 26 },
    },
};

function GlassSheen() {
    return (
        <>
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.55]"
                style={{
                    background:
                        'linear-gradient(165deg, rgba(255,255,255,0.09) 0%, transparent 42%, rgba(255,255,255,0.02) 100%)',
                }}
                aria-hidden
            />
            <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none" aria-hidden />
        </>
    );
}

function HubIconBadge({
    icon: Icon,
    accent,
}: {
    icon: typeof Scale;
    accent: string;
}) {
    return (
        <div className="relative w-12 h-12 shrink-0">
            <div
                className="absolute inset-0 rounded-[1.05rem] blur-lg opacity-70 scale-110"
                style={{ background: `color-mix(in srgb, ${accent} 35%, transparent)` }}
                aria-hidden
            />
            <div
                className="relative w-12 h-12 rounded-[1.05rem] flex items-center justify-center overflow-hidden"
                style={{
                    background: `linear-gradient(155deg, color-mix(in srgb, ${accent} 24%, rgba(255,255,255,0.06)) 0%, rgba(0,0,0,0.55) 100%)`,
                    border: `1px solid color-mix(in srgb, ${accent} 42%, transparent)`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 32px color-mix(in srgb, ${accent} 18%, transparent)`,
                }}
            >
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, transparent 48%, rgba(0,0,0,0.12) 100%)',
                    }}
                    aria-hidden
                />
                <div
                    className="absolute top-1 right-1 w-3 h-3 rounded-full opacity-60"
                    style={{ background: `color-mix(in srgb, ${accent} 55%, white)` }}
                    aria-hidden
                />
                <Icon
                    size={22}
                    strokeWidth={1.85}
                    className="relative z-[1]"
                    style={{
                        color: accent,
                        filter: `drop-shadow(0 2px 10px color-mix(in srgb, ${accent} 45%, transparent))`,
                    }}
                />
            </div>
        </div>
    );
}

function RouteTile({
    card,
    onOpenArchive,
    reduceMotion,
}: {
    card: HubCard;
    onOpenArchive: (id: string) => void;
    reduceMotion: boolean;
}) {
    return (
        <motion.button
            type="button"
            data-testid={`hub-archive-${card.id}`}
            variants={item}
            whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.25 } }}
            whileTap={{ scale: 0.975 }}
            onClick={() => onOpenArchive(card.id)}
            className={`${HOME_GLASS} group min-h-[148px] w-full text-right active:opacity-[0.88] transition-opacity duration-200`}
        >
            <GlassSheen />
            <div
                className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-70"
                style={{ background: `${card.accent}33` }}
                aria-hidden
            />
            <div className="relative z-10 h-full flex flex-col justify-between p-5">
                <HubIconBadge icon={card.icon} accent={card.accent} />
                <div>
                    <p
                        className="font-['Cairo'] font-bold text-[1.35rem] leading-none tracking-tight"
                        style={{ color: SOV_PEARL }}
                    >
                        {card.label}
                    </p>
                </div>
            </div>
        </motion.button>
    );
}

function ExecutionHero({
    accent,
    onOpenArchive,
    onPrefetchExecution,
    reduceMotion,
}: {
    accent: string;
    onOpenArchive: (id: string) => void;
    onPrefetchExecution?: () => void;
    reduceMotion: boolean;
}) {
    const prefetch = () => onPrefetchExecution?.();

    return (
        <motion.button
            type="button"
            data-testid="hub-archive-execution"
            variants={item}
            whileHover={reduceMotion ? undefined : { scale: 1.008 }}
            whileTap={{ scale: 0.985 }}
            onMouseEnter={prefetch}
            onFocus={prefetch}
            onClick={() => {
                prefetch();
                onOpenArchive('execution');
            }}
            className={`${HOME_GLASS} col-span-2 w-full min-h-[196px] group text-right overflow-hidden active:opacity-[0.88] transition-opacity duration-200`}
        >
            <GlassSheen />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(ellipse 70% 90% at 100% 0%, ${accent}16, transparent 55%),
                        radial-gradient(ellipse 50% 70% at 0% 100%, rgba(255,255,255,0.04), transparent 50%)
                    `,
                }}
                aria-hidden
            />
            <motion.div
                className="absolute top-6 left-6 w-20 h-20 rounded-full border border-white/[0.06] pointer-events-none"
                animate={reduceMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
            />
            <div className="relative z-10 h-full flex flex-col justify-between p-6 pr-6 pl-6">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-[0.24em] text-[#D1D5DB] uppercase">
                        مسار رئيسي
                    </span>
                    <span
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full hami-home-accent-chip"
                    >
                        التنفيذ القضائي
                    </span>
                </div>
                <div className="flex items-end justify-between gap-4 mt-4">
                    <div className="min-w-0 text-right flex-1">
                        <p
                            dir="rtl"
                            lang="ar"
                            className="font-['Cairo'] font-black text-[2.75rem] sm:text-[3rem] leading-tight tracking-tight text-[#F5F0E6]"
                            style={{
                                textShadow: `0 2px 24px ${accent}33`,
                            }}
                        >
                            {'تنفيذ'}
                        </p>
                    </div>
                    <motion.div
                        className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center hami-sovereign-float ml-5"
                        style={{
                            background: `linear-gradient(160deg, ${accent}28, rgba(0,0,0,0.5))`,
                            border: `1px solid ${accent}35`,
                            boxShadow: `0 12px 40px ${accent}18`,
                        }}
                    >
                        <ArrowLeft
                            size={22}
                            className="text-[#FFF8E7]/90 transition-transform duration-300 group-hover:-translate-x-1"
                            strokeWidth={1.75}
                        />
                    </motion.div>
                </div>
            </div>
        </motion.button>
    );
}

export const UnifiedCommandHub = ({
    theme,
    onOpenArchive,
    onPrefetchExecution,
}: UnifiedCommandHubProps) => {
    const reduceMotion = useReducedMotion() ?? false;
    const accent = theme?.primary ?? SOV_GOLD;
    const secondaryAccent = theme?.secondary ?? SOV_GOLD_DIM;

    const routes: HubCard[] = [
        {
            id: 'lawsuit',
            label: 'دعاوى',
            icon: Scale,
            accent,
            index: 1,
        },
        {
            id: 'transaction',
            label: 'معاملات',
            icon: FileText,
            accent: secondaryAccent,
            index: 2,
        },
    ];

    return (
        <motion.div
            className="grid grid-cols-2 gap-3.5"
            variants={container}
            initial="hidden"
            animate="show"
        >
            <ExecutionHero
                accent={accent}
                onOpenArchive={onOpenArchive}
                onPrefetchExecution={onPrefetchExecution}
                reduceMotion={reduceMotion}
            />
            {routes.map((card) => (
                <RouteTile
                    key={card.id}
                    card={card}
                    onOpenArchive={onOpenArchive}
                    reduceMotion={reduceMotion}
                />
            ))}
        </motion.div>
    );
};
