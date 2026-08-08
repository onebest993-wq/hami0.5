import React from 'react';



export type TaskListOrdinal = {

    index: number;

    total: number;

};



const STRIPE_TONE_CLASS = [

    'from-[#E6C673]/40 via-[#E6C673]/12',

    'from-[#34D399]/42 via-[#059669]/20',

    'from-[#C9A85C]/38 via-[#E6C673]/14',

] as const;



const ACCENT_CLASS = [

    'from-[#E6C673] to-[#C9A85C]',

    'from-[#34D399] to-[#059669]',

    'from-[#E6C673]/85 to-[#C9A85C]',

] as const;



export function taskListStripeToneClass(ordinal?: TaskListOrdinal): string {

    if (!ordinal || ordinal.total <= 1) return STRIPE_TONE_CLASS[0];

    return STRIPE_TONE_CLASS[ordinal.index % STRIPE_TONE_CLASS.length]!;

}



function accentGradient(ordinal: TaskListOrdinal): string {

    return ACCENT_CLASS[ordinal.index % ACCENT_CLASS.length]!;

}



function padIndex(n: number): string {

    return n < 10 ? `0${n}` : String(n);

}



export type TaskListOrdinalBadgeProps = {

    ordinal: TaskListOrdinal;

    className?: string;

    compact?: boolean;

    placement?: 'edge' | 'inline';

    testId?: string;

};



/** مؤشر ترتيب عصري — رقم صفري مبطن + خط تدرج */

export function TaskListOrdinalBadge({

    ordinal,

    className = '',

    compact = false,

    testId,

}: TaskListOrdinalBadgeProps) {

    if (ordinal.total <= 1) return null;



    const n = ordinal.index + 1;

    const label = compact ? `إجراء ${n} من ${ordinal.total}` : `مهمة ${n} من ${ordinal.total}`;

    const accent = accentGradient(ordinal);



    if (compact) {

        return (

            <span

                className={`relative inline-flex items-center justify-center size-5 shrink-0 rounded-md bg-[#12182B]/88 border border-white/[0.08] ${className}`}

                aria-label={label}

                data-testid={testId ?? 'tasks-task-list-ordinal'}

            >

                <span

                    className={`absolute inset-y-1 right-0 w-[1.5px] rounded-full bg-gradient-to-b ${accent} opacity-90`}

                    aria-hidden

                />

                <span className="text-[9px] font-black tabular-nums tracking-wide text-[#F4F4F5]/85">

                    {n}

                </span>

            </span>

        );

    }



    return (

        <span

            className={`group relative inline-flex flex-row-reverse items-center gap-1.5 shrink-0 h-7 pl-2.5 pr-2 rounded-lg bg-[#12182B]/88 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}

            aria-label={label}

            data-testid={testId ?? 'tasks-task-list-ordinal'}

            title={label}

        >

            <span

                className={`absolute inset-y-1.5 right-0 w-[2px] rounded-full bg-gradient-to-b ${accent}`}

                aria-hidden

            />

            <span className="text-[11px] font-black tabular-nums tracking-[0.14em] text-[#E6C673] leading-none">

                {padIndex(n)}

            </span>

            <span className="w-px h-3 rounded-full bg-white/10" aria-hidden />

            <span className="text-[9px] font-bold tabular-nums tracking-wider text-[#F4F4F5]/45 leading-none">

                {padIndex(ordinal.total)}

            </span>

        </span>

    );

}

